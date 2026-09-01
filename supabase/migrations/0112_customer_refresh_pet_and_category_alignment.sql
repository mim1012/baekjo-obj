alter table public.products drop constraint if exists products_pet_type_check;

alter table public.products
  add constraint products_pet_type_check
  check (pet_type in ('dog', 'cat', 'small', 'both'));

update public.category_settings
set
  value = jsonb_set(
    value,
    '{productCategories}',
    '["식품·영양", "케어", "패션", "펫로스", "라이프"]'::jsonb,
    true
  ),
  updated_at = now()
where id = 'default';
