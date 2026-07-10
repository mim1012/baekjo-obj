-- 0004_products_brands.sql — 상품/브랜드 테이블 (Supabase SQL Editor에서 1회 실행)
-- 접근 경로: 서버(secret key)만. 클라이언트 직접 접근 없음 → RLS on + 정책 없음.
-- id는 uuid가 아니라 text — src/data/brands.ts·src/data/products.ts의 기존 'b1'/'p1' 형식 id를
-- seed 시 그대로 유지하기 위함(§4 콘센트 규칙: 화면이 참조하는 id 값이 바뀌면 안 됨).
-- 필터에 쓰이는 필드만 컬럼으로 두고, 나머지 Product/Brand 필드는 detail jsonb에 통째로 담는다.

create table public.brands (
  id text primary key,
  name text not null,
  is_visible boolean not null default true,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.products (
  id text primary key,
  brand_id text references public.brands(id) on delete set null,
  name text not null,
  price int,
  sale_price int,
  category text not null default '',
  category_slug text,
  lifestyle_category text not null default '',
  pet_type text not null default 'both' check (pet_type in ('dog', 'cat', 'both')),
  stock int not null default 0,
  rating numeric not null default 0,
  review_count int not null default 0,
  is_visible boolean not null default true,
  is_best boolean not null default false,
  is_recommended boolean not null default false,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- listProducts()의 브랜드관/카테고리/펫타입 필터 + 공개 노출 필터가 이 인덱스들을 탄다.
create index products_brand_id_idx on public.products (brand_id);
create index products_category_slug_idx on public.products (category_slug);
create index products_is_visible_idx on public.products (is_visible);

alter table public.brands enable row level security;
alter table public.products enable row level security;
