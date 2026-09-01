begin;

-- 상품 등록 화면에서 관리자 카테고리 설정의 반려동물 항목을 한 개 이상 복수 선택한다.
-- 단일 선택은 기존 id 문자열, 복수 선택은 JSON 문자열을 같은 text 컬럼에 저장한다.
alter table public.products
  drop constraint if exists products_pet_type_check;

alter table public.products
  add constraint products_pet_type_check
  check (
    char_length(btrim(pet_type)) between 1 and 3000
  );

comment on column public.products.pet_type is
  '상품 적용 반려동물: 단일 category_settings.petTypes id, legacy both, 또는 복수 id JSON 문자열';

commit;
