-- 써니사이드업 브랜드 상세의 관련 고민 설명을 확정 문구로 반영한다.

update public.brands
set detail = jsonb_set(
  coalesce(detail, '{}'::jsonb),
  '{summaryConcernNote}',
  to_jsonb('상처부터 건조함까지 일상 속 피부 관리를 돕습니다.'::text),
  true
)
where id = 'b9';

