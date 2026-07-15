-- 0032_hide_unpriced_products.sql — 미가격 상품 스토어 비노출(토스 심사 준비)
--
-- 왜: 토스페이먼츠 카드사 심사는 "상품 금액 = 결제 금액"인, 바로 판매 가능한 상품만 노출되길
--     요구한다(품절·샘플·미가격 상품은 제외). 현재 정본/DB 상품 22개 중 판매가가 있는 건 2개
--     (p15·p21)뿐이고 나머지 20개는 price NULL/0 이라 카드에 0원으로 노출돼 심사 반려 사유가 된다.
--     가격이 정해지지 않은(미정) 상품을 전부 비노출 처리해 심사 신청 조건을 충족한다.
-- 사용자 결정(2026-07-15): "가격 미설정 상품은 숨김" 확정(대표 상품 가격 추가는 별도 진행).
-- 멱등성: 조건부 UPDATE라 재실행 안전. 이후 관리자가 가격을 입력하면 별도로 is_visible=true 로
--         되살린다(가격만으로 자동 복원하지 않는다 — 노출은 관리자 의사결정).
-- 되돌리기: update public.products set is_visible = true where price is not null and price > 0;
--           (단, 원래 의도적으로 숨겼던 상품까지 되살아나므로 일괄 복원은 지양)

update public.products
set is_visible = false
where price is null or price <= 0;
