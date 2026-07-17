-- 0041_shipments_confirm_timestamps.sql — 업체별 배송의 배송완료/구매확정 시각 스탬프
--
-- 왜: D-2 결정(2026-07-17) — 구매확정은 "고객 수동 버튼 + 배송완료 후 N일 자동확정" 병행이다.
-- 자동확정 크론(후속 브랜치 be/purchase-confirm-cron)은 delivered_at 기준으로 N일을 계산하므로,
-- 상태 전이가 일어나는 지금 시점부터 스탬프를 쌓기 시작해야 크론 도입 시 과거 데이터가 비지 않는다.
-- shipped_at(0034)과 동일한 원칙 — 시점 판단은 repo가 아니라 호출 라우트가 한다
-- (src/lib/shipments/derive.ts resolveShipmentStamps).
--
-- delivery_status 어휘 확장: '구매확정'은 shipments.delivery_status 에만 존재하는 값이다
-- (SHIPMENT_DELIVERY_STATUSES — src/types/index.ts). orders.delivery_status(주문 단위 레거시)는
-- 기존 4단계(DELIVERY_STATUSES)를 유지한다. CHECK 제약이 없는 text 컬럼이라 DDL 변경은 불필요.

alter table public.shipments
  add column if not exists delivered_at timestamptz,
  add column if not exists confirmed_at timestamptz;
