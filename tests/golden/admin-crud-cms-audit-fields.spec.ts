import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import {
  ADMIN_EMAIL, ADMIN_PASSWORD, CRUD_ENABLED, assertGoldenWritePreflight, loginAsAdmin,
} from './_lib/adminCrudHelpers';
import { expectPublicDom, phaseAAudit, phaseBAudit } from './_lib/cmsAuditFields';

const endpoint = '/api/admin/settings/pages/audit';
const noStore = { 'Cache-Control': 'no-store' };
type JsonRecord = Readonly<Record<string, unknown>>;
type State = Readonly<{
  content: JsonRecord;
  draftRevision: number;
  publishedRevision: number | null;
  publishedAt: string | null;
  versions: readonly number[];
}>;

function object(value: unknown): JsonRecord {
  assert(isJsonRecord(value), 'Expected JSON object');
  return value;
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function revision(value: unknown): number {
  assert(typeof value === 'number' && Number.isSafeInteger(value) && value > 0, 'Expected revision');
  return value;
}

async function readState(api: APIRequestContext): Promise<State> {
  const response = await api.get(endpoint, { headers: noStore, maxRedirects: 0 });
  expect(response.status()).toBe(200);
  const body = object(await response.json());
  assert(Array.isArray(body.versions));
  return {
    content: object(body.content),
    draftRevision: revision(body.draftRevision),
    publishedRevision: body.publishedRevision === null ? null : revision(body.publishedRevision),
    publishedAt: body.publishedAt === null ? null : String(body.publishedAt),
    versions: body.versions.map((entry: unknown) => revision(object(entry).revision)),
  };
}

async function readPublished(api: APIRequestContext): Promise<JsonRecord> {
  const response = await api.get(`/api/content/audit?audit-fields=${randomUUID()}`, { headers: noStore, maxRedirects: 0 });
  expect(response.status()).toBe(200);
  return object(object(await response.json()).content);
}

async function saveDraft(api: APIRequestContext, expectedRevision: number, content: JsonRecord): Promise<{ readonly content: JsonRecord; readonly draftRevision: number }> {
  const response = await api.patch(endpoint, {
    data: { expectedRevision, content },
    maxRedirects: 0, maxRetries: 0, timeout: 15_000,
  });
  expect(response.status(), `Draft save failed: ${await response.text()}`).toBe(200);
  const body = object(await response.json());
  expect(body.ok).toBe(true);
  return { content: object(body.content), draftRevision: revision(body.draftRevision) };
}

async function restoreVersionDraft(
  api: APIRequestContext,
  expectedRevision: number,
  sourceRevision: number,
): Promise<{ readonly content: JsonRecord; readonly draftRevision: number }> {
  const response = await api.fetch(endpoint, {
    method: 'PUT',
    data: { expectedRevision, sourceRevision },
    maxRedirects: 0, maxRetries: 0, timeout: 15_000,
  });
  expect(response.status(), `Version restore failed: ${await response.text()}`).toBe(200);
  const body = object(await response.json());
  expect(body.ok).toBe(true);
  return { content: object(body.content), draftRevision: revision(body.draftRevision) };
}

async function publish(api: APIRequestContext, expectedRevision: number): Promise<{ readonly publishedRevision: number; readonly publishedAt: string }> {
  const response = await api.post(endpoint, {
    data: { expectedRevision },
    maxRedirects: 0, maxRetries: 0, timeout: 15_000,
  });
  expect(response.status(), `Publish failed: ${await response.text()}`).toBe(200);
  const body = object(await response.json());
  return { publishedRevision: revision(body.publishedRevision), publishedAt: String(body.publishedAt) };
}

async function expectEditorFields(page: Page): Promise<void> {
  await page.goto('/admin/pages/audit', { waitUntil: 'domcontentloaded' });
  await page.waitForResponse((response) => response.url().includes('/api/admin/settings/pages/audit') && response.ok(), { timeout: 30_000 }).catch(() => undefined);
  await expect(page.getByRole('button', { name: '게시' })).toBeDisabled({ timeout: 15_000 });
  const expectedBySection = [
    { tab: '첫 화면', labels: ['이미지 캡션 첫 줄', '이미지 캡션 둘째 줄'] },
    { tab: '검토 기준', labels: ['접근성 영역 이름', '검토 기준 카드'] },
    { tab: '진행 과정', labels: ['접근성 영역 이름', '진행 단계', '순서 표시'] },
    { tab: '표시 상태', labels: ['접근성 영역 이름', '상태 카드'] },
    { tab: '마지막 안내', labels: ['이동 버튼'] },
  ] as const;
  for (const section of expectedBySection) {
    await page.getByRole('button', { name: section.tab, exact: true }).click();
    for (const label of section.labels) {
      await expect(page.getByText(label).first(), `Missing ${section.tab} field label: ${label}`).toBeVisible({ timeout: 15_000 });
    }
  }
}

async function openAuditPage(page: Page): Promise<void> {
  await page.goto(`/audit?audit-fields=${randomUUID()}`, { waitUntil: 'domcontentloaded' });
}

test.describe.configure({ mode: 'serial', retries: 0 });
test.use({ storageState: { cookies: [], origins: [] }, trace: 'off', video: 'off' });

test('CMS Audit fields: draft isolation, full field publish, DOM mapping, refresh, and restore', async ({ page, baseURL }, testInfo) => {
  test.setTimeout(240_000);
  assert(CRUD_ENABLED, 'E2E_ADMIN_CRUD=1 is required; missing write authorization must fail');
  assert(ADMIN_EMAIL && ADMIN_PASSWORD, 'E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD are required');
  expect(testInfo.config.workers, 'Run this singleton spec with --workers=1').toBe(1);
  assert(baseURL, 'Explicit localhost baseURL is required');
  expect(new URL(baseURL).hostname).toMatch(/^(localhost|127\.0\.0\.1)$/u);
  expect(process.env.TEST_SUPABASE_PROJECT_REF).toBe('aeooyivfijthfcrfrnyk');
  await assertGoldenWritePreflight();
  await loginAsAdmin(page);
  await expectEditorFields(page);

  const api = page.request;
  const original = await readState(api);
  const originalPublished = await readPublished(api);
  assert(original.publishedRevision !== null, 'Audit page must have a published revision before field CRUD');
  let owned: State | undefined = original;
  let expectedPublished = originalPublished;

  async function assertOwnership(): Promise<State> {
    assert(owned, 'Mutation outcome unknown: refusing blind rollback; inspect Audit manually');
    const current = await readState(api);
    expect(current, 'External Audit edit detected').toEqual(owned);
    expect(await readPublished(api), 'External Audit publish detected').toEqual(expectedPublished);
    return current;
  }

  async function ownedSaveDraft(content: JsonRecord): Promise<State> {
    const before = await assertOwnership();
    owned = undefined;
    const result = await saveDraft(api, before.draftRevision, content);
    const next = await readState(api);
    expect(next.content).toEqual(result.content);
    expect(next.draftRevision).toBe(result.draftRevision);
    expect(next.draftRevision).toBe(before.draftRevision + 1);
    owned = next;
    await assertOwnership();
    return next;
  }

  async function ownedPublish(): Promise<State> {
    const before = await assertOwnership();
    owned = undefined;
    const published = await publish(api, before.draftRevision);
    expect(published.publishedRevision).toBe(before.draftRevision);
    expectedPublished = before.content;
    const next = await readState(api);
    expect(next.publishedRevision).toBe(before.draftRevision);
    expect(next.publishedAt).toBe(published.publishedAt);
    expect(next.versions).toContain(before.draftRevision);
    owned = next;
    await assertOwnership();
    return next;
  }

  async function ownedRestoreVersionDraft(sourceRevision: number): Promise<State> {
    const before = await assertOwnership();
    owned = undefined;
    const result = await restoreVersionDraft(api, before.draftRevision, sourceRevision);
    const next = await readState(api);
    expect(next.content).toEqual(result.content);
    expect(next.draftRevision).toBe(result.draftRevision);
    expect(next.draftRevision).toBe(before.draftRevision + 1);
    owned = next;
    await assertOwnership();
    return next;
  }

  const sourceRevision = original.versions.includes(original.publishedRevision)
    ? original.publishedRevision
    : (await ownedSaveDraft(originalPublished), await ownedPublish()).publishedRevision;
  assert(sourceRevision !== null, 'Original published source revision must be archived');

  const phaseA = phaseAAudit(randomUUID());
  const phaseB = phaseBAudit(randomUUID());

  try {
    await ownedSaveDraft(phaseA);
    expect(await readPublished(api)).toEqual(originalPublished);
    await ownedPublish();
    expect(await readPublished(api)).toEqual(phaseA);
    await openAuditPage(page);
    await expectPublicDom(page, phaseA);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expectPublicDom(page, phaseA);

    await ownedSaveDraft(phaseB);
    await ownedPublish();
    expect(await readPublished(api)).toEqual(phaseB);
    await openAuditPage(page);
    await expectPublicDom(page, phaseB);
  } finally {
    test.setTimeout(testInfo.timeout + 90_000);
    if (owned) {
      await ownedRestoreVersionDraft(sourceRevision);
      expect(await readPublished(api)).toEqual(expectedPublished);
      await ownedPublish();
      expectedPublished = originalPublished;
      expect(await readPublished(api)).toEqual(originalPublished);
      await ownedSaveDraft(original.content);
      expect((await assertOwnership()).content).toEqual(original.content);
      expect(sourceRevision).toBeGreaterThan(0);
    }
  }
});
