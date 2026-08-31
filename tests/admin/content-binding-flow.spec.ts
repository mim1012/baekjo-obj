import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');
const src = (...segments: string[]) => fs.readFileSync(path.join(root, ...segments), 'utf8');

function expectNoMutableProductBrandImport(source: string): void {
  expect(source).not.toMatch(/from ['"][^'"]*data\/(?:products|brands)(?:\.[^'"]*)?['"]/);
  expect(source).not.toMatch(/(?:import\s*\(|require\s*\()\s*['"][^'"]*data\/(?:products|brands)(?:\.[^'"]*)?['"]/);
  expect(source).not.toMatch(/@\/data\/(?:products|brands)(?:\.[^'"]*)?/);
}

test.describe('콘텐츠 관리자 저장/읽기 전용 → 공개 콘텐츠 바인딩 경로', () => {
  // concerns 는 2026-07-17 DB 싱글턴 config 로 이관돼 이 목록에서 빠졌다 — concern-binding-flow.spec.ts 가 커버한다.
  // notices 도 같은 날 DB 싱글턴 config 로 이관 — notice-binding-flow.spec.ts 가 커버한다.
  // reviews(전시 후기)도 2026-07-18 DB 싱글턴 config 로 이관 — showcase-review-binding-flow.spec.ts 가 커버한다.
  test('AdminResourcePage 는 readOnly/CRUD 게이팅 구조를 유지한다', () => {
    const resourcePage = src('src', 'components', 'admin', 'AdminResourcePage.tsx');

    expect(resourcePage).toContain('readOnly?: boolean;');
    expect(resourcePage).toContain('readOnly = false,');
    expect(resourcePage).toContain('const canEditRows = !readOnly && !disableEdit && onUpdateRow != null;');
    // wave-4 수정(2026-07-19): onSave==null 폴백 제거 — onDeleteRow 없으면 버튼 자체가 없다.
    // 이전 조건(`onDeleteRow != null || onSave == null`)은 batch save(onSave)를 안 쓰는 화면
    // 전부에서 onDeleteRow 없이도 삭제 버튼을 보여줘 가짜(비영속) 삭제를 유발했다.
    expect(resourcePage).toContain('const canDeleteRows = !readOnly && onDeleteRow != null;');
    expect(resourcePage).toContain('const hasRowActions = canEditRows || canDeleteRows || canMoveRows || customActions != null;');
    // 로컬 비영속 숨김(deletedIds) 폴백 경로가 되살아나지 않는지 고정.
    expect(resourcePage).not.toContain('deletedIds');
    expect(resourcePage).not.toContain('setDeletedIds');
    expect(resourcePage).toContain('(onSave || canCreateRows)');
    expect(resourcePage).toContain('{canCreateRows && (');
    expect(resourcePage).toContain('{hasRowActions && (');
    expect(resourcePage).toContain('현재 줄에만 적용');
    expect(resourcePage).toContain('{canEditRows && editingRow && (');
    expect(resourcePage).toContain('try {');
    expect(resourcePage).toContain('} finally {');
  });

  test('공개 후기 페이지는 showcase repo 폴백을 읽고 products/brands mutable data 를 직접 읽지 않는다', () => {
    const reviewsPage = src('src', 'app', 'reviews', 'page.tsx');

    expect(reviewsPage).toContain("import { getShowcaseReviewsConfigWithFallback } from '@/lib/reviews/repo';");
    expect(reviewsPage).toContain('return review.petType === filter;');

    for (const page of [reviewsPage]) {
      expectNoMutableProductBrandImport(page);
      expect(page).not.toContain('@/lib/products/repo');
      expect(page).not.toContain('@/lib/brands/repo');
      expect(page).not.toContain('listProducts');
      expect(page).not.toContain('listBrands');
      expect(page).not.toContain('@/lib/storage');
      expect(page).not.toContain('localStorage');
      expect(page).not.toContain('sessionStorage');
    }
  });
});
