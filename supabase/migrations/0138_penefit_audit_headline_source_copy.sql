-- 페네핏 상세 Audit의 메인 제목만 사용자 제공 문구로 교체한다.

update public.brands
set detail = jsonb_set(
  detail,
  '{auditReport,headline}',
  to_jsonb('성분을 감추지 않는 자신감'::text),
  true
)
where id = 'b1' and detail ? 'auditReport';
