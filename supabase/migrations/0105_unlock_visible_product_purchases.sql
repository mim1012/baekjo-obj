-- 0105: 2026-08-27 공개 상품 구매 제한 해제
-- 고객 화면에 노출 중인 상품은 상품 재고와 모든 옵션 재고를 확보해 카드·상세·장바구니·결제의
-- 동일한 재고 검증을 통과하게 한다. 비공개 상품의 판매 상태는 변경하지 않는다.

update public.products
set
  stock = 999,
  detail = case
    when jsonb_typeof(detail->'options') = 'array' then
      jsonb_set(
        detail,
        '{options}',
        (
          select coalesce(
            jsonb_agg(option_item || jsonb_build_object('stock', 999) order by ordinal_position),
            '[]'::jsonb
          )
          from jsonb_array_elements(detail->'options') with ordinality as options(option_item, ordinal_position)
        )
      )
    else detail
  end
where is_visible = true;
