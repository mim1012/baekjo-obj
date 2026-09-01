import { test, expect, type APIRequestContext, type Browser } from '@playwright/test';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  CRUD_ENABLED,
  bypassHeaders,
  loginAsAdmin,
} from './_lib/adminCrudHelpers';

// 전체 화면 관리의 실제 DB 연결을 staging에서 검증한다.
// brands CMS 한 필드만 임시 값으로 저장·게시해 고객 /brands에서 확인한 뒤,
// 원래 게시본과 원래 미게시 편집본 상태를 순서대로 복원한다.
test.describe.configure({ mode: 'serial' });

test.describe('골든플로우: 전체 화면 관리 DB 저장·게시·공개 반영', () => {
  test.skip(!CRUD_ENABLED, 'E2E_ADMIN_CRUD=1 미설정 — 쓰기 스펙 skip(staging 전용)');
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'E2E_ADMIN_* secret 미주입 — 로그인 불가');
  test.use({ extraHTTPHeaders: bypassHeaders() });

  const endpoint = '/api/admin/settings/pages/brands';
  const marker = `E2E-BRANDS-CMS-${Date.now()}`;
  let originalDraftContent: Record<string, unknown> | null = null;
  let originalPublishedRevision: number | null = null;
  let originalHadUnpublishedChanges = false;
  let needsRestore = false;

  async function getState(request: APIRequestContext) {
    const response = await request.get(endpoint);
    expect(response.ok(), `브랜드 CMS 조회 실패: HTTP ${response.status()}`).toBe(true);
    return response.json() as Promise<{
      content: Record<string, unknown>;
      draftRevision: number;
      publishedRevision: number | null;
      hasUnpublishedChanges: boolean;
    }>;
  }

  async function restoreOriginal(browser: Browser) {
    if (!needsRestore || !originalDraftContent || originalPublishedRevision === null) return;
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    try {
      await loginAsAdmin(page);
      const current = await getState(page.request);
      const restorePublishedDraft = await page.request.put(endpoint, {
        data: {
          expectedRevision: current.draftRevision,
          sourceRevision: originalPublishedRevision,
        },
      });
      expect(
        restorePublishedDraft.ok(),
        `브랜드 CMS 원래 게시본 불러오기 실패: HTTP ${restorePublishedDraft.status()}`,
      ).toBe(true);
      const restoredDraft = await restorePublishedDraft.json() as { draftRevision: number };
      const republish = await page.request.post(endpoint, {
        data: { expectedRevision: restoredDraft.draftRevision },
      });
      expect(republish.ok(), `브랜드 CMS 원래 게시본 재게시 실패: HTTP ${republish.status()}`).toBe(true);

      if (originalHadUnpublishedChanges) {
        const afterPublish = await getState(page.request);
        const restoreDraft = await page.request.patch(endpoint, {
          data: {
            expectedRevision: afterPublish.draftRevision,
            content: originalDraftContent,
          },
        });
        expect(restoreDraft.ok(), `브랜드 CMS 원래 편집본 복원 실패: HTTP ${restoreDraft.status()}`).toBe(true);
      }
      needsRestore = false;
    } finally {
      await page.close();
    }
  }

  test.afterAll(async ({ browser }) => {
    await restoreOriginal(browser);
  });

  test('브랜드 목록 문구 임시저장 → 게시 → 고객 화면 read-back → 원상복구', async ({ page, browser }) => {
    await loginAsAdmin(page);
    const original = await getState(page.request);
    originalDraftContent = original.content;
    originalPublishedRevision = original.publishedRevision;
    originalHadUnpublishedChanges = original.hasUnpublishedChanges;
    expect(originalPublishedRevision, '브랜드 CMS 초기 게시본이 없습니다.').not.toBeNull();

    const changedContent = structuredClone(original.content) as {
      hero?: { eyebrow?: string };
    };
    changedContent.hero = { ...(changedContent.hero ?? {}), eyebrow: marker };
    needsRestore = true;

    const draftResponse = await page.request.patch(endpoint, {
      data: {
        expectedRevision: original.draftRevision,
        content: changedContent,
      },
    });
    expect(draftResponse.ok(), `브랜드 CMS 임시저장 실패: HTTP ${draftResponse.status()}`).toBe(true);
    const draft = await draftResponse.json() as { draftRevision: number };

    const beforePublish = await getState(page.request);
    expect(beforePublish.hasUnpublishedChanges).toBe(true);
    expect((beforePublish.content.hero as { eyebrow?: string })?.eyebrow).toBe(marker);

    const publishResponse = await page.request.post(endpoint, {
      data: { expectedRevision: draft.draftRevision },
    });
    expect(publishResponse.ok(), `브랜드 CMS 게시 실패: HTTP ${publishResponse.status()}`).toBe(true);

    await page.goto('/brands');
    await expect(page.locator('[data-testid="brands-hero"]')).toContainText(marker);

    await restoreOriginal(browser);
    await page.goto('/brands');
    await expect(page.locator('[data-testid="brands-hero"]')).not.toContainText(marker);
  });
});
