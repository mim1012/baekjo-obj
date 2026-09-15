# Develop 선택 통합 실행 기록

## 승인 범위

PR311/312 전체 CMS(초안/게시/버전 복원), 페이지 소비 연결, 태그/분류/복수 반려동물/이미지 순서/관리 가이드, PR325 요청 승인/반려/완료, PR326 세션 폐기/회원 목록/환불 재시도. Main 배포는 범위 밖이다.

## 고정 기준

- develop: `7a5606a48466b6b38d3b1c861b5dc59d412e8230`
- PR311: `2f3bb07` (`origin/codex/admin-public-site-management-20260901`)
- PR312: `68ce8a7` (`origin/codex/pr311-main-sync-admin-review-v2-20260901`)
- PR325: `b4ee1ae` (`origin/feature/item-cancel-status`)
- PR326: `f7a3bb2` (`origin/be/review-correctness-20260905`)

## 기능 추출

| 영역 | 現 develop | 이식 단위 |
|---|---|---|
| CMS 문구 | page-texts 저장 즉시 반영 | revision 초안/게시/복원 + 게시본 직접 렌더링 |
| CMS DB | 코드에는 미통합, staging에 테이블/게시본 존재 | 기존 구조/이력 보존 및 가산 보정 |
| 태그 | concernTags 기반 | 태그 설정/관리/API/카드/필터 연결 |
| 반려동물 | 단일 petType와 both | 기존 값 호환 복수 선택 |
| 이미지 | 대표/추가 이미지 분리 | 순서 이동과 대표 승격 |
| 취소 요청 | 상품 수량 포함 요청·조회 | 관리자 approve/reject/complete와 수량 집계 |
| 원자 주문 | create_order_with_inventory | 유지 |
| 세션 | 상태 검사 | session version 폐기 |

## 실행 순서와 게이트

1. CMS 기반: 권한, revision 충돌 409, 게시 이력 불변, 복원은 초안만 생성. 담당과 독립 검증자 분리.
2. 페이지 연결: 현재 실제 공개값을 신규 revision으로 이관. 기존 CMS 게시 이력 보존. 전환 영역은 문자열 치환에서 제외. 전체 필드 실제 저장/게시/공개 렌더 왕복.
3. 상품관리: 태그/분류/반려동물/이미지/가이드. 기존 상품 ID/slug/고시/판매자 연결 보존. API read-back과 브라우저 검증.
4. 취소: 옵션 재고, 중복/경합, 미결제 취소, 환불 원장 성공 확인, 판매자 접수/교환반품 상태 보존.
5. 세션/회원/환불: 실제 로그인, 이전 세션 차단, 회원 검색·페이지, 환불 재시도 멱등.
6. 각 단계 develop 대상 PR CI 후 병합. 마지막에 실제 develop 체크아웃 SHA에서 전체 검증.

## 현재 증거

