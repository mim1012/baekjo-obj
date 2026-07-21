import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// 구매평(product_reviews) admin moderation 라우트의 소스-계약 스펙 — 브라우저/DB 없이
// CI에서 항상 돈다(tests/admin = admin project, purchase-review-eligibility.spec.ts와 동일 계열).
//
// 검증 대상: /api/admin/reviews(GET), /api/admin/reviews/[id](PATCH·DELETE)가
// (1) requireAdmin 가드를 실제로 호출하는지(§10-3 — 가드 누락 시 금고 통째 노출),
// (2) PATCH의 status 값이 'published'|'hidden' 화이트리스트로만 통과하는지(임의 문자열 저장 방지),
// (3) repo 함수(listAllProductReviews·setProductReviewStatus·adminDeleteProductReview)를 실제로 호출하는지.

const root = path.resolve(__dirname, '..', '..');

function read(relPath: string): string {
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

test.describe('admin 구매평 moderation 라우트 계약', () => {
  test('GET /api/admin/reviews — requireAdmin 가드 + listAllProductReviews 사용', () => {
    const source = read('src/app/api/admin/reviews/route.ts');
    expect(source).toContain("import { requireAdmin } from '@/lib/admin/requireAdmin'");
    expect(source).toContain('await requireAdmin()');
    expect(source).toContain('if (!admin.ok) return admin.response');
    expect(source).toContain('listAllProductReviews');
  });

  test('PATCH·DELETE /api/admin/reviews/[id] — requireAdmin 가드 + repo 함수 사용', () => {
    const source = read('src/app/api/admin/reviews/[id]/route.ts');
    expect(source).toContain("import { requireAdmin } from '@/lib/admin/requireAdmin'");
    // PATCH·DELETE 두 핸들러 모두 가드를 통과해야 하므로 최소 2회 등장한다.
    const guardCalls = source.match(/await requireAdmin\(\)/g) ?? [];
    expect(guardCalls.length).toBeGreaterThanOrEqual(2);
    expect(source).toContain('setProductReviewStatus');
    expect(source).toContain('adminDeleteProductReview');
  });

  test('PATCH status 화이트리스트가 published/hidden 두 값만 허용한다', () => {
    const source = read('src/app/api/admin/reviews/[id]/route.ts');
    expect(source).toContain("['published', 'hidden']");
    expect(source).toContain('isValidStatus');
  });

  test('repo — listAllProductReviews는 published+hidden 전체를 반환하고 status 필터를 걸지 않는다', () => {
    const source = read('src/lib/reviews/repo.ts');
    const fnStart = source.indexOf('export async function listAllProductReviews');
    expect(fnStart).toBeGreaterThan(-1);
    const fnBody = source.slice(fnStart, source.indexOf('\n}', fnStart));
    expect(fnBody).not.toContain("eq('status'");
  });

  test('repo — setProductReviewStatus/adminDeleteProductReview는 소유자(member_id) 조건 없이 admin 권한만으로 동작한다', () => {
    const source = read('src/lib/reviews/repo.ts');
    const statusFnStart = source.indexOf('export async function setProductReviewStatus');
    const statusFnBody = source.slice(statusFnStart, source.indexOf('\n}', statusFnStart));
    expect(statusFnBody).not.toContain("eq('member_id'");

    const deleteFnStart = source.indexOf('export async function adminDeleteProductReview');
    const deleteFnBody = source.slice(deleteFnStart, source.indexOf('\n}', deleteFnStart));
    expect(deleteFnBody).not.toContain("eq('member_id'");
  });

  test('storage.ts 콘센트 — getAdminProductReviews/setAdminReviewStatus/deleteAdminReview가 가산됐다', () => {
    const source = read('src/lib/storage.ts');
    expect(source).toContain('export async function getAdminProductReviews');
    expect(source).toContain('export async function setAdminReviewStatus');
    expect(source).toContain('export async function deleteAdminReview');
  });

  test('DB 트리거 마이그레이션(0070) — published 상태만 집계하고 rating을 소수 1자리로 반올림한다', () => {
    const source = read('supabase/migrations/0070_recompute_product_rating.sql');
    expect(source).toContain("status = 'published'");
    expect(source).toContain('round(avg(rating)::numeric, 1)');
    expect(source).toContain('after insert or update or delete on public.product_reviews');
  });

  // codex 리뷰(2026-07-22): 트리거만 생성하면 마이그레이션 적용 시점에 이미 쌓인 published 리뷰가
  // 있는 상품은 다음 write가 일어나기 전까지 rating/review_count가 0037이 남긴 0 그대로다.
  // 트리거 생성 뒤 기존 product_id 전체를 순회해 즉시 재계산하는 백필 블록이 반드시 있어야 한다.
  test('DB 트리거 마이그레이션(0070) — 기존 product_reviews를 즉시 재계산하는 백필 블록이 있다', () => {
    const source = read('supabase/migrations/0070_recompute_product_rating.sql');
    const triggerIdx = source.indexOf('create trigger product_reviews_recompute_rating');
    expect(triggerIdx).toBeGreaterThan(-1);
    const afterTrigger = source.slice(triggerIdx);
    expect(afterTrigger).toContain('do $$');
    expect(afterTrigger).toContain('select distinct product_id from public.product_reviews');
    expect(afterTrigger).toContain('perform public.recompute_product_rating(r.product_id)');
  });
});
