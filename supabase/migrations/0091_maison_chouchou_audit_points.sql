-- 메종슈슈 Audit 요약 패널의 완료 검토 항목을 확정한다.

update public.brands
set detail = jsonb_set(
  coalesce(detail, '{}'::jsonb),
  '{auditPoints}',
  '["제품별 소재 및 혼용률 확인","사이즈 구성 및 착용 방식 확인","쇼룸·작업실 반려견 직접 피팅 확인","자체 디자인 및 국내 제작 방식 확인"]'::jsonb,
  true
)
where id = 'b7';
