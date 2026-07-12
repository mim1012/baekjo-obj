-- 0015_brand_philosophy.sql — 브랜드 b2·b5 philosophy/description 정정 (SQL Editor / CI 러너)
--
-- 왜: seed 0004b 가 만들어질 때 b2(오미프로)·b5(알로밍)의 philosophy/description 이 정적 정본
--     src/data/brands.ts 와 다른 텍스트로 들어갔다(로고 0014 와 같은 계열의 정적↔DB drift).
--     상세 페이지가 getBrandById(DB)를 읽으므로 그 갈라진 텍스트가 노출됐다. 정본으로 맞춘다.
--     b1/b3/b4 는 DB==정적 이라 미변경. jsonb_set 고정값이라 재실행 안전(idempotent).

update public.brands
set detail = jsonb_set(
  jsonb_set(detail, '{philosophy}', to_jsonb(E'오미프로는 반려동물의 식사 루틴 안에서 냄새 고민을 관리하는 방법을 제안합니다.\n\n제품의 기능과 급여 방법을 명확히 안내하고, 치료를 대신하지 않는 생활 관리의 언어를 지향합니다.'::text)),
  '{description}', to_jsonb(E'반려동물의 체취와 분변 냄새 관리를 위한 기능성 사료형 간식 브랜드'::text))
where id = 'b2';

update public.brands
set detail = jsonb_set(
  jsonb_set(detail, '{philosophy}', to_jsonb(E'알로밍은 브러싱을 단순한 털 관리가 아니라 반려동물과 보호자가 서로를 돌보는 시간으로 바라봅니다.\n\n손에 잡히는 사용감과 모듈 구조를 함께 설계해 매일의 그루밍 루틴을 제안합니다.'::text)),
  '{description}', to_jsonb(E'반려동물과 보호자의 교감을 위한 트루그루밍 브러시 브랜드'::text))
where id = 'b5';
