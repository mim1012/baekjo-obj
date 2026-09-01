-- 페네핏 상세 상단의 카테고리와 관련 고민 설명만 사용자 제공 문구로 맞춘다.

update public.brands
set detail = coalesce(detail, '{}'::jsonb) || jsonb_build_object(
  'summaryCategoryLabel', '푸드 · 영양',
  'summaryCategoryNote', '반려동물 식품관리사가 직접 설계한 영양 제품을 소개합니다.',
  'summaryConcernLabel', '편식 · 영양 관리',
  'summaryConcernNote', '먹는 즐거움은 지키면서 필요한 영양을 챙길 수 있도록 돕습니다.'
)
where id = 'b1';
