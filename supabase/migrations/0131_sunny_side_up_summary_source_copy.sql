-- 써니사이드업 상세 상단의 카테고리와 관련 고민 4개 문구만 사용자 제공 정본으로 맞춘다.

update public.brands
set detail = coalesce(detail, '{}'::jsonb) || jsonb_build_object(
  'summaryCategoryLabel', '케어 · 라이프',
  'summaryCategoryNote', '아이를 위한 케어부터 보호자를 위한 제품까지 소개합니다.',
  'summaryConcernLabel', '피부 · 데일리케어',
  'summaryConcernNote', '상처부터 건조함까지 일상 속 피부 관리를 돕습니다.'
)
where id = 'b9';
