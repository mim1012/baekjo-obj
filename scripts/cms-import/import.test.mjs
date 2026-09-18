import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { auditFields, buildSnapshot } from './mapper.mjs';
import { digest, runImport, validateEnvironment, STAGING_REF } from './core.mjs';
import { checked } from './transport.mjs';
import { loginWithHydration } from './login.mjs';

function fixture() {
  return { id: 'page-texts', updated_at: '2026-09-15T00:00:00Z', value: { version: 1, values: Object.fromEntries(auditFields.map((field) => [
    `audit.${field.id}`, ` ${field.id}\n${'문구'.repeat(300)} ${field.id} 끝 `,
  ])) } };
}

function fake({ managed = false, dirty = false, sourceChangeAt = 0, failure = '', changeDuringPublish = false, changeAfterPublish = false } = {}) {
  let row = fixture();
  const calls = [];
  let reads = 0;
  let published = managed ? buildSnapshot(row) : null;
  let state = { content: {}, draftRevision: dirty ? 5 : 4, publishedRevision: 4, hasUnpublishedChanges: dirty, versions: [{ revision: 4 }, { revision: 3 }] };
  return {
    calls,
    io: {
      async readSource() { reads++; return reads === sourceChangeAt ? { ...row, updated_at: 'changed' } : row; },
      async preflightAndLogin() { calls.push('login'); },
      async readState() { return structuredClone(state); },
      async readPublished() { return published; },
      async save(input) {
        calls.push('PATCH');
        assert.equal(input.expectedRevision, 4);
        if (failure === 'save') return checked({ status: () => 409 }, 'PATCH');
        state = { ...state, content: input.content, draftRevision: 5, hasUnpublishedChanges: true };
        return { content: input.content, draftRevision: 5 };
      },
      async publish(input) {
        calls.push('POST');
        assert.equal(input.expectedRevision, 5);
        if (changeDuringPublish) row = { ...row, updated_at: '2026-09-15T00:00:01Z', value: { ...row.value, values: { ...row.value.values, 'audit.heroDescription': 'concurrent source edit' } } };
        if (digest(input.sourceValue) !== digest(row.value) || input.sourceUpdatedAt !== row.updated_at) return checked({ status: () => 409 }, 'guarded POST');
        if (failure === 'publish') return checked({ status: () => 409 }, 'POST');
        published = state.content;
        state = { ...state, publishedRevision: 5, hasUnpublishedChanges: false, versions: [{ revision: 5 }, ...state.versions] };
        if (changeAfterPublish) row = { ...row, updated_at: '2026-09-15T00:00:02Z' };
        return { publishedRevision: 5 };
      },
    },
  };
}

test('offline dry snapshot preserves every actual Audit source field without truncation', async () => {
  const row = fixture();
  const result = await runImport({ readSource: async () => row });
  assert.equal(result.status, 'prepared');
  const leaves = [];
  const collect = (value) => {
    if (typeof value === 'string') leaves.push(value);
    else if (value && typeof value === 'object') Object.values(value).forEach(collect);
  };
  collect(result.content);
  for (const [key, value] of Object.entries(row.value.values)) assert.equal(leaves.filter((leaf) => leaf.includes(value)).length, 1, key);
  assert.equal(result.content.hero.imageCaptionLine1, row.value.values['audit.heroImageCaptionLine1']);
  assert.equal(result.content.hero.imageCaptionLine2, row.value.values['audit.heroImageCaptionLine2']);
  assert.equal(result.content.process.items[0].number, row.value.values['audit.process1Number']);
  assert.equal(result.content.__managedVersion, undefined);
});

test('apply imports once through CAS and retains prior history; repeat does not mutate', async () => {
  const { io, calls } = fake();
  assert.equal((await runImport(io, { apply: true })).status, 'imported');
  assert.deepEqual(calls, ['login', 'PATCH', 'POST']);
  assert.equal((await runImport(io, { apply: true })).status, 'already-managed');
  assert.deepEqual(calls, ['login', 'PATCH', 'POST', 'login']);
});

test('existing unpublished draft aborts before any CMS write', async () => {
  const { io, calls } = fake({ dirty: true });
  await assert.rejects(runImport(io, { apply: true }), /Existing unpublished draft/);
  assert.deepEqual(calls, ['login']);
});

test('already managed import is a no-op even after the legacy source disappears', async () => {
  const { io, calls } = fake({ managed: true });
  io.readSource = async () => { throw new Error('Source must not be read'); };
  assert.equal((await runImport(io, { apply: true })).status, 'already-managed');
  assert.deepEqual(calls, ['login']);
});

test('source mutation during guarded publication rejects without touching published content or history', async () => {
  const { io, calls } = fake({ changeDuringPublish: true });
  const before = await io.readState();
  await assert.rejects(runImport(io, { apply: true }), /409 revision conflict/);
  assert.equal(await io.readPublished(), null);
  const after = await io.readState();
  assert.equal(after.publishedRevision, before.publishedRevision);
  assert.deepEqual(after.versions, before.versions);
  assert.deepEqual(calls, ['login', 'PATCH', 'POST']);
});

test('source changes after atomic publication do not falsely fail the successful import', async () => {
  const { io } = fake({ changeAfterPublish: true });
  assert.equal((await runImport(io, { apply: true })).status, 'imported');
  assert.equal((await runImport(io, { apply: true })).status, 'already-managed');
});

for (const sourceChangeAt of [2, 3, 4]) {
  test(`source change at read ${sourceChangeAt} aborts without publish`, async () => {
    const { io, calls } = fake({ sourceChangeAt });
    await assert.rejects(runImport(io, { apply: true }), /Source changed/);
    assert(!calls.includes('POST'));
  });
}

