-- 0037_remove_fake_ratings.sql
--
-- 배경: 초기 시드에 마케팅용 가짜 별점·리뷰수가 박혀 있었다. 실제 리뷰 테이블
--   (product_reviews, 0029)과 아무 관계가 없는 숫자다 — 근거가 되는 리뷰 행이 0건인데
--   상품 카드/상세에는 '4.8 (420)' 같은 표시가 뜬다.
--   prod 확인(2026-07-17): rating<>0 인 상품은 7개(p6·p8·p9·p10·p11·p13·p14)이고
--   전부 is_visible=false 라 지금 화면에는 안 보인다. 다만 **재노출하는 순간 거짓 별점이
--   그대로 뜬다** — 숨김은 해결이 아니라 유예다.
--
-- 사용자 결정(2026-07-17): 실체 없는 표시는 제거한다.
--   실체 없는 수치를 노출하는 건 표시·광고 이슈이자 토스 심사 리스크다. 같은 세션에서
--   "최대 5% 적립"(적립 원장이 없는데 표시되던 문구)을 제거한 것과 동일한 기준을 적용한다.
--   실제 리뷰가 쌓이면 그때 product_reviews 를 집계해 표시한다.
--
-- ⚠️ 왜 id + 기대값으로 이중 한정하나 (2026-07-17, codex 리뷰 HIGH 반영):
--   초안은 `where rating <> 0 or review_count <> 0` 이라는 **조건 기반**이었다. 이 파일은
--   머지 후 CI 가 prod 에 돌린다 — 즉 **감사 시점(2026-07-17)과 적용 시점 사이에 시차**가 있다.
--   그 사이 실제 리뷰가 쌓여 product_reviews 집계로 정상 별점이 채워진 상품이 생기면,
--   조건 기반 update 는 **그 정상 집계값까지 0 으로 파괴**한다. 되돌릴 근거도 남지 않는다.
--   그래서 (a) 감사에서 확인된 id 7개로 대상을 못박고, (b) 그 행의 rating·review_count 가
--   **감사 시점 값과 정확히 일치할 때만** 0 으로 만든다. 값이 바뀌었다 = 그 사이 정당하게
--   갱신됐다는 뜻이므로 **건드리지 않고 그대로 둔다**(그 행은 no-op).
--
-- ⚠️ 가격·재고·is_visible 은 절대 건드리지 않는다 — prod 실판매 데이터다.
--
-- 멱등: 1회차 실행 뒤 대상 행의 값은 (0,0) 이라 기대값과 더는 일치하지 않는다 → 2회차부터 0행 갱신.
--   재실행 무해.
--
-- 타입: rating 은 numeric(0004_products_brands.sql:26), review_count 는 int → 비교값도 맞춰 캐스팅한다.
update public.products p
set rating = 0,
    review_count = 0
from (values
  ('p6',  4.8::numeric, 420::int),
  ('p8',  4.9::numeric, 630::int),
  ('p9',  4.4::numeric,  42::int),
  ('p10', 4.7::numeric, 315::int),
  ('p11', 4.9::numeric, 890::int),
  ('p13', 4.7::numeric,  36::int),
  ('p14', 4.8::numeric,  50::int)
) as expected(id, rating, review_count)
where p.id = expected.id
  and p.rating = expected.rating
  and p.review_count = expected.review_count;
