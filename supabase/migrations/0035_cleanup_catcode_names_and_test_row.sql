-- 0035_cleanup_catcode_names_and_test_row.sql
--
-- 배경: 정본(src/data/*.ts)이 prod 현실을 모른 채 갈라져 있었다(상품 22개 중 21개 drift — detail 포함).
--   사용자 결정(2026-07-16): **prod 가 진실** — 정본을 prod 기준으로 전수 동기화한다.
--   그 동기화가 성립하려면 prod 쪽에도 폐기 브랜드명 잔재 제거·쓰레기 행 제거가 필요해서
--   이 마이그레이션을 둔다. 같은 PR 에서 src/data/products.ts 를 prod 값으로 역기입했다(§4).
--
-- ⚠️ 브랜드명 표기 정규화(detail.brandName 짧은표기 통일)는 이 파일에서 다루지 않는다 —
--    별도 마이그레이션(0036, 다른 작업)에서 다룬다.
--
-- ⚠️ 가격·재고·is_visible 은 이 파일에서 절대 건드리지 않는다 — prod 실판매 데이터다.
--    여기서 바꾸는 건 오직 (a) 상품명 접두어 (b) 테스트 쓰레기 행 제거.
--
-- 멱등: 두 문 전부 조건부/수렴형이라 재실행해도 같은 최종 상태가 된다.

-- (a) 캣코드 3종(p9·p10·p11) 상품명 접두어 교체: '캣코드' → '알로밍'
--     0034 가 brand_id·detail.brandName 은 이미 알로밍(b5)으로 이관했지만 **상품명에는
--     폐기된 브랜드명 '캣코드'가 남아** 있었다(prod 확인: '캣코드 고양이 브러쉬' 등).
--     사용자 결정(2026-07-16): 접두어만 교체하고 뒷부분은 유지한다.
--     세 상품 모두 is_visible=false(0034)라 화면 영향은 없다.
--     replace() 는 이미 교체된 경우 no-op → 재실행 무해.
update public.products
set name = replace(name, '캣코드', '알로밍')
where id in ('p9', 'p10', 'p11')
  and name like '%캣코드%';

-- (b) 관리자 화면에서 생긴 테스트 쓰레기 행 삭제
--     name='1' / 99,000원 / is_visible=false — 실상품이 아니다.
--     id 와 name 을 함께 매치시켜 오삭제를 방지한다. 이미 없으면 no-op → 재실행 무해.
--     정본(products.ts)에는 추가하지 않는다.
delete from public.products
where id = 'product_1296acb7-0bee-41ea-8558-de4da03611f4'
  and name = '1';
