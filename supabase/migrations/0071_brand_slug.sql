-- 0071_brand_slug.sql
--
-- 배경: 브랜드 공개 URL(/brands/[id])이 지금은 brands.id 그대로('b1'~'b9', 관리자 생성분은
--   'brand_<uuid>')를 노출한다. id는 products.brand_id FK, shipments.brand_id, 주문 items
--   jsonb의 brandId 스냅샷, members.managed_brand_ids 권한 allowlist 등 시스템 전역에서 쓰이는
--   식별자라 값 자체를 바꾸는 건 리스크가 크다. 그래서 id는 그대로 두고, 공개 URL 표시 전용
--   slug 컬럼을 별도로 추가한다.
--
-- slug는 브랜드명에서 자동 발급하되(괄호 안 영문 우선), 이후 브랜드명이 리브랜딩돼도 slug는
--   재생성하지 않는다 — 이미 퍼진 공유링크/SEO 색인이 깨지지 않게 slug는 최초 발급 후 고정하고
--   관리자가 필요할 때만 수동으로 바꾼다.
--
-- 멱등: add column if not exists + 조건부 update이므로 재실행 무해.

alter table public.brands
  add column if not exists slug text;

update public.brands set slug = 'penefit' where id = 'b1' and slug is null;
update public.brands set slug = 'omipro' where id = 'b2' and slug is null;
update public.brands set slug = 'nobledog' where id = 'b3' and slug is null;
update public.brands set slug = 'catcode' where id = 'b4' and slug is null;
update public.brands set slug = 'alloming' where id = 'b5' and slug is null;
-- b6('RE:펫')는 괄호 영문이 없어 자동 규칙(괄호 안 영문 추출)으로 만들 수 없는 예외 — 수동 지정.
update public.brands set slug = 're-pet' where id = 'b6' and slug is null;
update public.brands set slug = 'maison-chouchou' where id = 'b7' and slug is null;
update public.brands set slug = 'charcoal-story' where id = 'b8' and slug is null;
update public.brands set slug = 'sunny-side-up' where id = 'b9' and slug is null;

-- 위 백필 대상에 없는(향후 새로 생기는) 행은 슬러그가 비어 있을 수 있으므로 unique 제약은
-- NULL을 허용한 채로 건다(postgres unique는 NULL 다중 허용) — insertBrand가 항상 slug를
-- 채우도록 애플리케이션 계층에서 보장하고, 이 제약은 중복만 막는다.
create unique index if not exists brands_slug_key on public.brands (slug) where slug is not null;
