-- 0085_hwpx_20260821_brand_category_label.sql

-- 왜: HWPX 지시서의 브랜드별 "카테고리" 값 요구를 상세 요약바 라벨 override로 반영한다.
-- detail.summaryCategoryLabel 이 채워지면 /brands/[slug] 상세 페이지의 카테고리 요약바
-- 굵은 라벨이 상품 카테고리 집계 대신 이 값을 우선 노출한다(src/app/brands/[id]/page.tsx).
-- 값이 없는 다른 브랜드는 기존 동작(상품 카테고리 집계 또는 '종합 케어')을 그대로 유지한다.
-- jsonb_set 치환이라 재실행해도 동일 최종값 — 멱등.

-- b3 노블독
update public.brands
set detail = jsonb_set(
      coalesce(detail, '{}'::jsonb),
      '{summaryCategoryLabel}',
      to_jsonb('케어'::text),
      true
    )
where id = 'b3';

-- b5 알로밍
update public.brands
set detail = jsonb_set(
      coalesce(detail, '{}'::jsonb),
      '{summaryCategoryLabel}',
      to_jsonb('케어 · 라이프'::text),
      true
    )
where id = 'b5';
