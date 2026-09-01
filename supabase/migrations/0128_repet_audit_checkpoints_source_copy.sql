-- RE:펫 상세 Audit의 The Audit Checkpoints만 사용자 제공 6개 정본으로 교체한다.

update public.brands
set detail = jsonb_set(
  detail,
  '{auditReport,checkpoints}',
  '["직접 펫로스를 경험한 작가의 작업 철학","반려동물 작품 제작 관련 3종 지도사 자격","전 작품 작가 직접 제작","개체별 특징을 구현하는 맞춤 제작","완성 단계에서 보호자 확인 및 수정 요청 반영","실제 작품에서 확인되는 높은 재현도"]'::jsonb,
  true
)
where id = 'b6' and detail ? 'auditReport';
