alter table public.members
  add column if not exists terms_agreed_at timestamptz,
  add column if not exists privacy_agreed_at timestamptz,
  add column if not exists terms_version text,
  add column if not exists privacy_version text;
