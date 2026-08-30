-- 알로밍 상단의 백조오브제 검토 완료 카드는 6개 요약 항목만 표시한다.
-- 상세 Audit의 11개 checkpoints는 0119 정본을 그대로 유지한다.

update public.brands
set detail = jsonb_set(
  coalesce(detail, '{}'::jsonb),
  '{auditPoints}',
  '["약 4년에 걸친 연구 및 개발 과정 확인","펫브러시 구조 관련 등록 특허 확인","유아용 식기 등급 실리콘 소재 확인","자체 개발 및 국내 생산 체계 확인","Good Design Korea 은상 수상 내역 확인","Pin-up Design Awards Best of Best 수상 내역 확인"]'::jsonb,
  true
)
where id = 'b5';
