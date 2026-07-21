update public.brands
set detail = jsonb_set(
  coalesce(detail, '{}'::jsonb),
  '{shipping}',
  coalesce(detail->'shipping', '{}'::jsonb) || '{"carrierLabel":"파스토(팔레트파우더) / 로지플렉스(그 외)","shippingFeeLabel":"3,000원 (도서산간 동일)","extraFeeNotice":"도서산간 추가 배송비 없음"}'::jsonb,
  true
)
where id = 'b1';

update public.brands
set detail = jsonb_set(
  coalesce(detail, '{}'::jsonb),
  '{shipping}',
  coalesce(detail->'shipping', '{}'::jsonb) || '{"carrierLabel":"우체국택배","shippingFeeLabel":"4,000원","extraFeeNotice":"제주 +4,000원 / 도서산간 +5,000원"}'::jsonb,
  true
)
where id = 'b2';

update public.brands
set detail = jsonb_set(
  coalesce(detail, '{}'::jsonb),
  '{shipping}',
  coalesce(detail->'shipping', '{}'::jsonb) || '{"carrierLabel":"롯데택배","shippingFeeLabel":"3,000원","returnPolicy":"단순변심은 상품 수령 후 7일 이내 접수 가능하며 구매자가 반품배송비를 부담합니다. 표시·광고와 상이하거나 계약 내용과 다르게 이행된 경우 상품 수령 후 3개월 이내 또는 그 사실을 안 날로부터 30일 이내 접수할 수 있습니다.","returnExclusions":"반품요청기간이 지난 경우, 구매자 책임으로 상품이 멸실·훼손된 경우, 포장 훼손으로 상품가치가 현저히 상실된 경우, 사용 또는 일부 소비로 상품가치가 감소한 경우, 시간 경과로 재판매가 곤란한 경우에는 교환·반품이 제한됩니다."}'::jsonb,
  true
)
where id = 'b3';

update public.brands
set detail = jsonb_set(
  coalesce(detail, '{}'::jsonb),
  '{shipping}',
  coalesce(detail->'shipping', '{}'::jsonb) || '{"carrierLabel":"CJ대한통운","shippingFeeLabel":"3,000원"}'::jsonb,
  true
)
where id = 'b5';

update public.brands
set detail = jsonb_set(
  coalesce(detail, '{}'::jsonb),
  '{shipping}',
  coalesce(detail->'shipping', '{}'::jsonb) || '{"carrierLabel":"우체국택배","shippingFeeLabel":"무료배송"}'::jsonb,
  true
)
where id = 'b6';

update public.brands
set detail = jsonb_set(
  coalesce(detail, '{}'::jsonb),
  '{shipping}',
  coalesce(detail->'shipping', '{}'::jsonb) || '{"carrierLabel":"GS Postbox","shippingFeeLabel":"5만원 이상 무료배송 / 미만 3,500원"}'::jsonb,
  true
)
where id = 'b7';

update public.brands
set detail = jsonb_set(
  coalesce(detail, '{}'::jsonb),
  '{shipping}',
  coalesce(detail->'shipping', '{}'::jsonb) || '{"carrierLabel":"로젠택배","shippingFeeLabel":"무료배송 (상품가 포함)","returnPolicy":"상품 수령 후 7일 이내에 교환 및 반품 요청이 가능합니다. 교환·반품을 원할 경우 고객센터로 문의해야 하며, 고객 변심으로 인한 교환·반품 배송비는 고객 부담입니다.","returnExclusions":"파손에 대한 교환·반품은 포장 상태가 원래와 동일해야 합니다."}'::jsonb,
  true
)
where id = 'b8';

update public.brands
set detail = jsonb_set(
  coalesce(detail, '{}'::jsonb),
  '{shipping}',
  coalesce(detail->'shipping', '{}'::jsonb) || '{"carrierLabel":"CJ대한통운","shippingFeeLabel":"3,000원 공통"}'::jsonb,
  true
)
where id = 'b9';
