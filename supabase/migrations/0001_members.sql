-- 0001_members.sql — 베타 회원 테이블 (Supabase SQL Editor에서 1회 실행)
-- 접근 경로: 서버(secret key)만. 클라이언트 직접 접근 없음 → RLS on + 정책 없음.

create extension if not exists citext;

create table public.members (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  name text not null,
  phone text not null default '',
  password_hash text,
  provider text not null default 'email' check (provider in ('email', 'kakao', 'naver')),
  provider_id text,
  pet_type text,
  breed text,
  main_concern text,
  role text not null default 'user' check (role in ('user', 'admin')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  profile_image text,
  created_at timestamptz not null default now()
);

-- 소셜 회원은 (provider, provider_id)가 정체성 키 — 이메일 미제공 카카오 유저도 중복 생성 안 됨
create unique index members_provider_uidx
  on public.members (provider, provider_id)
  where provider_id is not null;

alter table public.members enable row level security;

-- 관리자 승격(가입 후 본인 이메일로 실행):
-- update public.members set role = 'admin' where email = '관리자이메일@example.com';
