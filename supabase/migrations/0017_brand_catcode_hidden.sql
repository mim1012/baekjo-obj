-- 0017_brand_catcode_hidden.sql — b4 캣코드 노출(is_visible)을 정본대로 숨김 정정
--
-- 왜: 전수 대조(2026-07-12) 결과 정본 src/data/brands.ts 는 캣코드(b4) isVisible:false(숨김)인데
--     seed 가 DB is_visible=true 로 넣어 /brands 목록에 노출되고 있었다(정적↔DB drift). 캣코드는
--     제품 미등록 미준비 브랜드라 정본대로 숨긴다. 고정값이라 재실행 안전(idempotent).
-- 사용자 결정(2026-07-12): 숨김으로 확정.

update public.brands set is_visible = false where id = 'b4';
