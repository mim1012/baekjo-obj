update public.notices_config
set value = jsonb_set(
  value,
  '{items}',
  coalesce(
    (
      select jsonb_agg(entry.item order by entry.ordinality)
      from jsonb_array_elements(value->'items') with ordinality as entry(item, ordinality)
      where entry.item->>'id' not in ('n1', 'n3', 'n4', 'n5', 'n6')
    ),
    '[]'::jsonb
  ),
  true
)
where id = 'default'
  and jsonb_typeof(value->'items') = 'array';
