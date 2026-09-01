-- 챠콜스토리 상세 Audit의 The Audit Checkpoints만 사용자 제공 8개 정본으로 교체한다.

update public.brands
set detail = jsonb_set(
  detail,
  '{auditReport,checkpoints}',
  '["19년에 걸친 숯 연구 및 제품 개발","숯 활용 기술 관련 등록 특허","제품 관련 디자인등록","자체 공장을 기반으로 한 제품 생산","탈취·습기 관리를 위한 숯 적용","차콜프레시 시료의 탈취·항균 시험","기존 숯 제품군의 안전 관련 자료","실제 사용자 검증 완료"]'::jsonb,
  true
)
where id = 'b8' and detail ? 'auditReport';
