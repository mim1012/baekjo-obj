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
  -- brand_id: FK를 걸지 않는다. OrderItem.brandId(주문 items jsonb 안의 브랜드 스냅샷)와 동일한
  -- 원칙 — 이 값은 "지금 살아있는 brands 행을 가리키는 참조"가 아니라 주문/배송 시점의 판매자
  -- 스냅샷이다. 브랜드가 삭제되거나 리브랜딩되어도 배송 이력과 송장 등록 능력은 살아있어야 한다.
  -- FK(on delete restrict)를 걸면 반대로 깨진다: 주문 생성 시점엔 shipments 행이 아직 없으므로
  -- 브랜드 삭제가 막히지 않고 그냥 성공한다 — 그런데 나중에 그 브랜드로 귀속된 주문의 송장을
  -- 등록하려 하면 upsertShipment가 FK 위반(23503)으로 영영 실패한다. 즉 restrict는 "삭제를 막는"
  -- 게 아니라 "삭제된 뒤에야 발견되는, 복구 불가능한 쓰기 실패"를 만든다. 쓰기 시점 검증(그 브랜드가
  -- 실존/관리 대상인지)은 DB FK가 아니라 향후 파트너 라우트의 requireBrandScoped가 담당한다
  -- (managedBrandIds에 속하는지 애플리케이션 레벨에서 확인).
  brand_id text not null,
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

-- order_id 단독 인덱스는 만들지 않는다 — unique (order_id, brand_id)가 이미 order_id를 선두
-- 컬럼으로 하는 btree를 만들어주므로 where order_id = ? 조회는 그 인덱스를 그대로 탄다(중복 인덱스 방지).
--
-- brand_id 단독 인덱스: 이 테이블을 만든 이유 그 자체 — 파트너가 자기 브랜드 소유 배송만 조회하는
-- "브랜드별 목록" 패턴이다(products_brand_id_idx@0004, product_inquiries_brand_id_idx@0029와 동일
-- 근거 — products/repo.ts:252,273의 .eq('brand_id', …) 접근 패턴 참고). brand_id는 unique 키에서
-- 선두 컬럼이 아니므로(leftmost prefix 아님) 위 유니크 인덱스로는 이 조회를 못 받는다.
create index shipments_brand_id_idx on public.shipments (brand_id);

alter table public.shipments enable row level security;
