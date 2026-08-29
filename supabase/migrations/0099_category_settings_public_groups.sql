update public.category_settings
set value = jsonb_set(
  value,
  '{productCategories}',
  '["식품·영양", "케어", "패션", "펫로스", "라이프"]'::jsonb,
  true
),
updated_at = now()
where id = 'default';
