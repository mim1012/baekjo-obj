-- 상세 Audit의 The Audit Checkpoints를 브랜드별 사용자 제공 정본으로 저장한다.
-- 기존 auditPoints 폴백에 의존하지 않고 상세 리포트 자체에 checkpoints를 보관한다.

update public.brands
set detail = jsonb_set(
  detail,
  '{auditReport,checkpoints}',
  '["사람이 섭취하는 천연 식품 원료","기호성을 고려한 강아지·고양이용 별도 배합","8년에 걸친 연구 개발","오미자 발효 부산물을 활용한 사료 첨가제 제조방법 등록 특허","미국 FDA 식품시설 등록","중국 MARA 제품 심사 및 수입등록","실제 사용자 검증 완료"]'::jsonb,
  true
)
where id = 'b2' and detail ? 'auditReport';

update public.brands
set detail = jsonb_set(
  detail,
  '{auditReport,checkpoints}',
  '["동물용의약외품 신고 정보 확인","제품 성분 및 시험성적서 확인","스프레이·칫솔 구조 및 사용 방식 확인","다양한 구강 관리 방식 확인"]'::jsonb,
  true
)
where id = 'b3' and detail ? 'auditReport';

update public.brands
set detail = jsonb_set(
  detail,
  '{auditReport,checkpoints}',
  '["약 4년에 걸친 연구 및 개발 과정 확인","펫브러시 구조 관련 등록 특허 확인","유아용 식기 등급 실리콘 소재 확인","자체 개발 및 국내 생산 체계 확인","Good Design Korea 은상 수상 내역 확인","Pin-up Design Awards Best of Best 수상 내역 확인"]'::jsonb,
  true
)
where id = 'b5' and detail ? 'auditReport';

update public.brands
set detail = jsonb_set(
  detail,
  '{auditReport,checkpoints}',
  '["작가의 작업 철학 및 전문 자격 확인","개체별 맞춤 제작 기준 확인","작품별 제작 기간 및 직접 제작 여부 확인","완성 단계의 보호자 확인 및 수정 방식 확인","실제 완성 작품의 재현도 확인"]'::jsonb,
  true
)
where id = 'b6' and detail ? 'auditReport';

update public.brands
set detail = jsonb_set(
  detail,
  '{auditReport,checkpoints}',
  '["제품별 소재 및 혼용률 확인","사이즈 구성 및 착용 방식 확인","쇼룸·작업실 반려견 직접 피팅 확인","자체 디자인 및 국내 제작 방식 확인"]'::jsonb,
  true
)
where id = 'b7' and detail ? 'auditReport';

update public.brands
set detail = jsonb_set(
  detail,
  '{auditReport,checkpoints}',
  '["등록 특허 및 지식재산권 자료 확인","자체 공장 및 생산 체계 확인","제품 구조 및 숯 적용 방식 확인","차콜프레시 시료의 탈취·항균 시험 확인","실제 사용자 검증 완료"]'::jsonb,
  true
)
where id = 'b8' and detail ? 'auditReport';

update public.brands
set detail = jsonb_set(
  detail,
  '{auditReport,checkpoints}',
  '["동물의 입장에서 시작하는 브랜드 철학","하나의 메시지로 연결된 제품 설계","동물실험 대체 연구 방식","사람용 제품에도 적용되는 안전 기준","2024 벤처기업부 장관 표창","2023 대한민국 베스트 신상품 대상","2021 와디즈 동물 헬스케어 카테고리 1위","실제 사용자 검증 완료"]'::jsonb,
  true
)
where id = 'b9' and detail ? 'auditReport';
