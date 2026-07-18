import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');
const src = (...segments: string[]) => fs.readFileSync(path.join(root, ...segments), 'utf8');

test.describe('전시용 후기(showcase reviews) 관리자 저장 → 공개 화면 바인딩 경로', () => {
  test('관리자 후기 화면은 storage 콘센트와 CRUD 콜백을 모두 연결한다', () => {
    const pageSource = src('src', 'app', 'admin', 'reviews', 'page.tsx');

    expect(pageSource).toContain("import { getAdminShowcaseReviewsConfig, saveShowcaseReviewsConfig } from '@/lib/storage';");
    expect(pageSource).toContain('getAdminShowcaseReviewsConfig()');
    expect(pageSource).toContain('onCreateRow={ready ? handleCreate : undefined}');
    expect(pageSource).toContain('onUpdateRow={ready ? handleUpdate : undefined}');
    expect(pageSource).toContain('onDeleteRow={ready ? handleDelete : undefined}');
    expect(pageSource).not.toContain('readOnly');
    // id 는 편집 키 — 편집 시 이전 id 를 유지하고, 생성 시에만 발급한다.
    expect(pageSource).toContain('previous?.id ?? createReviewId()');
    // 로딩 중·로드 실패엔 CRUD 콜백을 아예 안 넘겨 버튼 자체를 숨긴다 — 조용한 no-op 방지(codex F3).
    expect(pageSource).toContain('const ready = loaded && !loadError;');
    // 등록·수정·삭제가 모두 batch save 없이 즉시 저장한다(2026-07-18 저장 유실 리포트 — 2단계
    // 저장 함정 제거). 헤더의 batch onSave 는 완전히 제거됐다.
    expect(pageSource).not.toContain('onSave=');
    expect(pageSource).not.toContain('const handleSave');
    // 세 액션 모두 persisted 기준(마지막으로 DB 와 일치한 목록)으로 nextItems 를 계산한다 — 미저장
    // 다른 편집이 이 저장에 딸려 커밋되지 않는다(opus 리뷰 MEDIUM-1 의 연장).
    expect(pageSource).toContain('const persistedItemsRef = useRef<Review[]>([]);');
    expect(pageSource).toContain('const nextItems = [...persistedItemsRef.current, newReview];');
    expect(pageSource).toContain('const nextItems = persistedItemsRef.current.map((review) =>');
    expect(pageSource).toContain('const nextItems = persistedItemsRef.current.filter((review) => review.id !== id);');
    expect((pageSource.match(/saveShowcaseReviewsConfig\(\{ items: nextItems \}\)/g) ?? []).length).toBe(3);
    expect((pageSource.match(/persistedItemsRef\.current = nextItems;/g) ?? []).length).toBe(3);
    expect(pageSource).toContain('setItems(nextItems);');
    expect(pageSource).toContain('setItems((prev) => prev.filter((review) => review.id !== id));');
    // notices 와 달리 전시 후기는 빈 목록을 허용 — 마지막 1건 삭제를 막는 가드를 두지 않는다.
    expect(pageSource).not.toContain('nextItems.length === 0');
    expect(pageSource).toContain("window.alert('등록 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');");
    expect(pageSource).toContain("window.alert('수정 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');");
    // 등록·수정·삭제 공용 상호배제 — 동시 PUT 이 서로를 덮어쓰는 레이스를 막는다(codex 2차 리뷰 HIGH).
    expect(pageSource).toContain('const busyRef = useRef(false);');
    expect((pageSource.match(/if \(!loaded \|\| loadError \|\| busyRef\.current\) return;/g) ?? []).length).toBe(3);
    expect((pageSource.match(/busyRef\.current = true;/g) ?? []).length).toBe(3);
    expect((pageSource.match(/busyRef\.current = false;/g) ?? []).length).toBe(3);
    expect(pageSource).not.toContain('deletingRef');
  });

  test('storage 콘센트는 공개 GET 폴백과 관리자 PUT 경로를 제공한다', () => {
    const storageSource = src('src', 'lib', 'storage.ts');

    expect(storageSource).toContain("fetch('/api/showcase-reviews')");
    expect(storageSource).toContain('return defaultShowcaseReviewsConfig.items;');
    expect(storageSource).toContain("fetch('/api/admin/showcase-reviews', {");
    // 관리자 getter 는 실패·깨진 응답에 throw 해서 저장을 막는다(공개 폴백과 분리 — notices 미러).
    expect(storageSource).toContain('export async function getAdminShowcaseReviewsConfig');
    expect(storageSource).toContain("throw new Error('showcase-reviews-config-load-failed')");
    expect(storageSource).toContain("throw new Error('showcase-reviews-config-invalid-response')");
  });

  test('관리자 API 라우트는 requireAdmin 가드와 후기 모양 검증을 거치고 빈 items 를 허용한다', () => {
    const routeSource = src('src', 'app', 'api', 'admin', 'showcase-reviews', 'route.ts');

    expect(routeSource).toContain('await requireAdmin();');
    // item 단위 형상은 repo 와 공용인 showcaseValidate.ts 를 재사용한다(중복 정의 제거 — codex F1 미러).
    expect(routeSource).toContain("import { isShowcaseReviewShape, normalizeShowcaseReview } from '@/lib/reviews/showcaseValidate';");
    expect(routeSource).toContain('items.every(isShowcaseReviewShape)');
    // id 는 관리자 편집 키 — 중복을 거부한다.
    expect(routeSource).toContain('new Set(ids).size === ids.length');
    // optional 필드 null 은 저장 전 undefined 로 정규화한다.
    expect(routeSource).toContain('body.items.map(normalizeShowcaseReview)');
    expect(routeSource).toContain('return NextResponse.json({ ok: true }, { status: 200 });');
    // notices 와의 차이 — items 최소 1건 요구를 두지 않는다(실 구매평 축적 후 전시 후기 0건 허용).
    expect(routeSource).not.toContain('items.length < 1');
  });

  test('공용 형상 검증(showcaseValidate.ts)은 item 단위 규칙을 한 곳에 정의한다', () => {
    const validateSource = src('src', 'lib', 'reviews', 'showcaseValidate.ts');

    expect(validateSource).toContain('export function isShowcaseReviewShape(item: unknown): item is Review');
    // rating 은 1~5 범위의 유한한 숫자만 허용한다.
    expect(validateSource).toContain('export function isRating(value: unknown): value is number');
    expect(validateSource).toContain('value >= 1 && value <= 5');
    expect(validateSource).toContain("export const REVIEW_PET_TYPES = ['dog', 'cat'] as const;");
    // null → undefined 정규화(반환·저장 전 항상 거친다).
    expect(validateSource).toContain('export function normalizeShowcaseReview');
    expect(validateSource).toContain('image: review.image ?? undefined');
    expect(validateSource).toContain('isVisible: review.isVisible ?? undefined');
    expect(validateSource).toContain('isBest: review.isBest ?? undefined');
  });

  test('공개 API 라우트는 절대 500 을 내지 않고 default 로 폴백한다', () => {
    const routeSource = src('src', 'app', 'api', 'showcase-reviews', 'route.ts');

    expect(routeSource).toContain('defaultShowcaseReviewsConfig');
    expect(routeSource).toContain('logServerError');
  });

  test('repo 는 showcase_reviews_config 싱글턴 행을 upsert 하고 서버 폴백 조회를 제공하며 빈 items 를 허용한다', () => {
    const repoSource = src('src', 'lib', 'reviews', 'repo.ts');

    expect(repoSource).toContain(".from('showcase_reviews_config')");
    expect(repoSource).toContain('upsert(');
    // item 단위 형상 가드 — 기형 jsonb item 이 소비부에서 crash 하지 않게 default 폴백으로 접는다.
    expect(repoSource).toContain('items.every(isShowcaseReviewShape)');
    expect(repoSource).toContain('data.value.items.map(normalizeShowcaseReview)');
    // 공개 서버 페이지용 폴백 — 미저장·조회 실패에도 기본 목록으로 렌더한다.
    expect(repoSource).toContain('export async function getShowcaseReviewsConfigWithFallback');
    expect(repoSource).toContain('defaultShowcaseReviewsConfig');
    // notices 와의 차이 — items.length > 0 요구를 두지 않는다.
    expect(repoSource).not.toContain('items.length > 0');
  });

  test('공개 화면은 더 이상 정적 @/data/reviews 를 import 하지 않는다', () => {
    const consumers = [
      ['src', 'app', 'reviews', 'page.tsx'],
      ['src', 'app', 'brands', '[id]', 'page.tsx'],
      ['src', 'app', 'concerns', '[slug]', 'page.tsx'],
      ['src', 'components', 'home', 'HomeClient.tsx'],
      ['src', 'app', 'page.tsx'],
      ['src', 'lib', 'adapters.ts'],
      ['src', 'app', 'admin', 'reviews', 'page.tsx'],
    ];
    for (const segments of consumers) {
      const source = src(...segments);
      expect(source).not.toMatch(/from ['"]@\/data\/reviews['"]/);
      expect(source).not.toMatch(/(?:import\s*\(|require\s*\()\s*['"]@\/data\/reviews['"]/);
    }
    // 정적 파일 자체가 삭제됐다 — 재도입은 eslint no-restricted-imports 가 막는다.
    expect(fs.existsSync(path.join(root, 'src', 'data', 'reviews.ts'))).toBe(false);
  });

  test('서버 공개 페이지는 repo 폴백 조회를, 홈은 props 주입을 쓴다', () => {
    // 서버 컴포넌트 — repo 직접 호출(자기 API HTTP 왕복 금지, §10-2 ①경로).
    for (const segments of [
      ['src', 'app', 'reviews', 'page.tsx'],
      ['src', 'app', 'brands', '[id]', 'page.tsx'],
      ['src', 'app', 'concerns', '[slug]', 'page.tsx'],
      ['src', 'app', 'page.tsx'],
    ]) {
      expect(src(...segments)).toContain("import { getShowcaseReviewsConfigWithFallback } from '@/lib/reviews/repo';");
    }
    // 홈 표현 파일(dad 소유)은 reviews 를 props 로만 받는다 — 배선은 서버 wrapper 가 한다(§3-1).
    const clientSource = src('src', 'components', 'home', 'HomeClient.tsx');
    expect(clientSource).toContain('reviews: Review[];');
    expect(clientSource).toContain('reviews.map((review) => (');
  });
});