- 2026-09-15 staging ref `aeooyivfijthfcrfrnyk`의 `cms_pages`, `cms_page_versions`, `order_action_request_items` 실제 존재 확인.
- 통합 전 기준 snapshot의 CMS 페이지는 15행: home revision 7, brands revision 10, 나머지 revision 2. 당시 모든 행 draft_revision=published_revision. 아래 import·실제 테스트 이후의 현재 revision을 뜻하지 않는다. 옛 시드의 번호 변경 재실행 금지.
- 기존 관리자 테스트 비밀번호와 해시 불일치 확인. 사용자 승인으로 별도 staging 테스트 관리자 생성.
- 신규 관리자: localhost:3120 실제 비밀번호 로그인 후 /api/members/me HTTP 200, role=admin, status=active, 계정 일치 확인. 토큰 합성 안 함.
- 작업공간 npm ci 완료. 운영 계정·Production 미변경.
- staging Management API 읽기 1회로 기존 `publish_cms_page`가 같은 `(page_key, revision)`의 이력을 `ON CONFLICT DO UPDATE`로 덮어쓰는 것을 확인. 이력을 보존하는 보정 대상이다.
- 같은 조회에서 `supabase_migrations.schema_migrations`의 `version >= '0140'` 결과는 없음. 테이블 존재와 migration 기록을 동일시하지 않는다.
- 저장소 runner를 확인한 뒤 실제 기록표 `public._migrations`를 추가 조회했다. CMS 관련 `0148_cms_page_versions.sql`, `0149_cms_page_catalog.sql`, `0150_cms_concerns_page.sql`, `0151_cms_public_list_pages.sql`, `0154_import_cms_compatibility_rows.sql`은 이미 기록되어 있었다. 이 초기 조회 시점의 최신 기록은 `0161_brand_audit_content_db_seed.sql`이고 `0162`는 미적용이었다. 이후 적용 결과는 아래에 별도 기록한다. CMS 두 테이블의 기존 RLS 정책 조회 결과는 없음.
- `0162_cms_foundation_reconcile.sql`은 staging `public._migrations`에 적용 완료. `applied_at=2026-09-15 07:14:27.957429+00`, hash `65bb5ddb13946620c4a1963cd5c9f8a587d8996b20ec04e9ca1af92e97ef3313`. 이 파일은 적용 후 불변이며, 이후 보정은 새 미사용 additive migration으로만 한다.
- 적용 전후 snapshot: `artifacts/cms-before-integration-20260915.json` → `artifacts/cms-after-foundation-20260915.json` 비교 보고서 `artifacts/cms-foundation-preservation-20260915.json` PASS. pages=15, history=43, settings=2. 기존 page/settings/version hash 변경 없음, archived revision 삭제 없음. additive revision은 허용 범위다.
- SQL transaction rollback 검증 통과: publish revision 2 성공, duplicate publish revision 2는 같은 timestamp로 idempotent, stale revision 1은 SQLSTATE 40001, restore는 draft revision 3만 만들고 publish 전 공개 누출 없음, publish revision 3 성공, original history revision 1은 내용 불변/count 3. 전체 검증은 rollback으로 종료했다.
- 실제 브라우저 로그인 검증: `/api/members/me` HTTP 200, role=admin, status=active, test account 일치. `/admin/pages/audit` HTTP 200, 초기 section input 12개, publish button disabled=true. 공개 페이지 `/audit`에서 pre-import page-texts fallback(`data-audit-content=page-texts`)을 확인했다. 이 data attribute는 페이지 DOM의 증거이며 `/api/content/audit`의 응답 속성이 아니다. 같은 시점 공개 API는 404였다.
- 캡처 산출물: `artifacts/cms-editor-preimport.png`, `artifacts/audit-preimport-desktop.png`, `artifacts/audit-preimport-mobile.png`. main이 두 장을 직접 확인했다.
- 독립 정적 리뷰: foundation은 Locke 검증 7 tests PASS. capture/snapshot 도구는 Bacon 검증 13 tests PASS. 아직 commit SHA가 없어 preflight 성격의 리뷰이며, landing review를 대체하지 않는다.
- 작업 중 `npx tsc --noEmit --pretty false` exit 0. main의 최신 `npx tsc`도 exit 0. 최종 커밋 검증을 대체하지 않는다.
- localhost:3120 실제 무인증 호출: `/api/admin/settings/pages` 401, `/api/admin/settings/pages/audit` 401, `/api/content/audit` 404(게시 marker 없는 기존 CMS가 공개 API로 활성화되지 않는 안전 게이트). 이후 browser login 뒤 audit admin/public pre-import 상태를 확인했다.
- 로컬 서버 메모: Turbopack dev server는 PostCSS child exit 500을 냈고, webpack exec server는 종료됐다. 이후 detached hidden webpack PID 38916이 정상 동작했다. 두 번째 캡처 스크립트는 hydration 전 클릭으로 처음 `/login?` GET 상태에 걸렸고, client `/api/page-texts` 응답을 기다리도록 운용해 실제 UI login이 통과했다. 정확한 root cause는 아직 확정하지 않는다.

## Main 실제 검증 추가 기록: 0163 및 Audit 이관

아래는 Main이 실제 staging 실행 후 전달한 결과다. 이 문서 갱신 작업에서는 DB·서버·import를 재실행하지 않았다.

