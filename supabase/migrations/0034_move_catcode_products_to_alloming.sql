-- 0034_move_catcode_products_to_alloming.sql
--
-- 배경: '캣코드(b4)'는 실재하지 않는 브랜드다(사용자 확정 2026-07-16 — 브랜드는 페네핏·오미프로·
--   노블독·알로밍·RE:펫·메종슈슈·챠콜스토리·써니사이드업 8종이 전부). 과거에 관리자 화면에서
--   b4 가 삭제됐고, FK 가 `on delete set null`(0004)이라 소속 상품 p9·p10·p11 의 brand_id 가
--   NULL 이 되어 **브랜드 없는 고아 상품**으로 남아 있었다.
--
-- 문제: 0033 이 진단 추천 9개에 가격을 부여하면서 p9('캣코드 고양이 브러쉬')가
--   brand_id NULL 인 채로 99,000원에 공개 노출·판매 상태가 됐다. 주문이 들어오면 배송 주체가
--   없고(브랜드별 택배사 매칭 불가), 상품명에 폐기된 브랜드명이 박혀 있으며 이미지도
--   플레이스홀더 SVG 다.
--
-- 조치(사용자 결정 2026-07-16):
--   1) p9·p10·p11 을 실제 소속인 **알로밍(b5)** 으로 이관한다.
--   2) 세 상품 모두 **노출 보류**(is_visible=false) — 실제 제품명·실사진이 확정될 때까지.
--      (p9 는 0033 이 부여한 price/stock 은 유지하되 노출만 내린다. 확정 시 재노출.)
--   골든#1(진단) 영향: r5(고민없음 → p9·p12) 중 p12 가 남아 추천 카드는 계속 렌더된다.
--
-- 정본 정합(§4): src/data/products.ts 의 p9·p10·p11 brandId/brandName/isVisible,
--   src/data/brands.ts 의 b4 블록 제거, src/data/survey.ts r5 brandIds, src/data/concerns.ts
--   skin/stress/grooming 의 b4 참조를 같은 PR 에서 함께 고쳤다.
--
-- 멱등: 재실행해도 같은 최종 상태로 수렴한다(고정값 SET / 조건부 DELETE).
--   ⚠️ 재실행 시 관리자가 수동 재노출한 p9·p10·p11 을 다시 숨긴다 — 의도된 동작이다
--   (제품명·실사진 확정 전에는 노출 보류가 정책이므로).

-- 1) 캣코드 상품 → 알로밍(b5) 이관 + 노출 보류
--    brand_id 가 NULL(고아)이거나 아직 'b4' 인 경우 모두를 대상으로 한다(환경별 상태 차이 흡수).
update public.products
set brand_id = 'b5',
    is_visible = false
where id in ('p9', 'p10', 'p11');

-- 2) brandName 은 컬럼이 아니라 detail jsonb 안에 산다(0018:29 시드, repo.ts:78 읽기,
--    splitProductInput 의 PRODUCT_COLUMN_MAP 에 없음). 1) 만으로는 DB 에 '캣코드' 가 남아
--    정본(알로밍)과 drift 가 발생한다 — 0033 노출 기간에 p9 를 주문한 고객의 주문내역
--    (includeHidden 경로)에 '캣코드' 가 계속 뜬다.
update public.products
set detail = jsonb_set(coalesce(detail, '{}'::jsonb), '{brandName}', '"알로밍"'::jsonb, true)
where id in ('p9', 'p10', 'p11');

-- 3) survey_config(rules jsonb)에 남은 b4 참조 제거 — r5 recommendation.brandIds = ['b4','b5'].
--    DB 행이 있으면 /api/survey 가 이 값을 쓰므로(없으면 정본 폴백) 정본만 고치면 화면이 안 바뀐다.
--    brandIds 에서 'b4' 만 걸러내고 나머지 순서는 보존한다.
update public.survey_config
set value = jsonb_set(
      value,
      '{rules}',
      (
        select coalesce(jsonb_agg(
                 case
                   when rule -> 'recommendation' -> 'brandIds' ? 'b4'
                   then jsonb_set(
                          rule,
                          '{recommendation,brandIds}',
                          coalesce(
                            (
                              select jsonb_agg(to_jsonb(b) order by ord2)
                              from jsonb_array_elements_text(rule -> 'recommendation' -> 'brandIds')
                                   with ordinality as t2(b, ord2)
                              where b <> 'b4'
                            ),
                            '[]'::jsonb
                          )
                        )
                   else rule
                 end
                 order by ord
               ), '[]'::jsonb)
        from jsonb_array_elements(value -> 'rules') with ordinality as t(rule, ord)
      )
    )
where value ? 'rules'
  and value::text like '%"b4"%';

-- 4) 혹시 남아 있을 수 있는 b4 브랜드 제거(환경에 따라 이미 없을 수 있음 — 조건부라 안전).
--    위 1)에서 상품을 먼저 이관했으므로 FK 로 NULL 이 되는 상품은 없다.
delete from public.brands
where id = 'b4';
