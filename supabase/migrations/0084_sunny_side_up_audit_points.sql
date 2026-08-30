-- 써니사이드업 Audit 패널의 최종 검토 항목을 반영한다.

update public.brands
set detail = jsonb_set(
  coalesce(detail, '{}'::jsonb),
  '{auditPoints}',
  '["애니마크 국내 효능 임상시험 자료 확인","미국 CPT 독성학적 안전성 평가 확인","동물실험 대체 세포배양 연구 방식 확인","사람용 제품의 반려동물 안전성 자료 확인","실제 사용자 피드백 확인"]'::jsonb,
  true
)
where id = 'b9';

