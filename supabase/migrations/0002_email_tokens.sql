-- 0002_email_tokens.sql — 이메일 소프트 인증 + 비밀번호 재설정 토큰 (Management API로 1회 실행)
-- 토큰 원본은 메일로만 전달하고 DB에는 SHA-256 해시만 저장한다.

alter table public.members
  add column email_verified boolean not null default false;

create table public.member_tokens (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  kind text not null check (kind in ('verify', 'reset')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index member_tokens_member_idx on public.member_tokens (member_id, kind);

alter table public.member_tokens enable row level security;
-- 정책 없음: 서버(secret key)만 접근.
