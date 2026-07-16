-- 0034_shipments.sql — 입점업체(브랜드)별 배송 정보 테이블 (Supabase SQL Editor에서 1회 실행)
-- 접근 경로: 서버(secret key)만. 클라이언트 직접 접근 없음 → RLS on + 정책 없음(0004/0029와 동일 컨벤션).
--
-- 왜: 주문 1건이 여러 입점업체(브랜드)의 상품을 동시에 포함할 수 있다(dashboardStats.ts:148
-- "주문 1건이 여러 브랜드를 포함할 수 있으므로..." — 카트/체크아웃/POST /api/orders 어디에도
-- "한 주문 = 한 브랜드" 제약이 없음을 코드로 확인). 그런데 orders 테이블에는 carrier/tracking_number/
-- delivery_status가 주문당 1세트뿐이라, 업체 A·B·C가 각자 다른 날 다른 택배사로 발송해도 송장을
-- 하나만 기록할 수 있었다. 그래서 (order_id, brand_id) 조합마다 독립된 배송 레코드를 두는 별도
-- 테이블로 분리한다. 대안(items jsonb 블롭 안에 업체별 필드 추가)은 기각 — 여러 업체가 동시에 자기
-- 몫만 갱신하려 해도 items 전체를 read-modify-write 해야 해서 경합(레이스)이 생긴다.
--
-- brand_id는 uuid가 아니라 text — brands.id가 text(0004 참고: 'b1'/'b2' 형식 기존 id를 유지하기 위함).

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  -- brand_id: 이 리포의 관례는 on delete set null(0004_products_brands.sql:17,
  -- 0029_product_reviews_inquiries.sql:16/35)이지만 여기서는 의도적으로 restrict를 쓴다.
  -- shipments는 살아있는 카탈로그 데이터가 아니라 "누가 무엇을 보냈는지"의 배송 이력이다.
  -- set null은 애초 불가능 — brand_id가 not null이고 unique(order_id, brand_id)의 일부라
  -- null로 바뀌면 그 유니크 제약의 의미가 깨진다. cascade는 이력 자체를 조용히 지워버린다.
  -- 그래서 배송 이력이 있는 브랜드는 삭제를 막는다 — 대신 DELETE /api/admin/brands/[id]가
  -- 이 제약 위반(23503)을 감지해 409로 명시 응답한다(brands/repo.ts deleteBrand 참고).
  brand_id text not null references public.brands(id) on delete restrict,
  -- 내부 코드(cj/hanjin/... — src/lib/carriers.ts CARRIER_CODES). 관리자/파트너가 입력하는 조회용 값,
  -- API 연동 없음. tracking_number와 함께 orders.carrier/tracking_number(0022)와 동일한 해제 규칙을
  -- 따른다 — 빈 문자열('')은 "해제" 신호이므로 NULL로 저장한다(repo 레이어에서 강제).
  carrier text,
  tracking_number text,
  delivery_status text not null default '배송전',
  shipped_at timestamptz,
  created_at timestamptz not null default now(),
  -- 지금은 입점업체당 이 주문에 송장 1건만 허용한다. 분할배송(한 업체가 박스를 여러 개로 나눠 보냄)이
  -- 필요해지면 이 제약을 풀고 별도 식별자(예: 박스 번호)를 추가한다.
  unique (order_id, brand_id)
);

-- 주문 상세(관리자·파트너)가 order_id로 그 주문의 모든 업체 배송 정보를 조회한다.
create index shipments_order_id_idx on public.shipments (order_id);

alter table public.shipments enable row level security;
