-- 브랜드 상세 상단의 카테고리/관련 고민 4개 필드를 사용자 제공 문구 정본과 맞춘다.
-- 공개 페이지는 코드 정본을 우선하지만, 관리자 편집 화면과 API에서도 같은 값이 보이도록
-- detail jsonb를 함께 동기화한다. 각 값은 치환 방식이므로 재실행해도 같은 결과가 된다.

update public.brands
set detail = coalesce(detail, '{}'::jsonb) || jsonb_build_object(
  'summaryCategoryLabel', '푸드 · 영양',
  'summaryCategoryNote', '하나의 선택을 모두에게 권하기보다 다른 원료와 레시피를 고민하며 아이마다 선택할 수 있는 폭을 넓혀갑니다.',
  'summaryConcernLabel', '편식 · 영양 관리',
  'summaryConcernNote', '페네핏은 알레르기나 원료의 차이로 기존 제품을 먹기 어려운 아이를 외면하지 않습니다.'
)
where id = 'b1';

update public.brands
set detail = coalesce(detail, '{}'::jsonb) || jsonb_build_object(
  'summaryCategoryLabel', '푸드 · 영양',
  'summaryCategoryNote', '오랜 연구를 바탕으로 강아지와 고양이의 특성을 고려해 제품을 설계하고, 원료부터 배합과 급여 방식까지 각각의 이유를 두고 있습니다.',
  'summaryConcernLabel', '장 · 뼈 건강',
  'summaryConcernNote', '그 원인을 찾기 위한 연구는 장 건강으로 이어졌고, 이후 뼈 건강과 피부 건강, 면역 기능까지 범위를 넓혀 돼지와 닭을 거쳐 반려동물을 위한 제품으로 이어졌습니다.'
)
where id = 'b2';

update public.brands
set detail = coalesce(detail, '{}'::jsonb) || jsonb_build_object(
  'summaryCategoryLabel', '케어',
  'summaryCategoryNote', '양치가 어려운 아이들도 다양한 방식으로 사용할 수 있는 구강 케어 제품을 소개합니다.',
  'summaryConcernLabel', '구강 · 양치',
  'summaryConcernNote', '향에 민감한 아이를 고려한 무향 설계로 일상적인 구강 관리를 돕습니다.'
)
where id = 'b3';

update public.brands
set detail = coalesce(detail, '{}'::jsonb) || jsonb_build_object(
  'summaryCategoryLabel', '케어 · 라이프',
  'summaryCategoryNote', '털의 특성과 보호자의 손길까지 고려한 그루밍 제품을 소개합니다.',
  'summaryConcernLabel', '그루밍 · 교감',
  'summaryConcernNote', '반려동물의 그루밍 방식을 담은 브러시로 편안한 교감을 돕습니다.'
)
where id = 'b5';

update public.brands
set detail = coalesce(detail, '{}'::jsonb) || jsonb_build_object(
  'summaryCategoryLabel', '펫로스 · 라이프',
  'summaryCategoryNote', '전문적인 제작 기술을 바탕으로 한 아이의 표정과 털색, 무늬와 체형까지 세밀하게 살피며 모든 작품을 직접 제작합니다.',
  'summaryConcernLabel', '펫로스 · 추억',
  'summaryConcernNote', 'RE:펫의 작품을 통해 그리운 아이를 다시 한번 마주하는 기쁨과 위로가 되기를 바랍니다.'
)
where id = 'b6';

update public.brands
set detail = coalesce(detail, '{}'::jsonb) || jsonb_build_object(
  'summaryCategoryLabel', '패션 · 라이프',
  'summaryCategoryNote', '체형과 움직임을 고려해 직접 디자인한 반려견 의류를 소개합니다.',
  'summaryConcernLabel', '체형 · 착용감',
  'summaryConcernNote', '다양한 사이즈와 직접 피팅으로 편안한 옷 선택을 돕습니다.'
)
where id = 'b7';

update public.brands
set detail = coalesce(detail, '{}'::jsonb) || jsonb_build_object(
  'summaryCategoryLabel', '케어 · 라이프',
  'summaryCategoryNote', '숯의 본래 특성을 반려생활에 적용한 제품을 소개합니다.',
  'summaryConcernLabel', '탈취 · 습기',
  'summaryConcernNote', '냄새와 습기를 관리해 쾌적한 생활환경을 돕습니다.'
)
where id = 'b8';

update public.brands
set detail = coalesce(detail, '{}'::jsonb) || jsonb_build_object(
  'summaryCategoryLabel', '케어 · 라이프',
  'summaryCategoryNote', '반려동물을 위한 제품을 만들기 위해 다른 동물에게 고통을 주는 방법은 피하고, 비용과 시간이 더 들더라도 동물실험을 대체하는 연구 방식을 선택합니다.',
  'summaryConcernLabel', '피부 · 데일리케어',
  'summaryConcernNote', '상처부터 건조함까지 일상 속 피부 관리를 돕습니다.'
)
where id = 'b9';
