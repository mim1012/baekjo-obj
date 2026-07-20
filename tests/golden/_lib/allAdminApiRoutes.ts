// 관리자 API 라우트 레지스트리 — all-pages-smoke.spec.ts 의 "비로그인/비관리자 차단" 음성 케이스와
// route-coverage-audit.spec.ts 의 커버리지 감사가 공유한다.
//
// 실측 확인(2026-07-19, 로컬 dev + staging): `src/proxy.ts` 는 matcher(`/api/admin/:path*`)에 걸리는
// 모든 요청을 라우트 핸들러가 실행되기도 전에 가로챈다 — `isAdmin` 이 아니면 무조건
// 401(비로그인)/403(로그인했지만 비관리자)을 반환하고 `NextResponse.next()` 를 호출하지 않는다.
// 그래서 이 프록시 레이어를 확인하는 목적이라면 **각 라우트가 실제로 어떤 HTTP 메서드를 구현했는지는
// 무관하다** — GET 만 없는 PATCH 전용 라우트에도 익명 GET 을 보내면 405(Method Not Allowed)가 아니라
// 401 이 온다(프록시가 먼저 막아서 라우트 디스패치까지 못 감). 실제로 `GET /api/admin/orders/1`
// (PATCH 전용) 을 익명으로 호출해 `401 {"error":"unauthorized"}` 를 직접 확인했다 — 그래서 이 레지스트리는
// 메서드 정보를 담지 않고 경로만 담는다(GET 으로 통일 프로브).
//
// route 문자열은 `src/app/api/admin/**/route.ts` 를 1:1로 대응해야 한다(동적 세그먼트는 [id] 그대로) —
// route-coverage-audit.spec.ts 가 파일시스템과 대조한다.
export const ALL_ADMIN_API_ROUTES: string[] = [
  '/api/admin/brands',
  '/api/admin/brands/[id]',
  '/api/admin/category-settings',
  '/api/admin/concerns',
  '/api/admin/dashboard',
  '/api/admin/inquiries',
  '/api/admin/inquiries/[id]/answer',
  '/api/admin/insurance',
  '/api/admin/insurance-content',
  '/api/admin/insurance/[id]',
  '/api/admin/kits',
  '/api/admin/members',
  '/api/admin/members/[id]',
  '/api/admin/members/file',
  '/api/admin/notices',
  '/api/admin/order-policy',
  '/api/admin/orders',
  '/api/admin/orders/[id]',
  '/api/admin/orders/[id]/shipments',
  '/api/admin/orders/[id]/shipments/[brandId]',
  '/api/admin/partner-inquiries',
  '/api/admin/partner-inquiries/[id]',
  '/api/admin/partners',
  '/api/admin/products',
  '/api/admin/products/[id]',
  '/api/admin/qna',
  '/api/admin/settings',
  '/api/admin/showcase-reviews',
  '/api/admin/survey',
  '/api/admin/upload',
];

/** 동적 세그먼트([id]·[brandId] 등)를 더미 값으로 채운다 — 프록시는 세그먼트 값의 유효성을 보지
 * 않고 경로 접두사(matcher)만으로 차단하므로 실제로 존재하는 id 일 필요가 없다. */
export function fillApiRoute(route: string): string {
  return route.replace(/\[[^\]]+\]/g, 'e2e-smoke-probe');
}
