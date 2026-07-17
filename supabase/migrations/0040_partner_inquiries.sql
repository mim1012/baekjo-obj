-- 0040_partner_inquiries.sql — B2B 제휴 문의 제출 레코드 테이블 (케어키트 랜딩 폼 → 관리자 접수함)
-- 접근 경로: 서버(secret key)만. 클라이언트 직접 접근 없음 → RLS on + 정책 없음(0007_insurance 와 동일).
-- admin/partners(partners_config, 제휴처 마스터)와는 별개의 누적 테이블 — 혼동 금지.
-- PII(담당자명·연락처·이메일) 저장 — 공개 GET 없음, 관리자 GET/PATCH 만 존재한다.

create table public.partner_inquiries (
  id uuid primary key default gen_random_uuid(),
  company_name text not null default '',
  contact_person text not null default '',
  phone text not null default '',
  email text not null default '',
  partner_type text not null default 'etc',
  message text not null default '',
  status text not null default '접수',
  memo text,
  created_at timestamptz not null default now()
);

alter table public.partner_inquiries enable row level security;
