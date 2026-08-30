-- RE:펫 상세 상단의 카테고리와 관련 고민 설명만 사용자 제공 문구로 맞춘다.

update public.brands
set detail = coalesce(detail, '{}'::jsonb) || jsonb_build_object(
  'summaryCategoryLabel', '펫로스 · 라이프',
  'summaryCategoryNote', '한 아이의 특징을 세밀하게 구현한 맞춤 작품을 소개합니다.',
  'summaryConcernLabel', '펫로스 · 추억',
  'summaryConcernNote', '소중한 기억을 오래 곁에 간직할 수 있도록 돕습니다.'
)
where id = 'b6';
