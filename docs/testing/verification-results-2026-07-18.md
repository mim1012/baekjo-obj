# 검증 결과 기록 — 2026-07-18 관리자 콘솔 CRUD 실구동 웨이브

> 절차·구조는 [`verification-procedures.md`](./verification-procedures.md) 참조. 이 문서는 append-only
> 성격의 결과 기록이다 — 새 웨이브가 끝나면 위쪽에 누적하고 기존 항목은 지우지 않는다.
> **출처 등급 표기**: `[검증됨]` = 이 세션이 `gh`/`git`/`Read`로 직접 재확인. `[PR 본문 기준]` = PR
> 작성자(같은 파이프라인의 이전 세션)의 자기 보고, 별도 아티팩트로 재확인 못 함. `[세션 기록 기준]` =
> 팀 메모리(대화 기록)에만 존재, GitHub 아티팩트로 재확인 불가.

## Wave 1 — 공지·전시후기 실구동 골든플로우 신설 (PR #143)

| 항목 | 내용 |
|---|---|
| 스펙 | `tests/golden/admin-crud-notices.spec.ts`, `tests/golden/admin-crud-showcase-reviews.spec.ts` |
| 머지 PR | [#143](https://github.com/mim1012/baekjo-obj/pull/143), 2026-07-18T10:44:45Z, merge commit `10810ade` `[검증됨]` |
| 검증 범위 | 공지: 등록(제목·유형·작성자·날짜·본문)→관리자표·공개목록·상세 전 필드 매칭→수정→삭제→새로고침 소멸 확인. 후기: 등록→관리자표·`/reviews`·홈 레일·브랜드 상세·상품 구매평 탭 5면 매칭→숨김→공개 4면 소멸+관리자 '숨김' 표시→삭제 (`[PR 본문 기준]`) |
| 실구동 프리뷰 증거 | 같은 SHA를 대상으로 한 워크플로 실행 `29647374993`에서 "관리자 CRUD — 공지사항" 스텝 21초(14:06:23→14:06:44), "관리자 CRUD — 전시 후기" 스텝 21초(14:06:44→14:07:05), 둘 다 `conclusion: success` `[검증됨, gh api runs/29647374993/jobs]`. ⚠️ 세션 메모리는 "공지 17.5s·후기 21.3s"로 기록했으나 이 세션이 재조회한 값은 각 21초였다 — 다른 실행(수치가 정확히 일치하는 run)을 특정하지 못해 두 수치를 병기한다 |
| 발견 버그 | 홈 "소식" 위젯이 최신순이 아니라 배열 앞 4건 고정 노출 → 신규 공지가 홈에 절대 안 뜸(PR 본문에 명시, 별도 PR로 수정 예정이라고 기록) → **PR #144에서 수정** |
| PR 본문 체크리스트 | `[x]` 로컬 스테이징 실구동 2회 연속 통과 · `[x]` lint 0 errors·tsc clean·tests/admin 214/214 · `[x]` `--list`로 golden-crud 2스펙 격리 확인 · `[ ]` opus 리뷰 **미체크 상태로 머지됨** `[검증됨 — PR 본문 원문]` |

## Wave 2 — 설정형 도메인 확장: concerns·홈문구·보험FAQ·kits/partners (PR #151)

| 항목 | 내용 |
|---|---|
| 스펙 | `admin-crud-concerns.spec.ts`, `admin-crud-home-settings.spec.ts`, `admin-crud-insurance-content.spec.ts`, `admin-crud-kits-partners.spec.ts` (notices 스펙도 함께 보강) |
| 머지 PR | [#151](https://github.com/mim1012/baekjo-obj/pull/151), 2026-07-18T12:15:51Z, merge commit `ed1c7336` `[검증됨]` |
| 검증 패턴 3종(PR 본문 원문) | A(등록형+공개반영): 고민케어(전 필드 매칭→삭제→404), 보험FAQ(법정 동의문 무접촉, DOM 스코프 격리) / B(싱글턴 스냅샷/복원): 홈문구 — 히어로 수정→렌더 확인→**원상복구를 API로 실검증**(afterAll 안전망) / C(관리자 전용 영속성): kits·파트너 — 등록→새로고침 잔존→수정→삭제 |
| 구축 중 발견 사항(PR 본문) | 고민케어·보험FAQ "등록" 버튼 ready 게이트 부재(로드 전 클릭 무음 무시, 스펙은 `waitForResponse`로 우회) → **PR #156에서 제품 수정**. `/concerns` 목록 8+4 슬라이스 고정(12개 초과 시 신규 미노출) — 디자인 의도 여부는 사용자 결정 대기로 남김(2026-07-18 밤 사용자 결정으로 핵심 6개 정리, PR #161) |
| PR 본문 체크리스트 | `[x]` 스테이징 실구동 7/7 × 2회 연속 · `[x]` lint 0 errors·tsc clean·tests/admin 214/214 · `[ ]` opus 리뷰 **미체크 상태로 머지됨** `[검증됨 — PR 본문 원문]` |
| 스펙 정합 후속 수정 | PR #143과 PR #147(공지 폼 3필드 축소)이 교차 머지되며 CRUD 스펙이 제거된 작성자/작성일 입력칸을 fill하다 타임아웃 → **PR #150**이 자동값 검증으로 스펙 갱신 |

## Wave 3 — products·brands·members·qna·survey + 커버리지 감사 신설 (PR #158)

| 항목 | 내용 |
|---|---|
| 스펙 | `admin-crud-products.spec.ts`, `admin-crud-brands.spec.ts`, `admin-crud-members.spec.ts`, `admin-crud-qna-inquiries.spec.ts`, `admin-crud-survey.spec.ts` + **`tests/admin/golden-crud-coverage.spec.ts` 신설**(21도메인 분류 감사) |
| 머지 PR | [#158](https://github.com/mim1012/baekjo-obj/pull/158), 2026-07-18T13:43:52Z, merge commit `bb8c8007` `[검증됨]` |
| 범위 결정 | orders는 명시적으로 범위 밖("안전 설계 전 제외", PR 본문) — 이후 `golden-crud-coverage.spec.ts`의 EXCLUDED 사유와 일치(`[검증됨 — tests/admin/golden-crud-coverage.spec.ts:72-74]`) |
| 도메인별 핵심 발견(PR 본문) | products/brands: 실 이미지 업로드(hidden `input[type=file]`) 실행 확인, 브랜드 가시성 토글 낙관적 UI 레이스·`displayOrder=0` 중복 카드·상품 검색결과 중복 렌더를 `waitForResponse`/`.first()`로 방어 / members: `MemberRoleStatusPanel.tsx:23`의 `canUpdate = isPending && !isAdmin` 단방향 게이트 확인, 실제 상태를 먼저 읽고 pending 아니면 안전하게 skip(강제 조작 안 함) — 이 도메인이 **회원 상세 params-Promise 버그(PR #155)를 발견·검증** / qna-inquiries: `InquiryFormModal.tsx`의 effect deps 불안정 참조로 입력 증발 버그 발견, **PR #157로 수정된 것을 재검증**(회원 작성→관리자 답변→공개 반영→회원 정리 전체 완주) / survey: 첫 문항 title만 편집하는 스냅샷/복원 패턴 |
| 커버리지 감사 결과 | admin API 도메인 21개 = LIVE_COVERED 12 + EXCLUDED 9, 미분류 0(`[검증됨 — tests/admin/golden-crud-coverage.spec.ts:43-89`, 이 세션이 직접 카운트]) |
| PR 본문 체크리스트 | `[x]` build · `[x]` lint 0 errors · `[x]` golden-crud 12/12 그룹 실행(11 pass + members 정상 skip) · `[x]` tests/admin --project=admin 248/248(감사 스펙 포함) · `[x]` `--list` 격리 확인(golden-crud=12, chromium=27, 상호 누출 없음) — **이 웨이브는 세 항목이 아니라 build/lint/e2e 전부 체크된 드문 사례**. opus/codex 개별 체크박스는 본문에 없음 `[검증됨 — PR 본문 원문]` |

## 리뷰 게이트 이력 — opus/codex 검증 체크박스의 실제 상태

이 세션이 재조회 가능한 PR 본문 체크리스트를 직접 대조한 결과, **§8-6 3게이트(opus·codex·Playwright
프리뷰) 전부가 명시 체크된 채 머지된 PR은 표본(#133, #140, #141, #143, #144, #150, #151, #155, #156,
#157, #158, #160 — 12건 확인) 중 하나도 없었다** `[검증됨]`. 대표 사례:

| PR | opus | codex | 프리뷰 실구동 | 비고 |
|---|---|---|---|---|
| #140 (전시후기 DB 이관) | `[x]` GREEN(LOW-1 반영) | `[ ]` 후속 | `[ ]` 후속 | opus만 명시 통과 |
| #141 (즉시저장 전환) | `[x]` 조건부 통과→수정 반영 | `[ ]` 후속 | (본문에 항목 없음) | |
| #133 (429 재시도 수정) | (본문에 항목 없음) | (본문에 항목 없음) | `[ ]` payments-routes 잡 그린 대기 | 검증 항목 자체가 CI 통과 여부 |
| #157 (모달 입력 증발 수정) | `[ ]` "진행 중(GREEN 후 auto-merge)" | (없음) | (없음) | 머지 시점 opus 미확정 표기 |

`gh api repos/mim1012/baekjo-obj/pulls/141/reviews`·`/issues/141/comments` 조회 결과 사람/봇 포멀 리뷰
코멘트는 vercel[bot]·coderabbitai[bot](rate-limit 안내)뿐, opus·codex 리뷰 판정이 게시된 코멘트는
**발견되지 않았다** `[검증됨]`. 즉 opus/codex 리뷰 결론은 GitHub에 남는 아티팩트가 아니라 **PR 작성
세션이 본문에 자기 기록한 요약**이며, 이 문서가 인용하는 opus/codex 판정은 전부 `[PR 본문 기준]` 또는
`[세션 기록 기준]`이지 `[검증됨]`이 아니다.

### 잡힌 결함 사례 (PR 본문에서 확인 가능한 것)

- **PR #140 opus LOW-1**: "관리자 미리보기에서 숨김 후기 노출" → 본문에 "수정 반영" 명시 `[PR 본문 기준]`
- **PR #141 opus MEDIUM-1/2, LOW-1/2**: `persistedItemsRef` 기준 저장(미저장 초안 동반 삭제 방지),
  kits/partners `loaded`/`ready` 게이팅(로드 경합 시 기본값 덮어쓰기 방지) — 전량 수정 반영 명시
  `[PR 본문 기준]`
- **codex HIGH — 삭제 항목 부활 레이스**: "busyRef 하나로 등록·수정·삭제 상호배제 — 동시 PUT 레이스로
  삭제 항목 부활 방지 (codex HIGH — opus가 놓친 걸 codex가 잡음, 교차검증 실증 사례)" — 이 구체적 진단
  내용(codex가 무엇을 지적했는지)은 **PR #141 본문에는 등장하지 않고 팀 메모리에만 기록돼 있다**
  `[세션 기록 기준]`. 다만 그 수정 결과물인 뮤텍스 패턴 자체는 코드에 실존한다 — `busyRef` 변수가
  `src/app/admin/concerns/page.tsx:129` 등 8개 설정형 admin 페이지에서 확인됨 `[검증됨]`
- **PR #143 opus HIGH — GATE_SELF 부재**: "게이트 자신의 변경도 게이트를 통과해야 한다"는 원칙이
  `golden-crud.yml:88-90`에 opus 리뷰 유래로 주석 처리돼 있다 `[검증됨 — 워크플로 파일 원문]`
  — 이 경우는 리뷰 지적이 코드 주석으로 직접 남아 있어 다른 opus/codex 인용보다 신뢰도가 높다

## 발견 버그 10건

세션 메모리(`admin-cms-immediate-persist.md`)가 "e2e가 발견한 실버그 10건"으로 집계한 목록을, 이 세션이
각 항목의 수정 PR과 코드/워크플로 앵커로 재확인했다.

| # | 버그 | 발견 경로 | 수정 PR | 검증 방법 |
|---|---|---|---|---|
| 1 | 홈 "소식"이 최신순이 아니라 배열 앞 4건 고정 → 신규 공지 미노출 | PR #143 실구동 중 발견 | [#144](https://github.com/mim1012/baekjo-obj/pull/144) | 공개 wrapper만 date desc 정렬(admin/repo는 저장 순서 유지), 2099년 날짜로 결정론 확보한 회귀 스펙(PR #151 본문) `[PR 본문 기준]` |
| 2 | 업로드 이미지로 공개 상세 페이지 전체 크래시(next/image 미허용 호스트) | 사용자 리포트 | [#153](https://github.com/mim1012/baekjo-obj/pull/153) | `tests/products/next-image-supabase-host.spec.ts` — 런타임 config 객체 import 검증(문자열 아님) `[PR 본문 기준]` |
| 3 | 회원 상세 페이지 params Promise 미해제로 상세 진입 불능(생성 이래) | wave3 members e2e | [#155](https://github.com/mim1012/baekjo-obj/pull/155) | `tests/admin/dynamic-route-params.spec.ts` 신규 6테스트, tests/admin 231/231 `[PR 본문 기준]` |
| 4 | 보험 신청 상세 페이지 동일 params Promise 버그 | 위와 동일 PR(회원과 함께 발견) | [#155](https://github.com/mim1012/baekjo-obj/pull/155) | 위와 동일 |
| 5 | 상품문의(QnA) 모달 — 부모 리렌더에 effect deps 불안정 참조로 입력값 증발 | wave3 qna-inquiries e2e | [#157](https://github.com/mim1012/baekjo-obj/pull/157) | effect deps 원시값화, wave3 스펙으로 회원 작성→관리자 답변→공개 반영 전체 완주 재검증 `[PR 본문 기준]` |
| 6 | 구매평(리뷰) 작성 모달 — 동일 클래스의 입력 증발 버그 | 위와 동일 | [#157](https://github.com/mim1012/baekjo-obj/pull/157) | 위와 동일 PR에서 함께 수정 |
| 7 | 고민케어·보험FAQ "등록" 버튼 ready 게이트 부재(로드 전 클릭 무음 무시, 2곳) | wave2 e2e(PR #151) 구축 중 발견 | [#156](https://github.com/mim1012/baekjo-obj/pull/156) | ready 게이트 추가 + 노출규칙 안내 문구 `[PR 본문 기준]` |
| 8 | 홈설정·카테고리 — 로드 전 저장이 기본값으로 DB를 덮어쓰는 레이스 | mock→state 전수조사(세션 내부 감사) | [#149](https://github.com/mim1012/baekjo-obj/pull/149) | 로드게이트 추가(저장 버튼을 로드 완료 후에만 활성화) `[세션 기록 기준 — 발견 경로]`, 수정 PR 존재는 `[검증됨]` |
| 9 | 관리자 QnA 무효 배선 — `qna_config`를 공개 병합 로직이 안 읽어 편집이 어디에도 반영 안 됨 | 커버리지 감사(PR #158)가 발견, 리뷰어가 이중 확인 | [#160](https://github.com/mim1012/baekjo-obj/pull/160) | pre-seed 마커 주입→공개 DOM 확인→복원(§8-6 루프 적용 1호), `qna-public-wire-binding-flow.spec.ts` 신규 5테스트 `[PR 본문 기준]` |
| 10 | 리뷰 상태 고아 엔드포인트 — `PATCH /api/admin/reviews/[id]`(구매평 노출 토글)를 호출하는 관리자 UI 미발견 | 커버리지 감사 중 발견 | **미수정 — 백로그** | `tests/admin/golden-crud-coverage.spec.ts:83-85`의 EXCLUDED 사유로 명시 등록, 모더레이션 UI 신설 시 사용 예정 `[검증됨 — 코드 주석 원문]` |

## 전 페이지 스모크 1차 결과 — 미머지 브랜치 (`be/e2e-all-pages-smoke`, 커밋 `5c7a86c`)

⚠️ **이 절 전체는 origin에 존재하되 main에는 머지되지 않은 브랜치를 대상으로 한다.** 커밋
`5c7a86c44a457fde836c58170c459dfe71c31262`("전 페이지 스모크 검수 + 라우트 커버리지 감사")가
`git ls-remote --heads origin`으로 확인 가능 `[검증됨]`.

- 신규 파일 5개: `tests/admin/route-coverage-audit.spec.ts`(82줄, 소스-계약), `tests/golden/_lib/allPagesRoutes.ts`(199줄,
  라우트 표), `tests/golden/all-pages-smoke.spec.ts`(359줄, 실구동 스모크), 그리고 `golden-crud.yml`·
  `playwright.config.ts` 수정 `[검증됨 — git show --stat]`
- 스펙 헤더 주석(브랜치 코드 원문): "src/app 의 모든 page.tsx(**62개**, 정적+동적)를 실제로 방문해
  HTTP 200(또는 문서화된 리다이렉트)·에러 오버레이 부재·페이지별 앵커 렌더를 확인한다" `[검증됨 — 브랜치 코드 주석]`
- `ALL_APP_ROUTES` 배열 항목 수를 이 세션이 직접 grep으로 카운트: **63개** `[검증됨]` — 주석의 "62개"와
  1개 차이. 원인 불명(정적/동적 집계 방식 차이 가능성) — **이 세션이 재계산한 63을 우선 신뢰**하되,
  둘 다 병기한다
- 태스크 지시에 있던 "**62페이지/64케이스, 데스크톱, 2회**" 중 "64케이스"는 이 세션이 검증하지 못했다.
  `all-pages-smoke.spec.ts` 안의 정적 `test(` 호출은 8개뿐이나, 코드가 `for (const route of ALL_APP_ROUTES)`
  형태로 라우트마다 동적으로 테스트를 생성하는 구조로 보인다 — **실행 로그(run 결과) 없이는 실제 생성된
  테스트 케이스 수를 확정할 수 없다.** 이 세션은 그 실행 로그를 확보하지 못했다. **미검증으로 표기**
- 모바일 뷰포트·API 차단 확장은 브랜치 코드 자체에서 진행 흔적을 찾지 못함 — "진행 중"이라는 표현은
  `[세션 기록 기준]`으로만 인용 가능

## 진행 중 — 미완은 미완으로

- **wave4(주문·보험신청·B2B문의·카테고리·주문정책)**: origin에 브랜치가 **존재하지 않는다**
  (`git ls-remote --heads origin`에 `be/e2e-admin-crud-wave4` 없음, `[검증됨]`). 로컬 워크트리
  `D:\Project\BAGJO1\.claude\worktrees\e2e-admin-crud-w4`에 **커밋 안 된** 미스테이지 파일 6개
  (`admin-crud-category-settings.spec.ts`·`admin-crud-insurance.spec.ts`·`admin-crud-members-pending-signup.spec.ts`·
  `admin-crud-order-policy.spec.ts`·`admin-crud-partner-inquiries.spec.ts`·`admin-crud-qna-config.spec.ts`)와
  수정된 `golden-crud.yml`·`golden-crud-coverage.spec.ts`가 있다 `[검증됨 — git status --short]`. **머지는커녕
  커밋도, origin push도 안 된 로컬 작업 상태** — "구축 중" 표현이 부적절할 정도로 초기 단계다
- **wave5(필드 전수 커버리지)**: 마찬가지로 origin 브랜치 없음. 로컬 워크트리 `e2e-admin-crud-w5`에
  커밋 안 된 파일 3개(`product-brand-field-coverage.spec.ts`·`fieldSurfaceMatrix.ts`·
  `admin-crud-brand-fields.spec.ts`·`admin-crud-product-fields.spec.ts`) `[검증됨]`. 이 문서 작성 시점에
  이 세션과 병행 중인 다른 에이전트(`brand-audit-render-executor` 등, 팀 로스터 기준)가 바로 이 작업을
  하고 있을 가능성이 높다 — **이 문서는 해당 작업의 완료 여부를 주장하지 않는다**
- **보험 폼 2단계**: 로컬 워크트리 `insurance-decoy-form`에 `src/app/insurance/{apply,}/page.tsx` 수정이
  커밋 안 된 상태로 존재 `[검증됨]`. 세부 내용은 이 세션의 검증 범위 밖(다른 담당 작업)
- **브랜드 감사 렌더**: 이 세션은 관련 코드 변경을 origin/main 또는 확인한 브랜치 어디에서도 찾지
  못했다 — **존재 여부 자체를 확인 못 함**, 다른 병행 에이전트의 작업 영역으로 추정만 가능

## 이 결과가 보증하지 않는 것

- **opus/codex 리뷰가 실제로 수행됐다는 것** — GitHub에 게시된 리뷰 아티팩트가 없으므로, 이 문서가
  인용하는 모든 opus/codex 판정은 작성 세션의 자기 보고다. 유일한 예외는 코드/워크플로 파일에 직접
  남은 주석(GATE_SELF 원칙 등, `golden-crud.yml:88-90`)— 이런 경우만 "리뷰가 지적한 내용이 실제로
  코드에 반영됐다"를 `[검증됨]`으로 표기했다.
- **staging에서 통과한 것이 production에서도 통과한다는 것** — §10-8 기준 prod는 실사용자 데이터
  (공지 2건 vs 스테이징 6건 등 데이터량부터 다름)와 별도 시크릿 세트를 쓴다. 이 3층 게이트 어디도
  prod를 직접 겨냥하지 않는다(§8-6, `adminCrudHelpers.ts:5-7`).
- **테스트가 검증한 필드/화면 외의 정합성** — 예를 들어 notices 스펙은 "제목·유형·작성자·날짜·본문"
  5필드를 확인하지만, 그 화면에 다른 필드가 추가되면 스펙이 자동으로 확장되지 않는다(golden-crud
  자체의 커버리지 감사는 "도메인" 단위지 "필드" 단위가 아니다 — 이것이 wave5가 별도로 계획된 이유).
- **동시성/경합 시나리오** — 발견된 레이스(브랜드 가시성 토글, 삭제 항목 부활 등)는 테스트가 우연히
  타이밍을 맞춰 잡은 것들이지, 이 스위트가 동시성을 체계적으로 퍼징하지 않는다. 멀티탭 동시 편집
  덮어쓰기(싱글턴 config에 버전 필드 없음)는 세션 메모리에 "기존 한계"로 명시된 미해결 항목이다
  `[세션 기록 기준]`.
- **all-pages-smoke의 실행 결과** — 코드가 origin에 존재함은 확인했으나, 몇 번 실행돼 몇 건 통과했는지는
  이 세션이 재현하지 못했다. "1차 결과"로 인용된 수치(62/64, 2회)는 실행 로그 앵커 없이는 신뢰도
  `[세션 기록 기준]` 이하로 취급해야 한다.

## Codex 리뷰어를 위한 크로스체크 가이드

```bash
# 이 문서의 PR별 머지 사실·본문 재확인
gh pr view 143 --json title,body,mergedAt,mergeCommit
gh pr view 151 --json title,body,mergedAt,mergeCommit
gh pr view 158 --json title,body,mergedAt,mergeCommit
gh pr view 160 --json title,body,mergedAt,mergeCommit

# opus/codex 리뷰 아티팩트 부재 재확인
gh api repos/mim1012/baekjo-obj/pulls/141/reviews
gh api repos/mim1012/baekjo-obj/issues/141/comments

# golden-crud 실행 시간 재계산(wave1 표의 21초/21초 주장 검증)
gh api repos/mim1012/baekjo-obj/actions/runs/29647374993/jobs -q '.jobs[].steps[]'

# 커버리지 감사 21도메인 분류를 코드에서 직접 재확인
grep -n "LIVE_COVERED\|EXCLUDED" tests/admin/golden-crud-coverage.spec.ts

# busyRef 뮤텍스 패턴 재확인(codex HIGH 수정 결과물)
grep -rn "busyRef" src/app/admin/*/page.tsx

# wave4/5/all-pages-smoke가 여전히 미머지인지 재확인
git ls-remote --heads origin | grep -E "wave4|wave5|all-pages-smoke"

# all-pages-smoke 브랜치 코드 직접 열람(머지 안 됐으므로 origin/main에는 없음)
git show origin/be/e2e-all-pages-smoke:tests/golden/all-pages-smoke.spec.ts
git show origin/be/e2e-all-pages-smoke:tests/golden/_lib/allPagesRoutes.ts
```
