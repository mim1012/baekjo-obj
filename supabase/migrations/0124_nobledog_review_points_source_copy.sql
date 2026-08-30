-- 노블독 상단의 백조오브제 검토 완료 카드는 4개 요약 항목만 표시한다.
-- 상세 Audit의 7개 checkpoints는 0118 정본을 그대로 유지한다.

update public.brands
set detail = jsonb_set(
  coalesce(detail, '{}'::jsonb),
  '{auditPoints}',
  '["동물용의약외품 신고 정보 확인","제품 성분 및 시험성적서 확인","스프레이·칫솔 구조 및 사용 방식 확인","다양한 구강 관리 방식 확인"]'::jsonb,
  true
)
where id = 'b3';
