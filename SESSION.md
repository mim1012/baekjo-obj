# SESSION — 백조오브제(baekjo-obj)

## 목표 (고정)
정적 목/localStorage로 화면과 데이터가 갈라지는 **drift 제거** — 화면은 콘센트(`src/lib/storage.ts`)/DB로만 흐르게(AGENTS.md §4). 각 변경은 **3중 검증 게이트(§8-6: opus + codex + Playwright 프리뷰)** 통과. 브랜치 `integrate/approval-and-design`.

## 현재 상태 (2026-07-12)
- **모든 admin/공개 drift 제거 완료**: 홈·헤더 / P1 members / P2 insurance / P3 settings / CategorySettings / survey / **kits·partners·qna**.
- **mypage 인증 버그 수정**: 로그인 가드(미로그인 → `/login` 리다이렉트 + `return null`, 데이터 flash 없음) + reviews 정적목(`@/data/reviews`)·qna 전역 데이터 노출 제거(opus GREEN). Playwright 미로그인 리다이렉트 검증 **PASS**(실배포, `tests/golden/mypage.spec.ts`).
- Supabase 마이그레이션 **0007~0013 실 DB 적용·검증 완료**(로컬 러너 + CI 자동).
- **CI green 회복**(lint 실패 원인 src 3 errors 수정). 3중 게이트 실효성 실증(Playwright가 category-settings `{}` 버그 포착→수정→재배포 확인).

## 다음 단계 (mim 액션 / 남은 것)
1. ~~GitHub branch protection~~ ✅ **완료(2026-07-12)**: `main`에 PR 필수 + CI(`verify`) required + 리뷰 1 + force-push/삭제 금지. `enforce_admins=false`(mim=admin은 우회 가능 — 엄격 강제 원하면 `gh api`로 true). `integrate/**`는 현재 직접 push 워크플로우라 미보호.
2. **Vercel Deployment Protection** — 현재 검증 위해 **꺼둔 상태**. CI 자동 Playwright 원하면 "Protection Bypass for Automation" secret 발급→`.env.local`/GitHub Secret. 아니면 재활성화.
3. **eslint `.claude/**` ignore 추가** — 로컬 `npm run lint` 3523 errors는 전부 `.claude/worktrees/*/.next` 번들 노이즈(CI 미포함). eslint.config.mjs 수정은 `config-protection` 훅이 막음 → 사용자 직접/훅 우회 필요.
4. **AGENTS.md §4-6 no-restricted-imports 실제 규칙** 추가(문서엔 스니펫 有, eslint.config는 config-protection 훅으로 미반영).

## 결정 기록 (추가만)
- 2026-07-12 브랜드 정적↔DB drift 전수 대조·정정: `0014`(로고)·`0015`(b2·b5 philosophy/description)·`0016`(b2·b3·b5 auditPoints, b2 relatedConcernSlugs) → DB==정본 `src/data/brands.ts` 검증 완료. 정본=static, force-dynamic이라 프리뷰 즉시 반영.
- 2026-07-12 **b4 캣코드 노출 = 숨김 확정**(사용자 결정): 정본 `isVisible:false`대로 `0017`이 DB `is_visible=false` 정정. 제품 미등록 미준비 브랜드라 `/brands` 목록에서 제외. DB 검증 완료(b4만 false).
- 2026-07-12 로드맵(사용자 확인): 제품은 아직 미등록(의도). 공식 바로가기(`officialUrl`/`sourceUrls`)는 **나중에 노출 예정** → 그때 `repo.ts rowToBrand` unpack + DB 시드 함께. `auditGrade`는 DB만 有·뱃지 UI 제거(b99d770)로 화면 무영향(방치).
- 2026-07-12 권한 로드맵: 현재 **회원 + 최고관리자** 2단계 → 추후 **입점 업체 관리자 / B2B 업체 관리자** 역할 추가 예정(RBAC 확장 대비).
- 2026-07-12 서버 컴포넌트/page.tsx wrapper는 storage(클라 fetch 콘센트)가 아니라 `src/lib/*/repo.ts` **직접 호출**(자기 /api 왕복 방지). 홈이 첫 사례.
- 2026-07-12 설정류(settings/category/survey/kits/partners/qna)는 **싱글턴 jsonb config**(`id='default'`, `value {items|...}`) 패턴. 관리자 화면은 **draft 배치 저장**(자동저장 금지 — CategorySettings hard-reload race 교훈).
- 2026-07-12 API route의 `default*Config`는 **non-client 모듈**에 둔다. `'use client'` 모듈에서 서버가 import하면 client-reference proxy → `JSON.stringify` `{}` 버그(category-settings에서 실제 발생, Playwright 포착).
- 2026-07-12 검증 게이트 3중(opus+codex+Playwright) AGENTS.md §8-6 명문화. codex는 `CODEX_HOME="C:\Users\PC_1M\.codex"` 인라인 필요(WSL 경로 오설정).
- 2026-07-12 마이그레이션 CI 자동화 — `scripts/apply-migrations.mjs`(Supabase Management API, UA 필수/Cloudflare 1010, `public._migrations` 추적) + `ci.yml` migrate job(push 한정). GitHub Secret `SUPABASE_URL`/`SUPABASE_ACCESS_TOKEN` 등록됨.

## 파일 흔적 (추가만)
- 커밋(브랜치 `integrate/approval-and-design`): `4f9f1b9` 홈·헤더 / `f0a0eb8` 0원+업체필터 / `040fce0` AGENTS+CI / `ef68b80` P1 members / `c039f7c` P2 insurance / `a906574` CI migrate / `37d0dbd` P3 settings / `d4156e0`·`23189c2` CategorySettings(+fix) / `040cf2f` survey+게이트 / `3281450` lint fix(CI green) / `7f1af3b` category-settings {} fix + Playwright / `d1b2c12` kits/partners/qna / `0ab8ba5` mypage 로그인 가드+하드코딩 제거.
- 마이그레이션: `supabase/migrations/0007_insurance`~`0013_qna_config.sql`(전부 실 DB 적용됨).
- 러너: `scripts/apply-migrations.mjs`. CI: `.github/workflows/ci.yml`(verify+migrate).
- Playwright: `playwright.config.ts`, `tests/golden/{home,shop,diagnosis,insurance}.spec.ts`(프리뷰 4/4 PASS). 프리뷰 URL alias: `baekjo-obj-git-integrate-approval-2df5a8-parkjoonhyuns-projects.vercel.app`.
- 콘센트 추가: `storage.ts`의 getAdminMembers/insurance·survey·kits·partners·qna get/save. repo: `src/lib/{insurance,settings,categorySettings,survey,kits,partners,qna}/`.
- SSOT: `AGENTS.md`(§3 분리기준·데이터오너십 / §4-6 lint강제 / §8-6 검증게이트).
