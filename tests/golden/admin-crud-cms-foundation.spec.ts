import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { test, expect, type APIRequestContext } from '@playwright/test';
import {
  ADMIN_EMAIL, ADMIN_PASSWORD, CRUD_ENABLED, assertGoldenWritePreflight, loginAsAdmin,
} from './_lib/adminCrudHelpers';

const endpoint = '/api/admin/settings/pages/audit';
const headers = { 'Cache-Control': 'no-store' };
type Content = Readonly<Record<string, unknown>>;
type State = Readonly<{
  content: Content;
  draftRevision: number;
  publishedRevision: number | null;
  publishedAt: string | null;
  versions: readonly number[];
}>;

function isContent(value: unknown): value is Content {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function object(value: unknown): Content {
  assert(isContent(value), 'Expected JSON object');
  return value;
}

function revision(value: unknown): number {
  assert(typeof value === 'number' && Number.isSafeInteger(value) && value > 0, 'Expected revision');
  return value;
}

async function readState(api: APIRequestContext): Promise<State> {
  const response = await api.get(endpoint, { headers, maxRedirects: 0 });
  expect(response.status()).toBe(200);
  const body = object(await response.json());
  assert(body.publishedAt === null || typeof body.publishedAt === 'string');
  assert(Array.isArray(body.versions));
  return {
    content: object(body.content),
    draftRevision: revision(body.draftRevision),
    publishedRevision: body.publishedRevision === null ? null : revision(body.publishedRevision),
    publishedAt: body.publishedAt,
    versions: body.versions.map((entry: unknown) => revision(object(entry).revision)),
  };
}

async function readPublished(api: APIRequestContext): Promise<Content> {
  const response = await api.get(`/api/content/audit?cms-foundation=${randomUUID()}`, {
    headers, maxRedirects: 0,
  });
  expect(response.status()).toBe(200);
  return object(object(await response.json()).content);
}

test.describe.configure({ mode: 'serial', retries: 0 });
test.use({ storageState: { cookies: [], origins: [] }, trace: 'off', video: 'off' });

test('CMS foundation: password session, draft isolation, conflict, publish and version restore', async ({ page, baseURL }, testInfo) => {
  test.setTimeout(180_000);
  // Given: explicitly enabled localhost/staging, one worker, and a real password session.
  assert(CRUD_ENABLED, 'E2E_ADMIN_CRUD=1 is required; missing write authorization must fail');
  assert(ADMIN_EMAIL && ADMIN_PASSWORD, 'E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD are required');
  expect(testInfo.config.workers, 'Run this singleton spec with --workers=1').toBe(1);
  assert(baseURL, 'Explicit localhost baseURL is required');
  const target = new URL(baseURL);
  expect(['localhost', '127.0.0.1']).toContain(target.hostname);
  expect(['http:', 'https:']).toContain(target.protocol);
  const preflightTarget = process.env.E2E_BASE_URL || process.env.BASE_URL;
  assert(preflightTarget, 'Explicit E2E_BASE_URL or BASE_URL is required');
  expect(new URL(preflightTarget).origin).toBe(target.origin);
  expect(process.env.TEST_SUPABASE_PROJECT_REF).toBe('aeooyivfijthfcrfrnyk');
  await assertGoldenWritePreflight();
  await loginAsAdmin(page);
  const session = await page.request.get('/api/members/me', { headers, maxRedirects: 0 });
  expect(session.status()).toBe(200);
  expect(object(object(await session.json()).user)).toMatchObject({
    email: ADMIN_EMAIL, role: 'admin', status: 'active',
  });

  const api = page.request;
  const original = await readState(api);
  const originalPublished = await readPublished(api);
  assert(original.publishedRevision !== null,
    'An unpublished page cannot be restored exactly using the PR311 publish-only API');
  const hero = object(original.content.hero);
  assert(typeof hero.eyebrow === 'string', 'Audit hero.eyebrow must be a textual field');
  const edited = {
    ...original.content,
    hero: { ...hero, eyebrow: `CMS foundation ${randomUUID()}` },
  };

  let owned: State | undefined = original;
  let expectedPublished = originalPublished;
  let attemptedWrite = false;

  async function assertOwnership(): Promise<State> {
    assert(owned, 'Mutation outcome unknown: automatic restoration refused; inspect audit manually');
    const current = await readState(api);
    expect(current, 'External edit/publish detected: refusing to overwrite it').toEqual(owned);
    expect(await readPublished(api), 'External published content changed').toEqual(expectedPublished);
    return current;
  }

  async function saveDraft(content: Content, sourceRevision?: number): Promise<number> {
    const before = await assertOwnership();
    // Clear ownership before sending: a timeout or malformed success must never adopt someone else's revision.
    owned = undefined;
    attemptedWrite = true;
    const response = await api.fetch(endpoint, {
      method: sourceRevision === undefined ? 'PATCH' : 'PUT',
      data: sourceRevision === undefined
        ? { expectedRevision: before.draftRevision, content }
        : { expectedRevision: before.draftRevision, sourceRevision },
      maxRedirects: 0, maxRetries: 0, timeout: 15_000,
    });
    expect(response.status(), 'Draft mutation failed; no blind retry or cleanup').toBe(200);
    const body = object(await response.json());
    expect(body.ok).toBe(true);
    const next = revision(body.draftRevision);
    expect(next).toBe(before.draftRevision + 1);
    owned = { ...before, content: object(body.content), draftRevision: next };
    expect(body.content, 'Only the requested text may change').toEqual(content);
    await assertOwnership();
    return next;
  }

  async function publish(): Promise<void> {
    const before = await assertOwnership();
    owned = undefined;
    attemptedWrite = true;
    const response = await api.post(endpoint, {
      data: { expectedRevision: before.draftRevision },
      maxRedirects: 0, maxRetries: 0, timeout: 15_000,
    });
    expect(response.status(), 'Publish failed; no blind retry or cleanup').toBe(200);
    const body = object(await response.json());
    expect(body.ok).toBe(true);
    expect(revision(body.publishedRevision)).toBe(before.draftRevision);
    assert(typeof body.publishedAt === 'string');
    // PR311 returns only publish metadata. Keep the expected content independently of read-back.
    expectedPublished = before.content;
    owned = { ...before, publishedRevision: before.draftRevision, publishedAt: body.publishedAt };
    const current = await readState(api);
    expect(current.versions).toContain(before.draftRevision);
    owned = { ...owned, versions: current.versions };
    await assertOwnership();
  }

  try {
    // Seed compatibility storage has no version history. Archive the original live contents first.
    let sourceRevision = original.publishedRevision;
    if (!original.versions.includes(sourceRevision)) {
      sourceRevision = await saveDraft(originalPublished);
      await publish();
    }

    // When: edit the complete original draft, changing exactly one textual leaf.
    const beforeEdit = await assertOwnership();
    const editedRevision = await saveDraft(edited);
    expect(await readPublished(api)).toEqual(originalPublished);
    const stale = await api.patch(endpoint, {
      data: { expectedRevision: beforeEdit.draftRevision, content: original.content },
      maxRedirects: 0, maxRetries: 0, timeout: 15_000,
    });
    expect(stale.status()).toBe(409);
    expect(object(await stale.json()).error).toBe('revision-conflict');
    expect((await assertOwnership()).draftRevision).toBe(editedRevision);

    // Then: publishing changes public read-back; version restore changes only the draft until republished.
    await publish();
    expect(await readPublished(api)).toEqual(edited);
    await saveDraft(originalPublished, sourceRevision);
    expect(await readPublished(api)).toEqual(edited);
    await publish();
    expect(await readPublished(api)).toEqual(originalPublished);
  } finally {
    // Reserve cleanup time even when an assertion exhausts the main test budget.
    test.setTimeout(testInfo.timeout + 60_000);
    if (attemptedWrite) {
      await assertOwnership();
      if (!isDeepStrictEqual(expectedPublished, originalPublished)) {
        await saveDraft(originalPublished);
        await publish();
      }
      const current = await assertOwnership();
      if (!isDeepStrictEqual(current.content, original.content)) {
        await saveDraft(original.content);
      }
      const restored = await assertOwnership();
      expect(restored.content, 'Original draft must be restored in full').toEqual(original.content);
      expect(await readPublished(api), 'Original published content must be restored in full').toEqual(originalPublished);
    }
  }
});
