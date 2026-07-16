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
-- ⚠️ 가격·재고·is_visible 은 절대 건드리지 않는다 — prod 실판매 데이터다.
--
-- 멱등: where 절이 조건부라 이미 0 인 행은 대상에서 빠진다 → 재실행 무해.
update public.products
set rating = 0,
    review_count = 0
where (rating is not null and rating <> 0)
   or (review_count is not null and review_count <> 0);
