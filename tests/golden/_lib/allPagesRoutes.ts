// 전 페이지 스모크 검수 + 라우트 커버리지 감사가 공유하는 라우트 레지스트리.
//
// 이 배열의 `route`는 `src/app/**/page.tsx`(동적 세그먼트는 `[id]` 형태 그대로) 를 1:1로
// 대응해야 한다 — `route-coverage-audit.spec.ts`가 파일시스템을 스캔해 이 배열과 정확히
// 일치하는지 검사한다(신규 페이지 추가 시 여기 등록을 깜빡하면 CI 실패, golden-crud-coverage
// 패턴과 동일한 사상). `all-pages-smoke.spec.ts`는 같은 배열을 읽어 각 라우트를 실제로 방문한다.
//
// auth 종류:
// - 'none'      — 비로그인 상태로 방문. 정상 렌더를 기대한다.
// - 'redirect'  — 비로그인/무상태 방문 시 항상 다른 경로로 리다이렉트되는 게 "정상"인 라우트
//                 (세션/쿼리 상태가 없어 클라이언트가 즉시 이동시킨다). expectedRedirect에 목적지.
// - 'admin'     — /admin/** 는 proxy.ts 가드로 비로그인 시 /login?error=admin 으로 302, 관리자
//                 로그인 후에만 의미 있는 렌더를 확인한다(AGENTS.md §10-7).
// - 'member'    — 로그인 회원만 의미 있게 렌더(비로그인 시 클라이언트가 /login 으로 보냄).
//
// kind: 'static' | 'dynamic' — dynamic 은 런타임에 공개/관리자 API 로 표본 id 를 골라야 한다.
export type RouteAuth = 'none' | 'redirect' | 'admin' | 'member';
export type RouteKind = 'static' | 'dynamic';

/** 동적 라우트가 표본 파라미터를 어디서 구하는지 — smoke 스펙이 실행 시점에 해석한다. */
export type ParamSource =
  | { from: 'public-api'; endpoint: string; listKey: string; idKey: string }
  | { from: 'admin-api'; endpoint: string; listKey: string; idKey: string };

export interface RouteEntry {
  /** src/app/**\/page.tsx 를 1:1로 대응하는 라우트 문자열. */
  route: string;
  kind: RouteKind;
  auth: RouteAuth;
  /** auth: 'redirect' 일 때 도달해야 하는 경로(prefix 매칭). */
  expectedRedirect?: string;
  paramSource?: ParamSource;
  /** 사람이 읽는 한 줄 설명 — 실패 리포트에 같이 찍힌다. */
  note: string;
}

