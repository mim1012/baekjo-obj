-- 케어키트 랜딩의 기본 프로젝트 구성을 최신 공개 문안과 맞춘다.
-- 관리자 저장값을 공개 페이지가 우선 읽으므로 기존 싱글턴 행도 함께 갱신한다.

insert into public.kits_config (id, value, updated_at)
values (
  'default',
  jsonb_build_object(
    'items',
    jsonb_build_array(
      jsonb_build_object('id', 'k1', 'name', '웰컴 케어', 'type', 'welcome', 'target', '새로운 환경과 생활을 시작하는 순간', 'location', '파트너 협의', 'items', '[]'::jsonb, 'purpose', '새로운 환경과 생활을 시작하는 순간을 위한 구성을 고민합니다.', 'stock', 0, 'isVisible', true),
      jsonb_build_object('id', 'k2', 'name', '위로 케어', 'type', 'hospital', 'target', '위로와 마음을 전하고 싶은 순간', 'location', '파트너 협의', 'items', '[]'::jsonb, 'purpose', '보호자와 반려동물에게 위로와 마음을 전하고 싶은 순간을 위한 구성을 고민합니다.', 'stock', 0, 'isVisible', true),
      jsonb_build_object('id', 'k3', 'name', '기억 케어', 'type', 'funeral', 'target', '함께한 시간을 기억하고 싶은 순간', 'location', '파트너 협의', 'items', '[]'::jsonb, 'purpose', '함께한 시간을 기억하고 마음을 남길 수 있는 구성을 고민합니다.', 'stock', 0, 'isVisible', true),
      jsonb_build_object('id', 'k4', 'name', '맞춤 케어', 'type', 'sample', 'target', '파트너별 맞춤 프로젝트', 'location', '파트너 협의', 'items', '[]'::jsonb, 'purpose', '파트너의 목적과 대상, 상황에 따라 새로운 케어키트를 함께 기획합니다.', 'stock', 0, 'isVisible', true)
    )
  ),
  now()
)
on conflict (id) do update
set value = jsonb_build_object(
      'items',
      (excluded.value->'items') || coalesce(
        (
          select jsonb_agg(item order by ordinal_position)
          from jsonb_array_elements(kits_config.value->'items') with ordinality as saved(item, ordinal_position)
          where item->>'name' not in ('병원 회복 케어 키트', '시니어 활력 키트')
        ),
        '[]'::jsonb
      )
    ),
    updated_at = excluded.updated_at
where exists (
  select 1
  from jsonb_array_elements(kits_config.value->'items') as saved(item)
  where item->>'name' in ('병원 회복 케어 키트', '시니어 활력 키트')
);
