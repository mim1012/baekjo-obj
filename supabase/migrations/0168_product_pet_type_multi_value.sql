-- 상품 등록 화면에서 반려동물 항목을 복수 선택할 수 있게 products.pet_type(text) 제약을 완화한다.
-- staging은 이미 옛 0153_product_pet_types_multi_select.sql로 완화되어 있어 이 마이그레이션은
-- no-op이지만, production은 아직 0112_customer_refresh_pet_and_category_alignment.sql의
-- `pet_type in ('dog','cat','small','both')` 제약이 살아 있어 여기서 실제로 완화한다.
-- `drop constraint if exists` 뒤에 재생성하므로 두 환경 모두에서 안전하게 반복 적용된다(idempotent).
-- 단일 선택은 기존 id 문자열, 복수 선택은 JSON 배열 문자열을 같은 text 컬럼에 저장한다
-- (파싱/직렬화는 src/lib/products/petTypes.ts).
alter table public.products
  drop constraint if exists products_pet_type_check;

alter table public.products
  add constraint products_pet_type_check
  check (
    char_length(btrim(pet_type)) between 1 and 3000
  );

comment on column public.products.pet_type is
  '상품 적용 반려동물: 단일 category_settings.petTypes id, legacy both, 또는 복수 id JSON 문자열';
