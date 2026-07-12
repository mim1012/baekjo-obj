-- 0007_insurance.sql — 보험 분석 신청 테이블 (Supabase SQL Editor에서 1회 실행)
-- 접근 경로: 서버(secret key)만. 클라이언트 직접 접근 없음 → RLS on + 정책 없음.
-- member_id는 게스트(비로그인) 신청을 허용하므로 null 가능. 회원 탈퇴 시 신청 이력은 남기고 소유자만 끊는다.
-- 핵심 컬럼만 열로 두고, 선택적 긴 꼬리(보장희망·병력·동의 등)는 detail jsonb 한 곳에 모은다
-- (orders.items / members.signup_data 와 동일한 스타일). 화면 타입 InsuranceApplication 은 그대로,
-- repo 의 rowToApplication 이 detail 을 다시 평평한 모양으로 풀어준다(§4 drift 방지).

create table public.insurance_applications (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members(id) on delete set null,
  name text not null default '',
  phone text not null default '',
  pet_name text not null default '',
  pet_type text not null default '',
  pet_age int not null default 0,
  status text not null default '신청완료',
  contacted boolean not null default false,
  memo text,
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- 내 신청 조회(listInsuranceApplicationsByMember)가 member_id로 필터하므로 인덱스를 건다.
create index insurance_applications_member_id_idx on public.insurance_applications (member_id);

alter table public.insurance_applications enable row level security;
