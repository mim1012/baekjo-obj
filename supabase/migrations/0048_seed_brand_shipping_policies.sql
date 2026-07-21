-- 0048_seed_brand_shipping_policies.sql
--
-- Backfill collected brand-level shipping policies into brands.detail.shipping.
-- Source: docs/brand-shipping-integration-plan.md (2026-07-16 collection notes).
-- Only fields supported by the current BrandShippingPolicy contract are seeded here.
-- Unsupported or unresolved data is intentionally left out:
-- - b1 Fassto/Logiflex are fulfillment operators, not verified tracking carriers.
-- - b2 regional extra fees have no structured field yet.
-- - b8 dispatch estimate has conflicting sources, so it is not customer-seeded.

update public.brands
set detail = jsonb_set(
  coalesce(detail, '{}'::jsonb),
  '{shipping}',
  '{"shippingFee":3000,"dispatchEstimate":"13시 이전 결제 건은 당일 출고, 이후 주문은 다음 영업일 출고됩니다."}'::jsonb,
  true
)
where id = 'b1';

update public.brands
set detail = jsonb_set(
  coalesce(detail, '{}'::jsonb),
  '{shipping}',
  '{"defaultCarrier":"post","shippingFee":4000,"dispatchEstimate":"발주 후 2일 이내 출고됩니다."}'::jsonb,
  true
)
where id = 'b2';

update public.brands
set detail = jsonb_set(
  coalesce(detail, '{}'::jsonb),
  '{shipping}',
  '{"defaultCarrier":"lotte","shippingFee":3000,"returnShippingFee":3000,"exchangeShippingFee":6000,"dispatchEstimate":"평균 1~2일 내 출고됩니다. 공휴일 이후 주문은 다음날부터 1~2일 소요될 수 있습니다.","asNotice":"상품 수령 후 7일 이내 단순변심 교환·반품이 가능하며, 구매자 반품배송비가 부담됩니다. 표시·광고와 상이하거나 계약 내용과 다르게 이행된 경우 상품 수령 후 3개월 이내 또는 그 사실을 안 날로부터 30일 이내 접수할 수 있습니다.","supportContact":"010-3784-6922","supportHours":"10:00~17:00"}'::jsonb,
  true
)
where id = 'b3';

update public.brands
set detail = jsonb_set(
  coalesce(detail, '{}'::jsonb),
  '{shipping}',
  '{"defaultCarrier":"cj","shippingFee":3000,"dispatchEstimate":"12시 이전 결제 건은 당일 출고, 이후 주문은 다음 영업일 출고됩니다."}'::jsonb,
  true
)
where id = 'b5';

update public.brands
set detail = jsonb_set(
  coalesce(detail, '{}'::jsonb),
  '{shipping}',
  '{"defaultCarrier":"post","shippingFee":0,"dispatchEstimate":"제작 시작 후 60일 이내 출고됩니다."}'::jsonb,
  true
)
where id = 'b6';

update public.brands
set detail = jsonb_set(
  coalesce(detail, '{}'::jsonb),
  '{shipping}',
  '{"defaultCarrier":"gspostbox","shippingFee":3500,"freeShippingThreshold":50000,"dispatchEstimate":"일반 상품은 1~4일, 재고 상품은 3~5일, 핸드메이드 상품은 최대 10영업일 내 출고됩니다."}'::jsonb,
  true
)
where id = 'b7';

update public.brands
set detail = jsonb_set(
  coalesce(detail, '{}'::jsonb),
  '{shipping}',
  '{"defaultCarrier":"logen","shippingFee":0,"asNotice":"상품 수령 후 7일 이내 교환 및 반품 요청이 가능합니다. 파손 교환·반품은 포장 상태가 원래와 동일해야 하며, 고객 변심으로 인한 교환·반품 배송비는 고객 부담입니다.","supportContact":"1544-6845","supportHours":"10:00~17:00 (점심 12:00~13:00, 주말·공휴일 휴무)"}'::jsonb,
  true
)
where id = 'b8';

update public.brands
set detail = jsonb_set(
  coalesce(detail, '{}'::jsonb),
  '{shipping}',
  '{"defaultCarrier":"cj","shippingFee":3000,"dispatchEstimate":"13시 이전 결제 건은 당일 출고, 이후 주문은 다음 영업일 출고됩니다."}'::jsonb,
  true
)
where id = 'b9';
