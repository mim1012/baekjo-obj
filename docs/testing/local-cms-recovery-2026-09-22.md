# 로컬 CMS 복구 — 2026-09-22

- 증상: `/admin/pages`에서 CMS 목록 조회 실패. `/api/admin/settings/pages` 서버 로그에 `PGRST205`, `public.cms_pages` 테이블 누락이 기록됐다.
- 대상: 개발서버가 사용하는 로컬 Supabase `127.0.0.1:55321`, Docker DB `supabase_db_baekjo-objet-local-auth`. CMS 테이블 두 개가 모두 없는 것을 먼저 확인했다.
- 조치: 저장소의 CMS 마이그레이션 0162~0166을 하나의 트랜잭션으로 적용하고 `public._migrations`에 기록했다. PostgREST 스키마 캐시를 갱신했다. 다른 콘텐츠 테이블 및 원격 DB는 변경하지 않았다.
- 상태: 기본 CMS 페이지 15개가 준비됐다. 기존 공개 콘텐츠를 CMS에 활성화하거나 새 게시물을 게시하지 않았다.
- 검증: 관리자 로그인 후 `/api/members/me`의 `admin/active` 확인. CMS 목록 및 편집 상세 API 15개 모두 200. 390px/1440px 목록에서 편집 링크 각각 15개 확인. 홈 편집기 표시 및 처리되지 않은 브라우저 오류 없음 확인.
- 브라우저 검증 중 인증 이외 쓰기 요청은 차단했다. 저장·게시 CRUD 검증은 수행하지 않았다.
- 화면 증거: `artifacts/mobile-system/cms-restored.png`.
