-- 0152: 현재 고객 홈페이지 상품 카드의 고민 태그/스토어 고민 필터를 관리자에서 관리한다.
-- 초기값은 기존 코드의 표시 이름과 필터 순서를 그대로 옮겨 적용 전후 홈페이지가 달라지지 않는다.

create table if not exists public.product_tags_config (
  id text primary key default 'default',
  value jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.product_tags_config enable row level security;

insert into public.product_tags_config (id, value)
values (
  'default',
  '{"items":[{"slug":"skin","label":"피부","isVisible":true,"showInShopFilter":true},{"slug":"joint","label":"관절","isVisible":true,"showInShopFilter":true},{"slug":"obesity","label":"체중","isVisible":true,"showInShopFilter":true},{"slug":"oral","label":"구강","isVisible":true,"showInShopFilter":true},{"slug":"odor","label":"냄새","isVisible":true,"showInShopFilter":true},{"slug":"tear","label":"눈물","isVisible":true,"showInShopFilter":false},{"slug":"picky","label":"편식","isVisible":true,"showInShopFilter":false},{"slug":"digestion","label":"배변","isVisible":true,"showInShopFilter":false},{"slug":"stress","label":"스트레스","isVisible":true,"showInShopFilter":false},{"slug":"senior","label":"시니어","isVisible":true,"showInShopFilter":false},{"slug":"nutrition","label":"영양","isVisible":true,"showInShopFilter":false},{"slug":"grooming","label":"그루밍","isVisible":true,"showInShopFilter":false},{"slug":"living","label":"생활","isVisible":true,"showInShopFilter":false}],"hiddenSlugs":[]}'::jsonb
)
on conflict (id) do nothing;
