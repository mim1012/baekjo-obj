-- 0014_brand_logos.sql — 브랜드 로고를 official 로 정정 (Supabase SQL Editor / CI 러너에서 실행)
--
-- 왜: seed 0004b 는 브랜드 로고에 옛 placeholder(.svg, 회색 343B)를 넣었는데, 홈을 DB(listBrands)로
--     연동한 뒤 정적 brands.ts 의 official 로고 대신 그 placeholder 가 노출돼 "로고가 빠진" 것처럼 보였다.
--     정본(src/data/brands.ts)의 official 경로로 DB 를 맞춘다. jsonb_set 고정값이라 재실행 안전(idempotent).
-- 참고: b4 캣코드는 아직 official 로고 파일이 없어 placeholder(catcode.svg) 유지 — 실제 로고 확보 시 별도 정정.

update public.brands set detail = jsonb_set(detail, '{logo}', '"/brands/penefit-official.png"')        where id = 'b1';
update public.brands set detail = jsonb_set(detail, '{logo}', '"/brands/omipro-official.png"')          where id = 'b2';
update public.brands set detail = jsonb_set(detail, '{logo}', '"/brands/nobledog-clean.png"')           where id = 'b3';
update public.brands set detail = jsonb_set(detail, '{logo}', '"/brands/catcode.svg"')                  where id = 'b4';
update public.brands set detail = jsonb_set(detail, '{logo}', '"/brands/alloming-official.png"')        where id = 'b5';
update public.brands set detail = jsonb_set(detail, '{logo}', '"/brands/repet-display.svg"')            where id = 'b6';
update public.brands set detail = jsonb_set(detail, '{logo}', '"/brands/maison-chouchou-official.png"') where id = 'b7';
update public.brands set detail = jsonb_set(detail, '{logo}', '"/brands/charcoal-story-official.png"')  where id = 'b8';
update public.brands set detail = jsonb_set(detail, '{logo}', '"/brands/sunny-side-up-official.png"')   where id = 'b9';
