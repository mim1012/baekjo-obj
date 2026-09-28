-- 0149: 옵션별 재고 필드 제거
-- 재고의 단일 기준은 public.products.stock 이며, detail.options[*].stock 은
-- 옵션 가격/표시 정보와 섞여 남은 레거시 값이다.
-- 기존 옵션의 id·name·price·priceDiff 등은 유지하고 stock 키만 제거한다.

with stripped as (
  select
    p.id,
    jsonb_agg(option_value - 'stock' order by option_ordinality) as options
  from public.products p
  cross join lateral jsonb_array_elements(
    case
      when jsonb_typeof(p.detail -> 'options') = 'array' then p.detail -> 'options'
      else '[]'::jsonb
    end
  )
    with ordinality as option_rows(option_value, option_ordinality)
  where jsonb_typeof(p.detail -> 'options') = 'array'
  group by p.id
)
update public.products p
set detail = jsonb_set(coalesce(p.detail, '{}'::jsonb), '{options}', stripped.options, true)
from stripped
where p.id = stripped.id
  and p.detail -> 'options' is distinct from stripped.options;
