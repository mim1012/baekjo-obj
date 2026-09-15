import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { isDeepStrictEqual } from 'node:util';

const root = new URL('../../', import.meta.url);
const helperFile = 'src/lib/cms/importPublished.ts';
const routeFile = 'src/app/api/admin/settings/pages/[pageKey]/import-publish/route.ts';
const input = { expectedRevision: 5, sourceValue: { version: 1, values: { 'audit.heroDescription': 'source snapshot' } }, sourceUpdatedAt: '2026-09-15T00:00:00.123456+00:00' };

function load(relative, dependencies = {}, audit = []) {
  const file = fileURLToPath(new URL(relative, root));
  const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), {
    fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', 'console', outputText)((name) => {
    if (!Object.hasOwn(dependencies, name) && name.startsWith('@/') && !name.includes('/supabase/')) return load(`src/${name.slice(2)}.ts`);
    assert(Object.hasOwn(dependencies, name), `Unstubbed dependency: ${name}`);
    return dependencies[name];
  }, loaded, loaded.exports, { info: (...args) => audit.push(args) });
  return loaded.exports;
}

const { normalizeCmsPageContent } = load('src/lib/cms/normalize.ts');
const { getCmsPageDefinition } = load('src/lib/cms/pageDefinitions.ts');
const { buildSnapshot } = await import('./mapper.mjs');
const expectedContent = normalizeCmsPageContent(getCmsPageDefinition('audit'), buildSnapshot({ id: 'page-texts', value: input.sourceValue }));

function harness({ authorized = true, conflict = false, conflictCode = 'PT409', draft = expectedContent, sourceValue = input.sourceValue } = {}) {
  const rpc = [];
  const audit = [];
  const revalidated = [];
  const helper = load(helperFile, {
    'server-only': {},
    '@/lib/supabase/server': { getSupabase: () => ({ rpc: async (...args) => {
      rpc.push(args);
      const parameters = args[1];
      const mismatch = !isDeepStrictEqual(sourceValue, parameters.p_expected_source_value)
        || (Object.hasOwn(parameters, 'p_expected_content') && !isDeepStrictEqual(draft, parameters.p_expected_content));
      return conflict || mismatch ? { data: null, error: { code: conflictCode } } : { data: [{ published_revision: 5, published_at: '2026-09-15T00:00:01Z' }], error: null };
    } }) },
  });
  const route = load(routeFile, {
    'next/cache': { revalidatePath: (path) => revalidated.push(path) },
    'next/server': { NextResponse: { json: (body, options) => new Response(JSON.stringify(body), { status: options?.status ?? 200 }) } },
    '@/lib/admin/requireAdmin': { requireAdmin: async () => authorized ? { ok: true, requester: { id: 'actor-uuid' } } : { ok: false, response: new Response(null, { status: 403 }) } },
    '@/lib/cms/importPublished': helper,
    '@/lib/logServerError': { logServerError: () => {} },
  }, audit);
  const request = (body = input, pageKey = 'audit') => route.POST(new Request('http://localhost/api/admin/settings/pages/audit/import-publish', { method: 'POST', body: JSON.stringify(body) }), { params: Promise.resolve({ pageKey }) });
  return { helper, route, request, rpc, audit, revalidated };
}

test('guard route sends exact raw source value and microsecond timestamp to the guarded RPC', async () => {
  const h = harness();
  assert.equal((await h.request()).status, 200);
  assert.deepEqual(h.rpc, [['publish_audit_cms_from_source', {
    p_expected_revision: 5, p_expected_source_value: input.sourceValue,
    p_expected_source_updated_at: input.sourceUpdatedAt, p_actor: 'actor-uuid',
    p_expected_content: expectedContent,
  }]]);
  assert.deepEqual(h.revalidated, ['/audit']);
  assert.equal(h.audit.length, 0);
  assert(!JSON.stringify(h.audit).includes('source snapshot'));
  assert.equal(h.route.GET, undefined);
  assert.equal(h.route.PATCH, undefined);
});

test('correct source cannot publish an unrelated draft, even with client expected content', async () => {
  const h = harness({ draft: { unrelated: true } });
  assert.equal((await h.request({ ...input, expectedContent: { unrelated: true } })).status, 409);
  assert.deepEqual(h.revalidated, []);
});

test('source drift after PATCH conflicts at guarded publication', async () => {
  const h = harness({ sourceValue: { ...input.sourceValue, values: { 'audit.heroDescription': 'changed after PATCH' } } });
  assert.equal((await h.request()).status, 409);
  assert.deepEqual(h.revalidated, []);
});