- `0163_cms_audit_source_guard.sql` staging 적용 완료: `applied_at=2026-09-15 07:45:03.617113+00`, hash `1d6b088e3112cdc6101b6179a9fdf5540422780522ca53ee72be2c5aef4ee71b`. 적용된 0162와 0163은 불변이며 추가 보정은 새 additive migration으로만 한다.
- 실제 SQL transaction rollback 검증 모두 PASS: 원본 JSON 불일치 `40001`, 원본 timestamp 불일치 `40001`, guarded publication 성공, 이미 managed인 Audit 재발행 `40001`, 동일 archived revision에 다른 content 발행 시 `40001`. 충돌 시 원래 archive와 history가 보존됐고, 검증은 rollback으로 종료했다.
- 실제 guarded import command `--apply` 성공. 이관 결과는 Audit **v3**, sourceHash `32e60a70b2a66bba60ef0715e7c8532e22775bf3820a06ce77095a373d8a91c2`. 구조화 데이터 leaf 84개에 기존 legacy 필드 66개의 값을 보존했다. 이 v3는 import 결과이며 후속 테스트 이후 현재 revision을 단정하는 값이 아니다.
- 정확 일치 검증 PASS: 실제 dry payload = import payload = 공개 `/api/content/audit` 응답 content. 공개 API는 HTTP 200, `Cache-Control: no-store`로 확인했다.
- 이관 전후 보존 검증 PASS: 기존 history 43개 모두 보존, 신규 `audit#3`만 추가되어 import 직후 history는 44개. `site_settings`는 변경되지 않았다. 이 count 역시 후속 테스트 이전의 import 직후 snapshot 기준이다.
- 이관 산출물: `artifacts/audit-import-result-20260915.json`, `artifacts/cms-after-audit-import-20260915.json`, `artifacts/cms-audit-import-preservation-20260915.json`.
- 실제 관리자 CMS 목록에서 편집 링크 15개를 관찰했고 해당 브라우저 검사에서 오류가 없었다. 모든 CMS 페이지의 필드별 저장·게시 왕복 완료를 뜻하지 않는다.
- Audit 진행 단계 번호를 `process.items[].number`로 매핑·렌더링하도록 보존했다. 상위 이미지와 목록 항목 이미지 업로더는 `draftId` 대신 `entityId=cms-${pageKey}`를 사용한다. 새 CMS 이미지가 영구 `banners/hero/...` 경로를 사용하도록 하여 초안에서 제거해도 기존 게시본·이력의 파일이 임시 삭제 경로로 지워지지 않게 했다. 이 이미지 보존 계약의 작성자 오프라인 회귀 테스트 3개는 PASS이며, 실제 업로드·삭제 검증을 대신하지 않는다.

## Main 실제 golden foundation 검증

- 저장소 staging runner로 `tests/golden/admin-crud-cms-foundation.spec.ts` 실행. 옵션은 `--project=golden-crud --workers=1 --retries=0 --allow-staging-writes`이며 **1개 PASS, 19.4초**였다.
- 실제 신규 관리자 비밀번호 로그인과 해당 계정의 literal email 일치 검증을 강제했다. 합성 세션을 사용하지 않았다.
- 실제 경로에서 초안 격리, stale revision 409, 발행, PUT으로 이전 게시본을 초안 복원, 재발행, 원래 content 복원까지 PASS했다.
- 테스트 후 현재 Audit revision은 이 문서 갱신 시점에 새로 조회하지 않았으므로 기재하지 않는다. 콘텐츠 복원 성공과 revision 번호 복구는 같은 의미가 아니다.

## 빌드 상태

- 소유한 개발 서버를 중지하고 staging 환경변수와 2048MB heap으로 로컬 `npm run build`를 실행했다.
- 기본 Turbopack 빌드 exit 0: 컴파일 19.7초, TypeScript 18.9초, 정적 페이지 생성 132/132 완료. 배포는 하지 않았다.

## 미완료

CMS foundation 0162/0163 적용·보존 검증, 현재 Audit 데이터의 guarded import·공개 API 활성화, 실제 golden foundation 검증과 로컬 빌드는 위 범위에서 완료됐다. Audit 전체 UI field round-trip, 다른 CMS 페이지의 이관·소비 연결·활성화 검증, tags/categories/petTypes/images/guides의 나머지 범위, cancel/session/refund/member 기능, PR 병합, 최종 통합 테스트는 아직 완료되지 않았다. 이번 부분 검증을 전체 PR311/312 또는 최종 develop 통합 완료로 간주하지 않는다.

## 2026-09-15 후속 (PR1 차단 해소·0164/0165)

> 위 "현재 증거"·"Main 실제 검증 추가 기록: 0163 및 Audit 이관" 절의 `40001` 관련 기술(49행, 62행)은 그 시점(0162/0163 적용 직후) 실제 SQL transaction rollback 테스트 결과이며 삭제하지 않고 그대로 둔다. 다만 0165 적용 이후 **PostgREST 경유 호출의 충돌 계약은 `40001`이 아니라 `PT409`(HTTP 409)** 이다. 아래 4항 참고. `40001`은 코드 상 defensive fallback으로만 남아 있다.