for (const failure of ['save', 'publish']) {
  test(`${failure} 409 stops without retry or history restoration`, async () => {
    const { io, calls } = fake({ failure });
    await assert.rejects(runImport(io, { apply: true }), /409 revision conflict/);
    assert.deepEqual(calls, failure === 'save' ? ['login', 'PATCH'] : ['login', 'PATCH', 'POST']);
  });
}

test('normalization losing a source leaf prevents publish', async () => {
  const { io, calls } = fake();
  const save = io.save;
  io.save = async (input) => {
    const result = await save(input);
    return { ...result, content: { ...result.content, hero: { ...result.content.hero, imageCaptionLine2: '' } } };
  };
  await assert.rejects(runImport(io, { apply: true }), /Source leaf changed/);
  assert.deepEqual(calls, ['login', 'PATCH']);
});

test('staging and explicit localhost guards fail closed', () => {
  const env = { TEST_SUPABASE_PROJECT_REF: STAGING_REF, SUPABASE_URL: `https://${STAGING_REF}.supabase.co`, SUPABASE_SECRET_KEY: 'fixture', E2E_ADMIN_EMAIL: 'fixture', E2E_ADMIN_PASSWORD: 'fixture' };
  assert.doesNotThrow(() => validateEnvironment(env, true, 'http://127.0.0.1:3120'));
  for (const target of [undefined, 'https://www.baekjo-objet.com', 'https://preview.vercel.app', 'http://localhost@evil.test']) {
    assert.throws(() => validateEnvironment(env, true, target));
  }
  assert.throws(() => validateEnvironment({ ...env, TEST_SUPABASE_PROJECT_REF: 'production' }, false));
  assert.throws(() => validateEnvironment({ ...env, E2E_ADMIN_PASSWORD: '' }, true, 'http://localhost:3120'));
});

test('missing or unknown source fields fail instead of importing old CMS defaults', () => {
  assert.throws(() => buildSnapshot(null), /Missing actual/);
  const row = fixture();
  row.value.values['audit.unmapped'] = 'new field';
  assert.throws(() => buildSnapshot(row), /Unmapped Audit/);
});

test('CLI refuses apply with fixture before any credential or network access', () => {
  const result = spawnSync(process.execPath, ['scripts/import-current-audit-cms.mjs', '--fixture', 'does-not-exist.json', '--apply'], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Fixtures can never be applied/);
});

test('untrusted URL userinfo and malformed URL sentinels never appear in CLI logs', () => {
  for (const baseUrl of ['http://leak-user:SECRET_SENTINEL_934@localhost:3120', 'invalid:SECRET_SENTINEL_934']) {
    const result = spawnSync(process.execPath, ['scripts/import-current-audit-cms.mjs', '--apply', '--base-url', baseUrl], {
      encoding: 'utf8',
      env: { ...process.env, TEST_SUPABASE_PROJECT_REF: STAGING_REF, SUPABASE_URL: `https://${STAGING_REF}.supabase.co`, SUPABASE_SECRET_KEY: 'fixture', E2E_ADMIN_EMAIL: 'fixture', E2E_ADMIN_PASSWORD: 'fixture' },
    });
    assert.equal(result.status, 1);
    assert(!`${result.stdout}${result.stderr}`.includes('SECRET_SENTINEL_934'));
    assert(!`${result.stdout}${result.stderr}`.includes('leak-user'));
    assert(!result.stderr.includes('Target:'));
  }
});

test('standalone CLI produces the same complete dry JSON from an offline fixture', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'audit-import-fixture-'));
  try {
    const row = fixture();
    const filename = path.join(directory, 'row.json');
    writeFileSync(filename, JSON.stringify(row));
    const result = spawnSync(process.execPath, ['scripts/import-current-audit-cms.mjs', '--fixture', filename], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.status, 'prepared');
    assert.deepEqual(payload.content, buildSnapshot(row));
    assert.equal(payload.sourceHash.length, 64);
  } finally {
    rmSync(directory, { recursive: true });
  }
});

test('UI login never fills or submits before the client response and hydration settle', async () => {
  const calls = [];
  const response = Promise.withResolvers();
  const idle = Promise.withResolvers();
  const waitingForIdle = Promise.withResolvers();
  const page = {
    waitForResponse(predicate) {
      assert(predicate({ url: () => 'http://localhost:3120/api/page-texts', ok: () => true }));
      return response.promise;
    },
    async goto() { calls.push('goto'); },
    waitForLoadState(state) {
      assert.equal(state, 'networkidle');
      waitingForIdle.resolve();
      return idle.promise;
    },
    locator(selector) { return { first: () => ({ fill: async () => calls.push(selector) }) }; },
    async waitForURL() {},
    getByRole() { return { click: async () => calls.push('click') }; },
  };
  const login = loginWithHydration(page, 'fixture', 'fixture');
  assert.deepEqual(calls, ['goto']);
  response.resolve();
  await waitingForIdle.promise;
  assert.deepEqual(calls, ['goto']);
  idle.resolve();
  await login;
  assert.deepEqual(calls, ['goto', 'input[type="email"]', 'input[type="password"]', 'click']);
});

test('missing hydration signal stops before credential entry or submission', async () => {
  const page = {
    waitForResponse: async () => { throw new Error('hydration timeout'); },
    goto: async () => {},
    locator: () => assert.fail('Credentials must not be entered'),
    getByRole: () => assert.fail('Login must not be submitted'),
  };
  await assert.rejects(loginWithHydration(page, 'fixture', 'fixture'), /hydration timeout/);
});
