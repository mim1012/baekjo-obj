update public.products
set category_slug = 'nutrition',
    lifestyle_category = 'nutrition'
where id = 'p6'
  and category = '영양'
  and category_slug = 'food';

update public.products
set category_slug = 'pet-loss',
    lifestyle_category = 'pet-loss'
where id = 'p20'
  and category = '펫로스'
  and category_slug = 'care';