- PR1 리뷰(commit `e3b352b` 기준)에서 차단 사유 확인: B1(일반 publish 경로로 Audit의 initial activation을 우회 가능 — guarded RPC가 draft content를 locked source에 바인딩하지 않음), B2(home 정규화가 image/link/visible/unknown 필드와 빈 배열/추가 배열을 누락), QA(golden CMS spec이 `golden-crud.yml`에 미등록, admin 라우트 3개가 `allAdminApiRoutes.ts`에서 누락).
- commit `260d2a9fd5cef7123d2ebacf43e2f3ac6d062b82`가 위를 수정: 일반 POST와 `publish_cms_page`가 unmanaged page를 거부(409 `initial-import-required`); 신규 5-arg `publish_audit_cms_from_source(p_expected_content)`가 서버에서 파생한 content를 사용(`auditContentFromPageTexts` + normalize; client content는 신뢰하지 않음); `normalize.ts`가 home에도 generic path 적용; 기존 4-arg guard의 `EXECUTE` 권한을 전원에게서 회수; 일반 publish 권한을 `PUBLIC`/`anon`/`authenticated`에서 회수하고 `service_role`에만 부여. 독립 리뷰어(opus lane)가 `260d2a9`에 PASS 판정: tsc 0, `node --test` 33 pass, contract spec 41 passed, coverage gates 35 passed. 보고서는 리뷰 worktree의 `.omx/review-evidence/260d2a9.../review.md`.
- `0164_cms_activation_contract.sql`을 staging `aeooyivfijthfcrfrnyk`에 적용: `applied_at=2026-09-15 09:37:52.926814+00`, hash `4aded7ab39971f11a6664c78495a4c65afef36625d7f71bcf05e9cd59ebcfcf6`, 기록 위치 `public._migrations`. ACL readback: `anon`/`authenticated`는 일반 publish·guard4·guard5 모두 false; `service_role`은 일반 publish와 guard5는 true, guard4는 false. 보존 검증: `artifacts/cms-before-0164-20260915.json` vs `artifacts/cms-after-0164-20260915.json` 비교 PASS(archived content 변경/삭제 없음, pages/settings 변경 없음).
- 실서비스 결함의 root cause 확정(이전까지 미해결이었던 "stale publish timeout"): stale revision으로 `publish_cms_page`를 직접 SQL 호출하면 SQLSTATE `40001`을 835ms에 반환하지만, 동일 호출을 PostgREST `/rest/v1/rpc` 경유로 하면 PostgREST가 `40001`(serialization_failure)을 투명하게 재시도해 30초 이상 hang한다. 수정 commit `2bcd354278245b0a87ad13572f7a86199dcc8aae`: additive `0165_cms_conflict_sqlstate.sql`이 두 publish 함수를 동일 본문으로 재생성하되 애플리케이션 충돌에는 errcode `PT409`(PostgREST 커스텀 HTTP status, 재시도 대상 아님)를 사용하도록 하고 revoke/grant를 재기술; `repo.ts`/`importPublished.ts`는 `PT409`를 매핑(`40001`은 defensive fallback으로 유지). `0165`를 staging에 적용: `applied_at=2026-09-15 10:00:45.475111+00`, hash `38dfdef21f06712fc172f31a92fa7c4c336a1fef7e0d1c3aa0cc03d8abf9fa7f`; ACL readback은 0164 적용 후와 동일. 0165 적용 후: PostgREST 경유 stale publish 호출 → HTTP 409 `{code: PT409, message: cms-revision-conflict}`을 999ms에 반환.
- 자체 webpack dev server(`127.0.0.1:3130`)에서 staging 테스트 관리자(`cms-integration-20260915@example.test`) 실제 비밀번호 로그인으로 라이브 앱 점검 18/18 PASS: anon POST admin publish 401; 공개 `/api/content/audit` 200(no-store); `/api/content/b2b` 404; stale publish 409 `revision-conflict`(409ms); unmanaged b2b publish 409 `initial-import-required`(298ms, RPC 미호출); managed audit의 import-publish 409(449ms); audit draft/published revision 9/9, b2b 2/2 불변. Golden foundation 라이브 테스트(`tests/golden/admin-crud-cms-foundation.spec.ts`, `golden-crud`, 1 worker, 0 retries, staging writes with owned-revision restore) 2회 PASS: 0164 적용 후 58.4초, 0165 적용 후 45.1초. Importer `--apply` 재실행 → status `already-managed`(쓰기 없음). 참고: 이전에 있었던 importer 로그인 실패 2건은 앱 결함이 아니라 PowerShell env-loading 원라이너가 password 값을 훼손한 것이 원인이었고, `.env.test.local` 값을 Node 내부에서 로드해 실행하니 성공했다.
- `2bcd354` 기준 작성자 게이트: `node --test scripts/cms-import/*.test.mjs` 38 pass; contract spec 43 passed; tsc 0; eslint 0 errors(기존 warning 24개 그대로); `npm run lint` 0 errors.
- 하우스키핑: 원본 worktree `D:\Project\BAGJO1`에 경로 실수로 초기 CMS draft가 `codex/main-remove-login-id-link-20260903` 브랜치에 잘못 커밋된 stray commit `f8ff1ae`와 untracked draft 파일들이 있었다. 12개 파일 전부 `D:\Project\_backup\BAGJO1-stray-cms-20260915`에 백업하고 브랜치를 `a929fac`로 리셋(push하지 않음).
- 아직 미완료: `2bcd354`의 delta review 진행 중; PR1은 아직 push/생성되지 않음; PR2(공개 페이지 consumer + admin editor: 미커밋 파일 `src/app/admin/pages/**`, `src/components/admin-new/pages/**`, `src/app/audit/page.tsx`, `PageTextRuntime.tsx`, `PageTextSettingsEditor.tsx`, `tests/products/*`, `tests/golden/admin-crud-cms-audit-fields.spec.ts` + `_lib/cmsAuditFields.ts`, capture 스크립트, security test), PR3(tags/product UI), PR4(cancellation), PR5(session/member/refund)는 전부 PR로 시작되지 않음. 리뷰어의 non-blocking 지적: 0164 적용 후 Audit 외 14개 페이지는 각자 bootstrap/import 경로가 생기기 전까지 게시할 수 없다(PR2 선행 조건).

