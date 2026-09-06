-- 기존 RE:PET 상품에 화면에 이미 안내하던 주문제작 기준을 구조화한다.
-- 개인정보 사진 보관기간·파기 기준은 관리자 상품 화면에서 실제 운영값으로 최종 확인해야 한다.
update public.products
set detail = jsonb_set(
  coalesce(detail, '{}'::jsonb),
  '{madeToOrderPolicy}',
  jsonb_build_object(
    'active', true,
    'productionPeriod', '제작 일정에 따라 결제 완료 후 최대 3개월',
    'proofMethod', '백조오브제 주문제작 카카오톡 채널로 시안 및 완성 사진 전달',
    'revisionCount', '시안 단계 1회',
    'revisionScope', '시안 배치와 문구 조정. 고객 승인 또는 제작 시작 후 변경 불가',
    'photoPurpose', '주문제작 진행 확인 및 완성품 검수',
    'photoRetentionPeriod', '배송 완료 후 30일',
    'photoDeletionMethod', '보관기간 만료 후 복구할 수 없는 방식으로 삭제',
    'cancellationRestriction', '고객의 시안 승인 또는 제작 시작 후에는 단순 변심 취소가 제한됩니다.',
    'policyVersion', 'made-to-order-2026-09-06'
  ),
  true
)
where brand_id = 'b6';
