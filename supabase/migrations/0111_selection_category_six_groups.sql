-- 셀렉션 공개 분류를 푸드/영양/케어/패션/펫로스/라이프 6개로 분리한다.
-- 기존 상품 slug는 애플리케이션의 하위 호환 매핑으로 각 공개 분류에 연결한다.
update public.category_settings
set value = jsonb_set(
  value,
  '{productCategories}',
  '["푸드", "영양", "케어", "패션", "펫로스", "라이프"]'::jsonb,
  true
),
updated_at = now()
where id = 'default';

-- 현재 공개 상품도 6개 공개 분류에 맞춘다. lifestyle_category는 기존 세부 맥락을 보존한다.
update public.products
set category = case
      when id in ('p1', 'p2', 'p3', 'p6') then '푸드'
      when id in ('p4', 'p5') then '영양'
      when id in ('p7', 'p8', 'p9', 'p10', 'p11', 'p12', 'p13', 'p14', 'p17', 'p20', 'p21', 'p22') then '케어'
      when id in ('p15', 'p16') then '패션'
      when id = 'p19' then '펫로스'
      when id = 'p18' then '라이프'
      else category
    end,
    category_slug = case
      when id in ('p1', 'p2', 'p3', 'p6') then 'food'
      when id in ('p4', 'p5') then 'nutrition'
      when id in ('p7', 'p8', 'p9', 'p10', 'p11', 'p12', 'p13', 'p14', 'p17', 'p20', 'p21', 'p22') then 'care'
      when id in ('p15', 'p16') then 'fashion'
      when id = 'p19' then 'pet-loss'
      when id = 'p18' then 'life'
      else category_slug
    end
where id in (
  'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11',
  'p12', 'p13', 'p14', 'p15', 'p16', 'p17', 'p18', 'p19', 'p20', 'p21', 'p22'
);
