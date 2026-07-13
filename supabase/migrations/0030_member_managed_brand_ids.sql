-- 0030_member_managed_brand_ids.sql — 입점업체(partner) 회원의 브랜드 관리 범위를 DB에 영속화
--
-- 왜: User.managedBrandIds(src/types/index.ts)는 지금까지 목데이터(src/data/users.ts)에만 있고
--     members 테이블에는 컬럼이 없었다. 파트너 상품 CRUD를 API로 연동하려면 "이 파트너가 어느
--     브랜드를 관리하는지"를 서버가 매 요청마다 DB에서 재확인할 수 있어야 한다(requireAdmin과
--     동일하게 JWT 스냅샷이 아니라 DB 재조회로 강등/범위축소를 즉시 반영 — §4).
-- 기본값 '{}': 기존 회원(전부 partner 아님) 영향 없음. 가산적 변경.

alter table public.members
  add column if not exists managed_brand_ids text[] not null default '{}';
