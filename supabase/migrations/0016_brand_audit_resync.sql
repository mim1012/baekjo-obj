-- 0016_brand_audit_resync.sql — b2·b3·b5 auditPoints, b2 relatedConcernSlugs 정본 재정렬
--
-- 왜: 전수 대조(2026-07-12) 결과 seed 0004b 가 정적 정본 src/data/brands.ts 와 아래 필드에서
--     갈라져 있었다(로고 0014·philosophy 0015 와 같은 계열의 정적↔DB drift). 상세/브랜드 페이지가
--     getBrandById(DB)의 auditPoints·relatedConcernSlugs 를 렌더하므로 갈라진 텍스트가 노출됐다.
--     정본으로 맞춘다. b1/b4 표시필드는 이미 일치라 미변경. jsonb 고정값이라 재실행 안전(idempotent).

-- b2 오미프로: auditPoints + relatedConcernSlugs
update public.brands
set detail = jsonb_set(
  jsonb_set(detail, '{auditPoints}', jsonb_build_array(
    '강아지용 OMIPRO-D와 고양이용 OMIPRO-C 라인 구분',
    '사료에 섞거나 간식처럼 급여할 수 있는 형태',
    '체취·분변 냄새 저감 목적의 명확한 제품 방향',
    '기능성 표현은 자료 확인 후 백조오브제 기준으로 검수',
    '수의학적 치료 효능으로 오인되지 않도록 관리 중심 안내'
  )),
  '{relatedConcernSlugs}', jsonb_build_array('digestion', 'skin'))
where id = 'b2';

-- b3 노블독: auditPoints (2·3번째 줄 정정)
update public.brands
set detail = jsonb_set(detail, '{auditPoints}', jsonb_build_array(
  '구강 건강 중심의 명확한 제품 방향',
  '공식 제조·성분·시험 자료 수령 후 입점 검수',
  '구취·프라그 관련 표현은 확인된 근거 범위에서만 사용',
  '보호자가 사용하기 쉬운 스프레이형 제품 구조',
  '직접 분사 또는 물/사료에 섞어 사용할 수 있는 편의성'
))
where id = 'b3';

-- b5 알로밍: auditPoints (전면 정정)
update public.brands
set detail = jsonb_set(detail, '{auditPoints}', jsonb_build_array(
  '강아지·고양이 공용 그루밍 브러시',
  '단모·장모용 모듈 구분',
  '브러싱과 보호자 교감 경험을 함께 고려',
  '국내 브랜드·제조 정보 확인 가능',
  '색상과 모듈을 선택할 수 있는 상품 구조'
))
where id = 'b5';
