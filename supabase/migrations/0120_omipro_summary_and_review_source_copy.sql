-- 오미프로 상세 상단 요약과 백조오브제 검토 완료 항목을 사용자 제공 정본으로 맞춘다.

update public.brands
set detail = jsonb_set(
  jsonb_set(
    coalesce(detail, '{}'::jsonb) || jsonb_build_object(
      'summaryCategoryLabel', '푸드 · 영양',
      'summaryCategoryNote', '냄새 문제에서 시작해 장과 뼈 건강을 고려한 영양 제품을 소개합니다.',
      'summaryConcernLabel', '장 · 뼈 건강',
      'summaryConcernNote', '먹는 영양으로 배변 냄새 관리에 도움을 줍니다.'
    ),
    '{auditPoints}',
    '["8년에 걸친 연구 개발 과정 확인","오미자 발효 부산물 활용 제조방법 등록 특허 확인","강아지·고양이용 별도 배합 설계 확인","뼈 건강 비교 자료 확인","미국 FDA·중국 MARA 등 해외 등록 자료 확인","실제 급여 경험 확인"]'::jsonb,
    true
  ),
  '{auditReport,checkpoints}',
  '["8년에 걸친 연구 개발 과정 확인","오미자 발효 부산물 활용 제조방법 등록 특허 확인","강아지·고양이용 별도 배합 설계 확인","뼈 건강 비교 자료 확인","미국 FDA·중국 MARA 등 해외 등록 자료 확인","실제 급여 경험 확인"]'::jsonb,
  true
)
where id = 'b2';
