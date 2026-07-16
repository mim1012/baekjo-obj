-- 0033_price_diagnosis_products_and_hide_unpriced.sql
--
-- 목적: 토스페이먼츠 카드 심사 반려사유 #1(가격 미설정 상품 노출) 해소.
--   "상품 금액 = 결제 금액"을 만족시키기 위해, 가격이 없는 상품을 공개 노출에서 내리되
--   진단(골든#1) 추천 상품은 판매가능하게 남겨 진단 결과가 비지 않게 한다.
--
-- 사용자 결정(2026-07-15): 진단 추천 9개 상품 = p1·p2·p3·p4·p5·p7·p8·p9·p12
--   (= src/data/survey.ts surveyResultRules 의 productIds 합집합)에
--   가격 99,000원 / 재고 999 를 부여한다(플레이스홀더 — 실판매가 확정 시 재조정).
--   그 외 가격 미설정/0원 상품은 is_visible=false 로 내린다.
--
-- 정본 정합(§4 drift 방지): 같은 PR 에서 src/data/products.ts 의 동일 9개 상품
--   price(null→99000)·stock(→999)을 함께 갱신했다. DB 와 정본이 함께 움직인다.
--   (is_visible 은 products.ts 에 필드가 없고 DB 전용 컬럼이므로 여기서만 관장.)
--
-- 멱등: 두 UPDATE 모두 조건부라 재실행 안전.
-- 순서 중요: 먼저 9개에 price>0 을 넣어야, 두 번째 숨김 조건(price null/<=0)에서
--   그 9개가 자동으로 제외된다. (이전 0032_hide_unpriced_products.sql 의 단독 전량 숨김은
--   진단 추천까지 숨겨 골든#1 이 전 경로 추천 0개가 되므로 폐기하고 본 파일로 통합했다.)

-- 1) 진단 추천 9개: 판매가·재고 부여 + 노출 복원
update public.products
set price = 99000,
    stock = 999,
    is_visible = true
where id in ('p1', 'p2', 'p3', 'p4', 'p5', 'p7', 'p8', 'p9', 'p12');

-- 2) 여전히 가격 미설정/0원인 상품은 공개 노출에서 내림
--    (위 9개는 이미 price=99000 이라 이 조건에 걸리지 않는다)
update public.products
set is_visible = false
where price is null
   or price <= 0;
