-- 0047_member_wishlist.sql — 회원 관심 상품(찜하기) DB 동기화
-- 접근 경로: 서버(secret key)만. 클라이언트는 /api/wishlist 콘센트만 사용한다.
-- 기존 localStorage['baekjo_wishlist']는 비로그인 fallback으로만 남기고, 로그인 회원의
-- 관심 상품은 member_wishlist가 진실 소스다.

create table public.member_wishlist (
  member_id uuid not null references public.members(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (member_id, product_id)
);

create index member_wishlist_member_created_idx on public.member_wishlist (member_id, created_at desc);
create index member_wishlist_product_id_idx on public.member_wishlist (product_id);

alter table public.member_wishlist enable row level security;
