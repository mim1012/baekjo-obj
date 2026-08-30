-- 메종슈슈 상세 Audit의 The Audit Checkpoints만 사용자 제공 6개 정본으로 교체한다.

update public.brands
set detail = jsonb_set(
  detail,
  '{auditReport,checkpoints}',
  '["반려견의 체형과 움직임을 고려한 의류 설계","제품 특성에 따라 달라지는 소재 구성","활동성을 고려한 신축성 및 패턴 적용","반려견 직접 피팅이 가능한 쇼룸·작업실 운영","착용과 움직임을 고려한 세부 구조","자체 디자인 및 국내 제작"]'::jsonb,
  true
)
where id = 'b7' and detail ? 'auditReport';
