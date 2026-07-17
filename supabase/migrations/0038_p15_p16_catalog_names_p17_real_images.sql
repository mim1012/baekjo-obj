-- 0038: p15/p16 메종슈슈 실판매 카탈로그 정합 + p17 챠콜스토리 실사진 연결 (2026-07-17, mim 승인)
--
-- 배경: p15 '[for ur dog] Bamboo Cardigan' / p16 '메종슈슈 Gold Ops'는 메종슈슈 실판매
-- 카탈로그(Baby-T·Striped·Sage Sweat·Sage T·Signature Overall·Denim Harness·Violet OPS)에
-- 없는 이름이라 실사진을 연결할 수 없었다. 보유 사진 실물 기준으로 상품명을 정정하고
-- SVG 플레이스홀더를 실사진 webp로 교체한다. 사진 파일은 PR #108(p15/p16)·#109(p17)로 배포됨.

update public.products set
  name = '메종슈슈 Sage Sweat',
  detail = jsonb_set(
    jsonb_set(coalesce(detail, '{}'::jsonb), '{image}', '"/products/p15.webp"'),
    '{images}', '["/products/p15.webp", "/products/p15-1.webp"]'::jsonb
  )
where id = 'p15';

update public.products set
  name = '메종슈슈 Violet OPS',
  detail = jsonb_set(
    jsonb_set(coalesce(detail, '{}'::jsonb), '{image}', '"/products/p16.webp"'),
    '{images}', '["/products/p16.webp", "/products/p16-1.webp"]'::jsonb
  )
where id = 'p16';

-- p17: 팩샷 썸네일 + 상세페이지 슬라이스 24장(그레인1 15 + 그레인2 9)을 detailBlocks 로 연결
update public.products set
  detail = jsonb_set(
    jsonb_set(
      jsonb_set(coalesce(detail, '{}'::jsonb), '{image}', '"/products/p17.webp"'),
      '{images}', '["/products/p17.webp"]'::jsonb
    ),
    '{detailBlocks}',
    (
      select jsonb_agg(jsonb_build_object(
        'type', 'image',
        'src', '/products/detail/charcoal-fresh/' || lpad(n::text, 2, '0') || '.webp',
        'alt', '차콜프레시 그레인 상세 ' || n
      ))
      from generate_series(1, 24) as n
    )
  )
where id = 'p17';
