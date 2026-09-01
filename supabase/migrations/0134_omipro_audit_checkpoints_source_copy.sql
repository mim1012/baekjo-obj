-- 오미프로 상세 Audit의 The Audit Checkpoints만 첨부 PDF의 7개 원문으로 교체한다.
-- 상단 백조오브제 검토 완료의 6개 auditPoints는 변경하지 않는다.

update public.brands
set detail = jsonb_set(
  detail,
  '{auditReport,checkpoints}',
  '["사람이 섭취하는 천연 식품 원료","기호성을 고려한 강아지·고양이용 별도 배합","8년에 걸친 연구 개발","오미자 발효 부산물을 활용한 사료 첨가제 제조방법 등록 특허","미국 FDA 식품시설 등록","중국 MARA 제품 심사 및 수입등록","실제 사용자 검증 완료"]'::jsonb,
  true
)
where id = 'b2' and detail ? 'auditReport';