## 2026-09-15 후속 2 (PR2 공개 페이지 CMS 소비 연결·활성화)

1. PR1 #334가 10:13Z에 develop에 병합됐다(merge commit `3de68e0`). PR2 브랜치 `codex/cms-consumers-20260915` 커밋: `8b51111`(foundation — source mapper registry `src/lib/cms/source/**`, 일반화된 import route `/api/admin/settings/pages/[pageKey]/import`, migration 0166 `publish_cms_page_from_source`가 `PT409` 충돌을 사용, cmsPages tag cache, `PageTextRuntime`을 `[data-cms-managed]`로 일반화, "현재 값 가져오기" 버튼이 있는 `/admin/pages` 목록·에디터, Audit consumer), `5fe98ec`(page consumer 15개 — home, site-shell, b2b, care-kit, concerns, experts, insurance-landing, reviews, notices, brands, shop, terms, privacy, refund-policy; 정의를 오늘 실제 공개 문구로 정정, privacy 16개 조항과 refund 시행일/고객센터 포함; 기존 page-text 에디터는 managed 페이지로 리다이렉트; home 구 에디터는 managed 상태에서 fail-closed; features flag는 read-only), `0c711a8`(import route가 managed/dirty draft를 409로 거부하고 source-bound publish 전에 서버 파생 draft를 먼저 저장하도록 수정; CMS 이미지 src 하드닝 `src/lib/cms/imageSrc.ts` — query/hash/외부 URL은 unoptimized 처리 — 실제 `/audit`가 `next/image` localPatterns로 크래시한 뒤 적용), `55489c3`(string[] content용 `linesArray` textarea 필드; site-shell/refund-policy mapper가 `common.*`/`refundPolicy.*` page-texts override를 적용; 해당 탭 리다이렉트), `347dd9b`(home-settings golden locator 수정).
2. `5fe98ec` 시점 독립 리뷰: FAIL, blocker 3건 — B1(draft를 미리 저장하지 않아 import가 항상 `PT409`), B2(string[] textarea가 빈 값으로 렌더), B3(site-shell/refund-policy가 page-texts override를 무시) — `0c711a8`/`55489c3`에서 수정됐고, `55489c3` 기준 delta 재리뷰는 아직 진행 중이다.
3. Migration `0166_cms_source_bound_activation.sql`을 staging `aeooyivfijthfcrfrnyk`에 적용: `applied_at=2026-09-15 11:22:42.821709+00`, hash `b2feabbe483fcffddf7d35ed0aed0ff56d3746e585380790fec125a37d087991`; ACL은 `anon`/`authenticated` false, `service_role` true. 이 migration은 적용 후 불변이다.
4. 소유한 webpack dev server `127.0.0.1:3130`에서 staging 테스트 관리자(실제 비밀번호 로그인)로 라이브 검증: activation dry-run에서 unmanaged clean 페이지 14개를 확인했고, `--apply`로 14개 전부를 순차 활성화(home 7→8, brands 10→11, 나머지는 2→3; 각 0.8~4.1초; 공개 `/api/content/<key>` 200). 보존 비교 산출물 `artifacts/cms-before-activation-20260915.json` vs `artifacts/cms-after-activation-20260915.json`: status pass, archivedContentChanged 0, deleted 0, additive 21(52→73 versions), site_settings 불변. 공개 라우트 15개 전부 200이고 `data-cms-managed` marker 확인(experts/insurance-landing은 FEATURES gating에 의한 307로 기존과 동일). Audit all-fields golden(`tests/golden/admin-crud-cms-audit-fields.spec.ts`)은 이미지 하드닝 이후 PASS(최초 실행은 query-string sentinel 이미지로 `/audit`가 크래시해 수정 후 재실행); `cms-foundation` golden PASS; `home-settings` golden PASS(managed gating 경로, notice + disabled save).
5. `55489c3` 기준 작성자 게이트: `tsc` 0; `node --test` 49/49; pure playwright products+admin+tracking+security 959 passed; `npm run lint` 0 errors.
6. 참고: 서브에이전트 실행 2건이 API rate limit로 중단됐다가 재개됐다. 이전에 있었던 importer 로그인 실패는 PowerShell env-loading 아티팩트였다(앱 결함 아님). `MobileBottomNav` 하단 라벨은 설계상 여전히 page-text DOM substitution이며 site-shell CMS가 아니다.
7. 아직 미완료: PR2는 아직 push/PR 생성되지 않았다(delta review 대기). PR3(tags/product UI + capture 스크립트 `scripts/capture-*-screen-audit.mjs`, `tests/security/capture-tools-local-safety.spec.ts` 여전히 untracked), PR4(cancellation), PR5(session/member/refund)는 시작되지 않았다. Production 배포 시 0162~0166을 순서대로 적용해야 하고, staging에서 수행한 페이지 14개 활성화는 Production에서 admin "현재 값 가져오기" 버튼으로 재실행해야 한다(staging 활성화는 이전되지 않는다).

