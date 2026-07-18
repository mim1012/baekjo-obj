-- 0022_product_source_url_backfill.sql
-- 관리자 수정 이력에서 detail.sourceUrl이 유실된 기존 상품의 공식 출처를 정본 기준으로 복구한다.

update public.products
set detail = detail || '{"sourceUrl":"https://penefit.co.kr/product/%ED%8C%94%EB%A0%88%ED%8A%B8%ED%8C%8C%EC%9A%B0%EB%8D%94-20-%EB%A3%A8%ED%8B%B4-%EC%BC%80%EC%96%B4-5%EC%A2%85/90/"}'::jsonb
where id = 'p1';

update public.products
set detail = detail || '{"sourceUrl":"https://penefit.co.kr/product/%ED%8C%94%EB%A0%88%ED%8A%B8%ED%8C%8C%EC%9A%B0%EB%8D%94-20-%EC%98%AC%EC%9D%B8%EC%9B%90-%EC%BC%80%EC%96%B4-%EB%B0%95%EC%8A%A4-%EC%9E%90%EC%82%AC%EB%AA%B0-%EC%A0%84%EC%9A%A9-%EC%A6%9D%EC%A0%95/88/"}'::jsonb
where id = 'p2';

update public.products
set detail = detail || '{"sourceUrl":"https://penefit.co.kr/product/%ED%8C%94%EB%A0%88%ED%8A%B8%ED%8C%8C%EC%9A%B0%EB%8D%94-20-30%EC%9D%BC-%EC%8A%A4%ED%83%80%ED%84%B0-%ED%82%A4%ED%8A%B8-%EB%B2%84%EB%9D%BC%EC%9D%B4%EC%96%B4%ED%8B%B0-%ED%8C%A9-%ED%8F%AC%ED%95%A8/80/"}'::jsonb
where id = 'p3';

update public.products
set detail = detail || '{"sourceUrl":"https://exhi.daara.co.kr/akppe/view.php?idx=308612"}'::jsonb
where id = 'p4';

update public.products
set detail = detail || '{"sourceUrl":"https://www.coupang.com/vp/products/8769224002"}'::jsonb
where id = 'p7';

update public.products
set detail = detail || '{"sourceUrl":"https://alloming.com/shop_view/?idx=13"}'::jsonb
where id = 'p12';
