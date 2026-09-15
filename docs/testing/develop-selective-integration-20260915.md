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