## 2026-09-16 후속 4 (PR3 태그·분류·상품 편집·운영 가이드)

브랜치 `codex/product-admin-20260915`(develop e90f2d8 = PR2 #335 머지 기점)에서 태그·분류·반려동물·이미지 순서·관리 가이드 기능을 구현. 커밋 3개:

1. **commit `3b81ee0`** (기능 구현):
   - 태그 사전: `src/lib/productTags` 정의 + `/admin/products/tags`·`/api/admin/product-tags`·`/api/product-tags` + `ProductTagSettingsProvider` → `ProductCard`/`ShopContent` option set 연결
   - 복수 반려동물: `src/lib/products/petTypes.ts`에 multi pet-type 구현, 기존 pet_type text 유지
   - 이미지 순서: `src/lib/products/imageOrder.ts` + ProductForm 에디터
   - 관리 가이드: `/admin/guide` + `src/lib/admin/publicPageRegistry.ts` 링크 → `/admin/pages/<key>`
   - 캡처 도구: `scripts/capture-*-screen-audit.mjs` + `tests/security/capture-tools-local-safety.spec.ts`
   - Migration: `0167_product_tags_config_reconcile.sql`, `0168_product_pet_type_multi_value.sql`

2. **commit `cf0c30a`** (리뷰 수정):
   - 빈 상품용 이미지 업로더 렌더링 (B1 수정)
   - 태그 chip aria-label 추가
   - shared slug rule `isProductTagSlug` 검증·리포·PUT에 일관 적용 (400 invalid-slug)
   - admin 검증에 pet-type ID 허용
   - product detail 관련 concern label을 tag config에서 파생

3. **commit `221d813`** (비파괴 이미지 슬롯 병합):
   - ProductForm.tsx:360 이미지 non-destructive merge
   - legacy concernTags slug rule 위반은 사전 항목으로 승격하지 않음

**규칙 준수**: 공유 파일은 수동 패치만 적용(source branch `origin/codex/admin-public-site-management-20260901`는 분기 계통). develop 전용 기능(판매자 가입·공개·madeToOrderPolicy·ProductComplianceError·commerceReady/summary/판매자 표기·PR2 CMS 레이블)은 독립 리뷰어가 무결성 검증.

**Staging (ref aeooyivfijthfcrfrnyk)**:
- `0167` 적용: 2026-09-15 13:54:39.596188+00, sha256 `a6bf6eda6973d493e026157e296ae8ce4290240c961e4e231d11820c6b5efc0d`
- `0168` 적용: 13:54:40.318678+00, sha256 `ed9fc5312c9d1ee95d98fa1b53c544f8b1434ee6fb2ec51a6272930d7bb0bcb5`
- product_tags_config 기존값 17개(운영자 편집) md5 `31b0ca561ddf16dd0ed88ece3828ae1a` 적용 전후 불변
- ACL anon/authenticated SELECT/UPDATE 취소(이전 true), service_role 유지
- products_pet_type_check constraint 동일(기존 0153에서 이미 완화)
- staging detail.concernTags: 9개 서로 다른 값, 모두 slug rule 만족

**독립 리뷰 (opus lane)**:
- `3b81ee0`: FAIL — B1 신규 상품 이미지 업로드 불가, B2 태그 PUT slug 불일치
- `cf0c30a`: FAIL 유지 — B1 반 수정, B3 legacy slug 승격 신규 발견
- delta `221d813`: 작성 시점 리뷰 대기

**라이브 golden (127.0.0.1:3130, staging 테스트 관리자)**:
- admin-crud-product-tags PASS
- admin-crud-category-settings PASS
- admin-crud-products PASS
- admin-crud-product-gallery-removal PASS
- admin-crud-product-fields 초기 실패 후 spec drift 수정(이전 "베스트 상품"을 645823b에서 "BEST · 자체 큐레이션 표시"로 변경, #305 이후 판매자 dispatchEstimate 표시) → spec 갱신·재실행 중

**순수 게이트 (221d813)**:
- tsc 0, eslint 0, node --test 49/49, playwright products/admin/tracking/security 1069 passed, npm run lint 0 errors

**알려진 staging 잔여물**:
- 숨겨진 테스트 상품 E2E-상품-1784775010078 (2026-07-23) 삭제 불가 (409 product-has-history 설계상) — cleanup 로그 노이즈, 회귀 아님

**미완료**: PR3 미push/미PR 생성; PR4(주문 취소) D:\Project\BAGJO1-pr4-cancellation-20260915에 구현(commit aab98f2, migration 0169–0171 미적용), 독립 리뷰 진행 중; PR5 계획 중.
## 2026-09-15 후속 3 (PR4 상품 수량 기반 취소 처리)

1. 워크트리 `D:\Project\BAGJO1-pr4-cancellation-20260915`, 브랜치 `codex/order-cancellation-20260915`, HEAD `e90f2d8` + 미커밋 U1~U4 작업(`src/lib/orders/actionRequests.ts`·`orderFunnel.ts`·`repo.ts`, `src/types/index.ts`, `src/app/api/admin/orders/[id]/action-requests/route.ts`, `src/app/api/orders/[id]/action-requests/route.ts`, `src/app/api/orders/requests/route.ts`, 관리자 UI, `tests/admin/order-cancel-aggregation.spec.ts`·`order-cancel-sql-contract.spec.ts`·`action-request-routes.spec.ts`, `tests/payments/action-request.db.spec.ts`, `supabase/migrations/0169~0171`). 소스 PR #325 `origin/feature/item-cancel-status`(b4ee1ae) 기능만 이식하며, 기준은 PR3 병합 후 develop이다.
2. 상태 계약 요약("취소 완료는 스스로 재고를 복원하지 않는다"): 결제대기·입금대기는 승인분이 주문 잔여 전량일 때만 완료 처리되고 부분이면 `ACTION_UNPAID_PARTIAL_NOT_SUPPORTED`(PT409)이며, 복원은 자체 로직이 아니라 `cancel_order_reservation_and_restore`(0031)로 위임 호출한다(payment_status CAS로 멱등). 결제완료+payment_key는 라인별 완료 누적이 SUCCEEDED 환불 라인 수량 이내일 때만 `complete_order_refund`(0072)로 완료된다. 결제완료인데 payment_key가 없으면 `ACTION_MANUAL_REFUND_REQUIRED`로 불가 처리한다. 배송비 상한: 전량 완료라도 결제완료+`delivery_fee>0`이고 배송비 환불(`include_delivery_fee`, SUCCEEDED)이 먼저 없으면 `부분취소완료`에서 상한이 걸리고(취소완료 미사용, 0156 cascade 미발동) 이후 배송비 환불은 계속 허용된다. 충돌 SQLSTATE는 PT409(40001 금지), not-found는 P0002다.
3. Migration `0169_order_action_request_items_reconcile.sql`·`0170_order_action_request_contract.sql`·`0171_cancel_settlement_cross_guards.sql`은 **아직 staging에 적용되지 않았다** — 독립 리뷰 후 적용 예정이다. `tests/admin/migration-number-duplicates.spec.ts` 기준으로는 0169~0171이 신규 번호라 `LEGACY_ALLOWLIST` 등록 없이 중복 없이 통과한다(실측 확인, PR3가 develop에 추가할 0167/0168과도 번호 겹침 없음).
4. staging 실측 사실(계획 문서 근거): 옛 PR #325 관련 함수·`order_action_request_items` 테이블·인덱스가 이미 존재하며, 활성(REQUESTED/APPROVED) 중복 행은 없고, 기존 요청 22건/아이템 22건이 확인됐다. 0169는 이 반영 상태를 reconcile하는 형태(create if not exists류)로 설계돼 있다.
5. 이 세션에서 담당한 커버리지 배선: `.github/workflows/golden-crud.yml`의 `GOLDEN_CRUD_SPECS`에 `admin-crud-order-cancellation.spec.ts`를 `admin-crud-order-policy.spec.ts` 앞(주문 관련 스펙 군집 내 알파벳 순)에 추가했다. `GOLDEN_CRUD_API_PATHS`에는 `src/app/api/admin/orders/`가 이미 등록돼 있어 추가 변경이 불필요했다. `tests/golden/_lib/allAdminApiRoutes.ts`에는 `/api/admin/orders/[id]/action-requests`가 이미 등록돼 있고, 실제 `src/app/api/admin/orders/**/route.ts` 파일 목록과 대조해도 신규 admin 라우트 파일은 추가되지 않았음을 확인했다(변경 불필요). `docs/testing/golden-spec-coverage.md`의 관리자 콘솔 공통(2-11) 표에 "상품 수량 기반 취소 승인/반려/완료(PR4)" 행을 추가했다.
6. (기록 시점 미완료였던 게이트 — 아래 7~9항으로 해소) `tests/payments/action-request.db.spec.ts`, 골든 실구동 스펙 `tests/golden/admin-crud-order-cancellation.spec.ts`, 0169~0171·U3 서버 로직 독립 리뷰.
7. 독립 리뷰: 9f65fd1 FAIL 4건(B1 ALL_ORDER_STATUSES 정규화, B2 아이템 임베드 select, B3 잔여수량 max(완료, 환불) 규칙, B4 orders-먼저 잠금 순서+40P01 매핑) → ea40748로 해소, 델타 리뷰 PASS. 이후 워킹트리 변경(승인 요청 반려 버튼·스펙 보정)도 델타 리뷰 PASS(증거 `.omx/review-evidence/ea40748-wt/pr4-delta-review.md`), 비차단 지적 5건(반려 판정 공허·completeRequestRow dialog 리스너 위치·주석 2건·소스 창 여유) 반영.
8. staging 적용(불변): 0169(2026-09-15 15:55:06Z) 0170(15:55:07Z) 0171(15:55:10Z), 활성 unique 인덱스 `order_action_requests_active_brand_uniq (order_id, brand_id)`로 교체, PostgREST 스키마 리로드. 이후 SQL은 0175+(PR5가 0172~0174 사용).
9. 실구동(로컬 3131, staging DB): `tests/payments/action-request.db.spec.ts` **11/11 PASS** — 시나리오 5 픽스처를 실제 순서(요청→승인→SUCCEEDED 환불→완료)로 고쳤고(환불을 요청보다 먼저 심으면 create RPC의 잔여수량 규칙이 정당하게 ACTION_QUANTITY_EXCEEDS_REMAINING으로 거부), 시나리오 7은 라인수량 4/요청 1로 두어 잔여가 남은 상태에서 unique 인덱스 경로(ACTION_REQUEST_ALREADY_EXISTS)를 검증(같은 전량을 두 번 요청하면 뒤 호출이 잔여수량 규칙에 먼저 걸린다). 골든 `admin-crud-order-cancellation.spec.ts` **4/4 PASS(5.2분)**.
10. 골든 실구동에서 드러난 사실과 조치: (a) develop 기존 드리프트 — 645823b 이후 `/api/orders`가 `consents{orderTerms, thirdPartySellerKeys:['seller:<id>'], madeToOrderProductIds}` 없으면 400 consent-required → 골든 헬퍼 `createBankTransferOrder`와 수량 시나리오의 직접 주문 생성에 동의 청구 추가(`admin-crud-order-shipments.spec.ts`도 같은 헬퍼라 함께 고쳐짐). (b) 계약 정합 — 미결제 주문의 부분취소 완료는 계약상 409 ACTION_UNPAID_PARTIAL_NOT_SUPPORTED이므로 테스트 2·3을 "부분취소 유지 + 완료 거부 안내 + 반려 시 주문접수 복귀" 검증으로 재작성(결제완료+payment_key 경로는 Toss 환불이 필요해 db 스펙 시나리오 4·5가 SQL 레벨로 덮음). (c) **UI 공백 수정** — 승인(APPROVED)된 요청에 `반려` 버튼이 없어 미결제 부분취소 승인 후 관리자가 빠져나올 길이 없었음(SQL `transition_action_request`는 APPROVED→REJECTED 허용, 관리자 라우트도 상태 게이트 없음) → `OrderActionRequestsPanel`에 APPROVED 반려(확인창) 노출. (d) 스펙 내성 — 회원 마이페이지 OrdersSection이 마운트 시 회원의 모든 주문(staging E2E 계정 49건)에 대해 action-requests를 병렬 조회해야 "취소·환불 요청 현황"이 렌더되므로, 다른 부하와 겹치면 반복당 5초를 넘겨 헛돌던 폴링의 내부 대기를 15초로 조정(바깥 60초 상한 유지). 같은 머신에서 다른 골든/리뷰를 동시에 돌리면 재현되던 실패가 단독 실행에서 사라졌다.