for (const managed of [false, true]) {
  test(`ordinary publication ${managed ? 'allows revision-guarded edits after bootstrap' : 'refuses initial activation'}`, async () => {
    const published = [];
    const route = load('src/app/api/admin/settings/pages/[pageKey]/route.ts', {
      'next/cache': { revalidatePath: () => {}, revalidateTag: () => {} },
      'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
      '@/lib/admin/requireAdmin': { requireAdmin: async () => ({ ok: true, requester: { id: 'actor-uuid' } }) },
      '@/lib/cms/content': { normalizeCmsPageContent },
      '@/lib/cms/repo': {
        CmsRevisionConflictError: class extends Error {},
        getPublishedCmsPage: async () => managed ? expectedContent : null,
        publishCmsPage: async (value) => { published.push(value); return { publishedRevision: 5 }; },
      },
      '@/lib/logServerError': { logServerError: () => {} },
    });
    const response = await route.POST(new Request('http://localhost/api/admin/settings/pages/audit', { method: 'POST', body: JSON.stringify({ expectedRevision: 5 }) }), { params: Promise.resolve({ pageKey: 'audit' }) });
    assert.equal(response.status, managed ? 200 : 409);
    assert.equal(published.length, managed ? 1 : 0);
    if (!managed) assert.equal((await response.json()).error, 'initial-import-required');
    else assert.equal(published[0].expectedRevision, 5);
  });
}

test('source/revision SQLSTATE PT409 becomes 409 with no success audit or invalidation', async () => {
  const h = harness({ conflict: true });
  assert.equal((await h.request()).status, 409);
  assert.deepEqual(h.revalidated, []);
  assert.deepEqual(h.audit, []);
});

test('legacy SQLSTATE 40001 still maps to 409 as a defensive fallback', async () => {
  const h = harness({ conflict: true, conflictCode: '40001' });
  assert.equal((await h.request()).status, 409);
  assert.deepEqual(h.revalidated, []);
  assert.deepEqual(h.audit, []);
});

test('real-admin denial and other page keys never reach the RPC', async () => {
  const unauthorized = harness({ authorized: false });
  assert.equal((await unauthorized.request()).status, 403);
  assert.deepEqual(unauthorized.rpc, []);
  const otherPage = harness();
  assert.equal((await otherPage.request(input, 'home')).status, 404);
  assert.deepEqual(otherPage.rpc, []);
});

test('invalid source/revision/timestamp inputs never reach the RPC', async () => {
  for (const body of [null, {}, { ...input, expectedRevision: 0 }, { ...input, expectedRevision: 1.5 }, { ...input, sourceValue: [] }, { ...input, sourceValue: {} }, { ...input, sourceUpdatedAt: null }, { ...input, sourceUpdatedAt: '2026-09-15' }, { ...input, sourceUpdatedAt: '2026-99-99T00:00:00Z' }]) {
    const h = harness();
    assert.equal((await h.request(body)).status, 400);
    assert.deepEqual(h.rpc, []);
  }
});

test('0163 locks both rows and compares source and revision before delegation; grants are restricted', () => {
  const sql = readFileSync(new URL('supabase/migrations/0163_cms_audit_source_guard.sql', root), 'utf8');
  const sourceLock = sql.indexOf("where id = 'page-texts'\n  for update;");
  const sourceCheck = sql.indexOf('v_source.value is distinct from p_expected_source_value');
  const timeCheck = sql.indexOf('v_source.updated_at is distinct from p_expected_source_updated_at');
  const pageLock = sql.indexOf("where page_key = 'audit'\n  for update;");
  const revisionCheck = sql.indexOf('v_page.draft_revision is distinct from p_expected_revision');
  const managedCheck = sql.indexOf("v_page.published_content -> '__managedVersion' = '1'::jsonb");
  const publish = sql.indexOf("from public.publish_cms_page('audit', p_expected_revision, p_actor)");
  assert(sourceLock > 0 && sourceLock < sourceCheck && sourceCheck < timeCheck && timeCheck < pageLock && pageLock < revisionCheck && revisionCheck < managedCheck && managedCheck < publish);
  assert.match(sql, /revoke all on function public\.publish_audit_cms_from_source\(bigint, jsonb, timestamptz, uuid\)\s+from public, anon, authenticated;/);
  assert.match(sql, /grant execute on function public\.publish_audit_cms_from_source\(bigint, jsonb, timestamptz, uuid\)\s+to service_role;/);
  assert.doesNotMatch(sql, /(?:update|delete from|insert into)\s+public\.cms_page_versions/i);
});

test('transport routes all importer publish requests to the guarded endpoint', () => {
  const source = readFileSync(new URL('scripts/cms-import/transport.mjs', root), 'utf8');
  assert(source.includes("publish: (data) => call('POST', `${endpoint}/import-publish`, data)"));
  assert(!source.includes("call('POST', endpoint, data)"));
});
