-- 0167: product_tags_config reconcile.
-- staging에는 이미 옛 브랜치의 0152_product_tags_config.sql이 적용되어 테이블이 존재한다
-- (이 develop 계보의 0152는 create_order_with_inventory.sql로 번호가 다른 용도에 재사용됨 —
-- migration-number-duplicates.spec.ts LEGACY_ALLOWLIST 대상이 아니라 서로 다른 브랜치 산물).
-- 그래서 이 파일은 staging에서는 전부 idempotent no-op(테이블 이미 존재, 시드 행 이미 존재)이고,
-- 아직 적용되지 않은 다른 환경(로컬/신규 staging 리셋)에서만 실제로 테이블을 만든다.
-- 운영자가 관리자 화면에서 이미 편집한 값을 이 마이그레이션이 재실행으로 덮어쓰지 않도록
-- 시드는 항상 on conflict (id) do nothing 이다. 이 파일은 단순 DDL/시드이고 애플리케이션 레벨
-- 충돌 판정이 없어 serialization-failure류 SQLSTATE나 PT409 대상도 아니다.

create table if not exists public.product_tags_config (
  id text primary key default 'default',
  value jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.product_tags_config enable row level security;

revoke all on table public.product_tags_config from public, anon, authenticated;
grant all on table public.product_tags_config to service_role;

insert into public.product_tags_config (id, value)
values (
  'default',
  '{"items":[{"slug":"skin","label":"피부","isVisible":true,"showInShopFilter":true},{"slug":"joint","label":"관절","isVisible":true,"showInShopFilter":true},{"slug":"obesity","label":"체중","isVisible":true,"showInShopFilter":true},{"slug":"oral","label":"구강","isVisible":true,"showInShopFilter":true},{"slug":"odor","label":"냄새","isVisible":true,"showInShopFilter":true},{"slug":"tear","label":"눈물","isVisible":true,"showInShopFilter":false},{"slug":"picky","label":"편식","isVisible":true,"showInShopFilter":false},{"slug":"digestion","label":"배변","isVisible":true,"showInShopFilter":false},{"slug":"stress","label":"스트레스","isVisible":true,"showInShopFilter":false},{"slug":"senior","label":"시니어","isVisible":true,"showInShopFilter":false},{"slug":"nutrition","label":"영양","isVisible":true,"showInShopFilter":false},{"slug":"grooming","label":"그루밍","isVisible":true,"showInShopFilter":false},{"slug":"living","label":"생활","isVisible":true,"showInShopFilter":false}],"hiddenSlugs":[]}'::jsonb
)
on conflict (id) do nothing;
