update public.notices_config
set value = jsonb_set(
  value,
  '{items}',
  coalesce(
    (
      select jsonb_agg(entry.item order by entry.ordinality)
      from jsonb_array_elements(value->'items') with ordinality as entry(item, ordinality)
      where entry.item->>'id' <> 'n2'
        and coalesce(entry.item->>'title', '') not ilike '%쿠폰%'
        and coalesce(entry.item->>'content', '') not ilike '%쿠폰%'
        and coalesce(entry.item->>'title', '') not ilike '%첫 구매 고객 무료 배송 혜택%'
    ),
    '[]'::jsonb
  ),
  true
)
where id = 'default'
  and jsonb_typeof(value->'items') = 'array';
