-- 0107: 브랜드/서비스 고객 노출 명칭과 Audit 검토 기준 문구를 통일한다.
-- 사업자등록증상 법적 상호(public.company가 아닌 코드 SSOT)는 변경하지 않는다.

update public.site_settings
set value = jsonb_set(
  jsonb_set(
    value,
    '{hero,descriptionLines}',
    '["좋은 브랜드는 결과입니다. 백조오브제는 그 과정까지 확인합니다."]'::jsonb,
    true
  ),
  '{audit,linkLabel}',
  '"검토 기준 자세히 보기"'::jsonb,
  true
),
updated_at = now()
where id = 'home';
