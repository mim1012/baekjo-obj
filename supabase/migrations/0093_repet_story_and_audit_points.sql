-- RE:펫 브랜드 상세의 스토리와 완료 Audit 요약 항목을 확정한다.

update public.brands
set detail = jsonb_set(
  jsonb_set(
    jsonb_set(
      coalesce(detail, '{}'::jsonb),
      '{philosophy}',
      to_jsonb('RE:펫은 직접 펫로스를 경험한 작가가 그리운 아이의 모습을 다시 마주하고 싶은 마음에서 시작되었습니다.

전문적인 제작 기술을 바탕으로 한 아이의 표정과 털색, 무늬와 체형까지 세밀하게 살피며 모든 작품을 직접 제작합니다.

RE:펫의 작품을 통해 그리운 아이를 다시 한번 마주하는 기쁨과 위로가 되기를 바랍니다.'::text),
      true
    ),
    '{highlights}',
    '["한 아이의 특징을 살리는 개별 맞춤 제작","전 작품 작가가 직접 제작"]'::jsonb,
    true
  ),
  '{auditPoints}',
  '["작가의 작업 철학 및 전문 자격 확인","개체별 맞춤 제작 기준 확인","작품별 제작 기간 및 직접 제작 여부 확인","완성 단계의 보호자 확인 및 수정 방식 확인","실제 완성 작품의 재현도 확인"]'::jsonb,
  true
)
where id = 'b6';
