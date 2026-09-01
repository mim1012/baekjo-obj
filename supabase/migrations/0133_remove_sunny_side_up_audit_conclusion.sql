-- 써니사이드업 상세 Audit에서 Audit Conclusion 제목과 본문 전체를 제거한다.

update public.brands
set detail = jsonb_set(
  detail,
  '{auditReport}',
  coalesce(detail -> 'auditReport', '{}'::jsonb) - 'auditConclusion',
  true
)
where id = 'b9' and detail ? 'auditReport';
