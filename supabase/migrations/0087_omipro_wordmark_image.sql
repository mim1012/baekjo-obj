-- 오미프로 상세 제목의 영문 워드마크를 제공된 공식형 가로 로고로 교체한다.

update public.brands
set detail = jsonb_set(
  coalesce(detail, '{}'::jsonb),
  '{wordmarkImage}',
  to_jsonb('/brands/omipro-wordmark-red.png'::text),
  true
)
where id = 'b2';
