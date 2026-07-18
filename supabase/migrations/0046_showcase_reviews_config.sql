-- 0046_showcase_reviews_config.sql — 전시용 후기(showcase reviews) 싱글턴 테이블
-- (0045 는 main 의 disable_bank_transfer_autocancel 이 선점해 0046 으로 재번호 — §10-8 번호 충돌 방지)
-- 접근 경로: 서버(secret key)만. 클라이언트 직접 접근 없음 → RLS on + 정책 없음.
-- 전시용 후기는 구매 기반 사용자 구매평(product_reviews 테이블, ProductReview 타입)과 별개의
-- 도메인이다 — 공개 후기 목록(/reviews)·홈 후기 레일·브랜드/고민 상세의 후기 섹션에 노출되는
-- 큐레이션 콘텐츠로, 관리자(/admin/reviews)가 등록·수정·삭제한다.
-- 전시 후기 config({ items: Review[] })를 한 행(id='default')에 jsonb 로 통째로 담는다.
-- seed 행은 필요 없다 — repo 가 upsert(id='default') 로 없으면 만들고 있으면 덮는다. 행이 없으면
-- 라우트가 defaultShowcaseReviewsConfig 로 폴백하므로 화면엔 항상 후기 목록이 있다(비어 있을 수도
-- 있다 — 실제 구매평이 쌓인 뒤 관리자가 전시 후기를 전부 지우는 것도 정당한 상태라 empty items 를
-- 허용한다. notices_config 와의 차이점).

create table public.showcase_reviews_config (
  id text primary key default 'default',
  value jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.showcase_reviews_config enable row level security;
