-- 0029_product_reviews_inquiries.sql — 상품 구매평/문의 테이블 (Supabase SQL Editor에서 1회 실행)
-- 접근 경로: 서버(secret key)만. 클라이언트 직접 접근 없음 → RLS on + 정책 없음.
-- localStorage 목업(src/lib/storage.ts baekjo_product_reviews/baekjo_product_inquiries)을 대체한다.
-- product_id/brand_id는 products/brands.id가 uuid가 아니라 text이므로(0004) 그대로 text FK.
-- product_id는 on delete restrict — cascade였다면 관리자가 상품을 물리 삭제할 때 그 상품의
-- 구매평/문의 이력이 조용히 통째로 사라진다(codex 지적). 삭제하려면 먼저 리뷰/문의를 정리하거나
-- 상품을 숨김 처리해야 하며, 위반 시 23503을 라우트가 409로 매핑한다(admin/products/[id]/route.ts).

create table public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id text,
  review_target_key text not null unique,
  product_id text not null references public.products(id) on delete restrict,
  brand_id text references public.brands(id) on delete set null,
  rating int not null check (rating between 1 and 5),
  title text,
  content text not null,
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 상품 상세(공개 조회)·마이페이지(내 구매평)가 각각 이 두 인덱스를 탄다.
create index product_reviews_product_id_idx on public.product_reviews (product_id);
create index product_reviews_member_id_idx on public.product_reviews (member_id);

alter table public.product_reviews enable row level security;

create table public.product_inquiries (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  product_id text not null references public.products(id) on delete restrict,
  brand_id text references public.brands(id) on delete set null,
  title text not null,
  content text not null,
  is_secret boolean not null default false,
  status text not null default 'waiting' check (status in ('waiting', 'answered')),
  answer text,
  answered_by text,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 상품 상세(공개 조회)·마이페이지(내 문의)·admin/파트너(브랜드별 목록)가 각각 이 인덱스들을 탄다.
create index product_inquiries_product_id_idx on public.product_inquiries (product_id);
create index product_inquiries_member_id_idx on public.product_inquiries (member_id);
create index product_inquiries_brand_id_idx on public.product_inquiries (brand_id);

alter table public.product_inquiries enable row level security;
