-- 페네핏 상세 제목의 영문 텍스트를 제공된 초록색 워드마크 이미지로 교체한다.

update public.brands
set detail = jsonb_set(
  coalesce(detail, '{}'::jsonb),
  '{wordmarkImage}',
  to_jsonb('/brands/penefit-wordmark-green.png'::text),
  true
)
where id = 'b1';
