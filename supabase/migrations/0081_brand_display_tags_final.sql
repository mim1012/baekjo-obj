-- 브랜드 카드의 운영 태그를 최종 확정값으로 고정한다.
-- 0083/0088에서 일부 브랜드의 displayTags가 반려동물 유형 태그로 덮여
-- 브랜드 목록 카드와 상세 진입 경로가 서로 다르게 보이던 문제를 바로잡는다.

update public.brands
set detail = jsonb_set(
  coalesce(detail, '{}'::jsonb),
  '{displayTags}',
  case id
    when 'b5' then '["그루밍/케어"]'::jsonb
    when 'b2' then '["장/뼈건강"]'::jsonb
    when 'b1' then '["영양/간식"]'::jsonb
    when 'b9' then '["케어/라이프"]'::jsonb
    when 'b8' then '["탈취/위생"]'::jsonb
    when 'b6' then '["펫로스/오브제"]'::jsonb
    when 'b7' then '["의류/패션"]'::jsonb
    else detail -> 'displayTags'
  end,
  true
)
where id in ('b1', 'b2', 'b5', 'b6', 'b7', 'b8', 'b9');

