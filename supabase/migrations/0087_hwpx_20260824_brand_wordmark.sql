-- 0087_hwpx_20260824_brand_wordmark.sql

-- 왜: HWPX 지시서 "영어는 아래처럼 색깔 입혀주세요" 반영. 브랜드 상세 h1의 영문 표기를
-- 브랜드 고유 색/로고로 노출한다. 알로밍은 "(ALLOMING)" 영문을 코랄오렌지 텍스트로,
-- 노블독은 제공된 핑크 로고 이미지를 브랜드명 옆에 표시한다.
-- detail.wordmarkColor(hex) / detail.wordmarkImage(경로)를 페이지 h1이 읽어 렌더한다.
-- 값 없는 브랜드는 기존 텍스트 그대로. jsonb_set 치환이라 멱등.

-- b5 알로밍: 영문 텍스트 코랄오렌지(#E67452 — 원본 워드마크 실측색)
update public.brands
set detail = jsonb_set(coalesce(detail, '{}'::jsonb), '{wordmarkColor}', to_jsonb('#E67452'::text), true)
where id = 'b5';

-- b3 노블독: 핑크 로고 이미지(public/brands/nobledog-wordmark-color.png)
update public.brands
set detail = jsonb_set(coalesce(detail, '{}'::jsonb), '{wordmarkImage}', to_jsonb('/brands/nobledog-wordmark-color.png'::text), true)
where id = 'b3';
