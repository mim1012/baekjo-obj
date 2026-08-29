-- 메종슈슈 브랜드 상세의 브랜드 스토리 본문과 핵심 항목을 확정한다.

update public.brands
set detail = jsonb_set(
  jsonb_set(
    coalesce(detail, '{}'::jsonb),
    '{philosophy}',
    to_jsonb('메종슈슈는 반려견에게 예쁜 옷을 선물하는 것만큼, 그 옷을 편안하게 입고 움직이는 순간까지 중요하게 생각합니다.

체형과 움직임을 고려해 패턴을 설계하고, 제품에 따라 소재와 신축성을 달리하며 직접 디자인하고 제작합니다.

메종슈슈는 옷을 통해 반려견과 보호자가 감정과 스타일을 함께 나누며, 함께하는 시간이 더 특별해지기를 바랍니다.'::text),
    true
  ),
  '{highlights}',
  '["체형과 움직임을 고려한 패턴 설계","제품 특성에 맞춰 선택한 소재와 신축성"]'::jsonb,
  true
)
where id = 'b7';
