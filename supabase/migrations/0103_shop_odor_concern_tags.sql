-- 셀렉션 상세 필터의 "냄새" 항목이 실제 탈취 상품과 연결되도록
-- 기존 concernTags를 보존하면서 odor 태그를 추가한다.
update public.products
set detail = jsonb_set(
  coalesce(detail, '{}'::jsonb),
  '{concernTags}',
  coalesce(detail->'concernTags', '[]'::jsonb) || '["odor"]'::jsonb,
  true
)
where id in ('p17', 'p18')
  and not (coalesce(detail->'concernTags', '[]'::jsonb) ? 'odor');
