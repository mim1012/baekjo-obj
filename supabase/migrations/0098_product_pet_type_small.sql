alter table public.products drop constraint if exists products_pet_type_check;
alter table public.products
  add constraint products_pet_type_check check (pet_type in ('dog', 'cat', 'small', 'both'));