export const ALL_APP_ROUTES: RouteEntry[] = [
  // ── 공개 정적 페이지 ─────────────────────────────────────────
  { route: '/', kind: 'static', auth: 'none', note: '홈' },
  { route: '/audit', kind: 'static', auth: 'none', note: 'Audit 기준 소개' },
  { route: '/b2b', kind: 'static', auth: 'none', note: 'B2B 케어키트 랜딩' },
  { route: '/brands', kind: 'static', auth: 'none', note: '브랜드관 목록' },
  { route: '/cart', kind: 'static', auth: 'none', note: '장바구니(빈 상태)' },
  { route: '/concerns', kind: 'static', auth: 'none', note: '고민별 케어 목록' },
  { route: '/diagnosis', kind: 'static', auth: 'none', note: '1분 맞춤 진단 설문' },
  { route: '/experts', kind: 'static', auth: 'none', note: '전문가 콘텐츠' },
  { route: '/forgot-password', kind: 'static', auth: 'none', note: '비밀번호 찾기' },
  { route: '/insurance', kind: 'static', auth: 'none', note: '펫보험 안내' },
  { route: '/insurance/apply', kind: 'static', auth: 'none', note: '보험 분석 신청 폼' },
  { route: '/insurance/complete', kind: 'static', auth: 'none', note: '보험 신청 완료' },
  { route: '/insurance/recommend', kind: 'static', auth: 'none', note: '실시간 보험 분석(1단계)' },
  { route: '/landing/care-kit', kind: 'static', auth: 'none', note: '케어키트 B2B 랜딩' },
  { route: '/landing/insurance', kind: 'static', auth: 'none', note: '보험 랜딩' },
  { route: '/login', kind: 'static', auth: 'none', note: '로그인' },
  { route: '/notices', kind: 'static', auth: 'none', note: '공지사항 목록' },
  { route: '/order-complete', kind: 'static', auth: 'none', note: '주문완료(쿼리 없는 cold visit)' },
  { route: '/privacy', kind: 'static', auth: 'none', note: '개인정보처리방침' },
  { route: '/refund-policy', kind: 'static', auth: 'none', note: '배송·교환·환불 안내' },
  { route: '/reviews', kind: 'static', auth: 'none', note: '구매후기 목록' },
  { route: '/shop', kind: 'static', auth: 'none', note: '스토어 목록' },
  { route: '/signup', kind: 'static', auth: 'none', note: '회원가입' },
  { route: '/terms', kind: 'static', auth: 'none', note: '이용약관' },
  {
    route: '/verify-email',
    kind: 'static',
    auth: 'none',
    note: '이메일 인증(토큰 없는 cold visit — "링크가 만료됐거나 올바르지 않아요" 에러 상태가 정상)',
  },
  {
    route: '/reset-password',
    kind: 'static',
    auth: 'none',
    note: '비밀번호 재설정(토큰 없는 cold visit — "링크가 올바르지 않아요" 안내가 정상)',
  },

  // ── 비로그인/무상태 방문 시 항상 리다이렉트되는 게 정상인 페이지 ──────────────
  {
    route: '/auth/complete',
    kind: 'static',
    auth: 'redirect',
    expectedRedirect: '/login',
    note: '소셜 로그인 콜백 — 유효한 code 없이 방문하면 completeSocialLogin 이 실패해 /login?error=social 로 이동',
  },
  {
    route: '/diagnosis/result',
    kind: 'static',
    auth: 'redirect',
    expectedRedirect: '/diagnosis',
    note: 'localStorage 에 설문 답변이 없으면 /diagnosis 로 되돌림',
  },
  {
    route: '/checkout',
    kind: 'static',
    auth: 'redirect',
    expectedRedirect: '/cart',
    note: '장바구니가 비어 있으면 /cart 로 되돌림(cold visit은 항상 빈 장바구니)',
  },

  // ── 공개 동적 페이지(공개 API 로 표본 id 해석) ─────────────────────
  {
    route: '/brands/[id]',
    kind: 'dynamic',
    auth: 'none',
    paramSource: { from: 'public-api', endpoint: '/api/brands', listKey: 'brands', idKey: 'id' },
    note: '브랜드 상세',
  },
  {
    route: '/concerns/[slug]',
    kind: 'dynamic',
    auth: 'none',
    paramSource: { from: 'public-api', endpoint: '/api/concerns', listKey: 'items', idKey: 'slug' },
    note: '고민별 케어 상세',
  },
  {
    route: '/notices/[id]',
    kind: 'dynamic',
    auth: 'none',
    paramSource: { from: 'public-api', endpoint: '/api/notices', listKey: 'items', idKey: 'id' },
    note: '공지 상세',
  },
  {
    route: '/shop/[id]',
    kind: 'dynamic',
    auth: 'none',
    paramSource: { from: 'public-api', endpoint: '/api/products', listKey: 'products', idKey: 'id' },
    note: '상품 상세',
  },

  // ── 회원 전용 ────────────────────────────────────────────────
  { route: '/mypage', kind: 'static', auth: 'member', note: '마이페이지(개요 탭)' },

  // ── 관리자 정적 ──────────────────────────────────────────────
  { route: '/admin', kind: 'static', auth: 'admin', note: '관리자 대시보드' },
  { route: '/admin/brands', kind: 'static', auth: 'admin', note: '브랜드 관리 목록' },
  { route: '/admin/categories', kind: 'static', auth: 'admin', note: '카테고리 관리' },
  { route: '/admin/concerns', kind: 'static', auth: 'admin', note: '고민 관리' },
  { route: '/admin/inquiries', kind: 'static', auth: 'admin', note: '상품문의 관리' },
  { route: '/admin/insurance', kind: 'static', auth: 'admin', note: '펫보험 상담 관리 목록' },
  { route: '/admin/insurance-content', kind: 'static', auth: 'admin', note: '보험 동의문서·FAQ 관리' },
  { route: '/admin/kits', kind: 'static', auth: 'admin', note: '케어 키트 관리' },
  { route: '/admin/members', kind: 'static', auth: 'admin', note: '회원 관리 목록' },
  { route: '/admin/notices', kind: 'static', auth: 'admin', note: '공지사항 관리' },
  { route: '/admin/order-policy', kind: 'static', auth: 'admin', note: '주문 정책 관리' },
  { route: '/admin/orders', kind: 'static', auth: 'admin', note: '주문 관리 목록' },
  { route: '/admin/partner-inquiries', kind: 'static', auth: 'admin', note: '제휴 문의 접수함' },
  { route: '/admin/partners', kind: 'static', auth: 'admin', note: 'B2B 제휴 관리' },
  { route: '/admin/products', kind: 'static', auth: 'admin', note: '상품 관리 목록' },
  { route: '/admin/products/display', kind: 'static', auth: 'admin', note: '상품 진열 관리' },
  { route: '/admin/products/new', kind: 'static', auth: 'admin', note: '신규 상품 등록 폼' },
  { route: '/admin/qna', kind: 'static', auth: 'admin', note: 'QnA 게시판 관리' },
  { route: '/admin/reviews', kind: 'static', auth: 'admin', note: '전시 후기 관리' },
  { route: '/admin/settings', kind: 'static', auth: 'admin', note: '사이트 콘텐츠 설정' },
  { route: '/admin/survey', kind: 'static', auth: 'admin', note: '맞춤 진단 설계' },
  { route: '/admin/survey-results', kind: 'static', auth: 'admin', note: '진단 참여 내역' },

  // ── 관리자 동적(관리자 API 로 표본 id 해석) ────────────────────────
  {
    route: '/admin/brands/[id]',
    kind: 'dynamic',
    auth: 'admin',
    paramSource: { from: 'admin-api', endpoint: '/api/admin/brands', listKey: 'brands', idKey: 'id' },
    note: '브랜드 상세 편집',
  },
  {
    route: '/admin/insurance/[id]',
    kind: 'dynamic',
    auth: 'admin',
    paramSource: { from: 'admin-api', endpoint: '/api/admin/insurance', listKey: 'applications', idKey: 'id' },
    note: '보험 상담 상세(목록이 비어 있으면 이유를 알리고 skip)',
  },
  {
    route: '/admin/members/[id]',
    kind: 'dynamic',
    auth: 'admin',
    paramSource: { from: 'admin-api', endpoint: '/api/admin/members', listKey: 'users', idKey: 'id' },
    note: '회원 상세',
  },
  {
    route: '/admin/orders/[id]',
    kind: 'dynamic',
    auth: 'admin',
    paramSource: { from: 'admin-api', endpoint: '/api/admin/orders', listKey: 'orders', idKey: 'id' },
    note: '주문 상세',
  },
  {
    route: '/admin/products/[id]',
    kind: 'dynamic',
    auth: 'admin',
    paramSource: { from: 'admin-api', endpoint: '/api/admin/products', listKey: 'products', idKey: 'id' },
    note: '상품 수정 폼',
  },
  {
    route: '/admin/products/[id]/editor',
    kind: 'dynamic',
    auth: 'admin',
    paramSource: { from: 'admin-api', endpoint: '/api/admin/products', listKey: 'products', idKey: 'id' },
    note: '상품 상세페이지 편집',
  },
];
