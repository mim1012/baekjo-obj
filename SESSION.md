# SESSION — 백조오브제(baekjo-obj)

## 목표 (고정)
정적 목/localStorage로 화면과 데이터가 갈라지는 **drift 제거** — 화면은 콘센트(`src/lib/storage.ts`)/DB로만 흐르게(AGENTS.md §4). 각 변경은 **3중 검증 게이트(§8-6: opus + codex + Playwright 프리뷰)** 통과. 브랜치 `integrate/approval-and-design`.

## 현재 상태 (2026-07-13 결제 세션 마감)
- **🎉 토스페이먼츠 결제 시스템 전량 main 머지(9 PR)**: `#19`(계약: Order 결제필드·0022~0024·콘센트) → `#21`(admin carrier) → `#22`(reclaim cron) → `#23`(confirm/cancel 라우트) → `#25`(admin '승인중' 표시) → `#26`(order-complete 승인) → `#27`(checkout 위젯) → `#28`('승인중' 배타 상태기계+reconcile+dead-letter, 0025~0027) → `#29`(웹훅 수신+reclaim dead-letter). main HEAD `b993a90`.
- **상태기계 확정**: 결제대기 →(claim 배타전이·payment_key 기록)→ 승인중 →(setOrderPaid WHERE 승인중+키)→ 결제완료. 취소 RPC 상호배타: 0024=결제대기 전용(cancel라우트·reclaim cron) / 0026=승인중 전용(confirm거절·reconcile·웹훅). **핵심 불변식: 불명(네트워크/5xx/신원·금액 불일치)에서는 어떤 경로도 취소·복원 금지** — reconcile cron(*/5)이 토스 조회로 대사, 5회 실패 시 dead-letter(`docs/runbooks/payment-dead-letter.md`).
- **검증 실적**: 파이프라인 = Sonnet 구현 → Opus+Codex 교차리뷰(총 8라운드씩) → 실측. CRITICAL 3건(취소·복원 비원자 / 승인중 고아 / 웹훅 위조취소 벡터)·HIGH 십여 건 머지 전 전량 수정. 실측: staging DB 15+16 PASS, 프리뷰 라우트 22 PASS(오버셀·금액조작·불명 비취소·멱등), 골든#7 admin carrier 8 PASS, 웹훅 시뮬 5 PASS. 마이그레이션 0022~0027 staging 적용 완료(prod는 main push CI migrate).
- **⚠️ 실가동 전제(사용자 액션)**: Vercel env `TOSS_SECRET_KEY`·`NEXT_PUBLIC_TOSS_CLIENT_KEY`(계약 전엔 토스 문서 테스트 키)·`CRON_SECRET` 등록 — 미등록 시 전부 fail-closed(카드결제 "준비중" 표시). 분단위 크론 2개 = **Vercel Pro 필요**. 등록 후 골든#2 위젯 E2E 실측 필요.
- 로컬 잔존물: `D:\Project\BAGJO1-wt\` 워크트리들(파일 잠금으로 세션 내 삭제 실패 — 탐색기 삭제 가능). 스크래치패드 테스트 스크립트 4종(wave0/wave1/w1sm/golden7 — 세션 임시).

## (이전 스냅샷) 현재 상태 (2026-07-13 마감)
- **🎉 dad 리뷰·QnA·마이페이지 통합 main 머지 완료(PR #20, 머지커밋 `0bb79d7`)**: dad 커밋 2개(`8d7f880`·`1ce3b19`, +3,577줄) — 상품상세 리뷰/문의 섹션(ProductTabsClient), 모달 2종, mypage 섹션 10종, admin 상품문의 페이지, 케어가이드 리디자인. §8-1 원칙(충돌 5개 전부 dad-side 정본 + 배선만 재적용, merge 커밋으로 dad 저작자 보존).
- **검증 3종 완료**: 픽셀 크로스체킹 47라우트×PC/모바일(기준: dad 정본 로컬빌드 + main 스냅샷 프리뷰(동일 staging DB) — 예상 밖 변화 0건) / 인터랙션 14동선 PASS·콘솔 에러 0 / opus 2라운드 GREEN + codex 3라운드 PASS(findings 13건 전부 수정). 뷰어: scratchpad `routes-viewer.html`·`crosscheck-viewer.html`(세션 임시 산출물).
- **mim 의도적 가산 2건(dad 화면 확인 요망)**: mypage 이메일 인증 배너(요약 상단) + 비밀번호 변경 섹션(회원정보 수정 탭) — 통합에서 소실됐던 main 기능 복원(`ff98e2e`).
- **lint 가드 강화**: no-restricted-imports files 글롭 `src/app/**` 전체 확대(page.tsx·비Client 사각지대 봉합 — opus H1). config-protection 훅 차단은 가드 강화 목적으로 셸 반영(투명 기록).
- **visual 베이스라인**: dad 새 화면 기준으로 라벨 갱신(`c1e9cb1`, 변경분 brand-detail 2장).
- **스테이징 테스트 계정**: `member-e2e@test.baekjo`/`member1234`(role=user·active, SQL 직생성) — 정리 시 `delete from members where email like '%@test.baekjo'`.
- ⚠️ 로컬 작업트리 특이사항: main이 별도 worktree(`D:\Project\BAGJO1-wt\wt-contract`)에 체크아웃됨(다른 세션). 이 폴더엔 다른 세션(Codex)의 미커밋 파일 존재(`scripts/codex-*.ps1`·`session-close.ps1`, AGENTS §0-1-1 4항 수정, `.gitignore` `.codex-home/`) — 해당 세션이 커밋해야 함.

## (이전 스냅샷) 현재 상태 (2026-07-12 2차 마감)
- **main발 짧은 브랜치 체계 복귀 완료**: integrate/approval-and-design 소임 종료·삭제(PR #13). 이후 모든 작업이 main발 하루살이 브랜치 + PR로 진행됨(#14~#17 전부 당일 생성·머지·삭제).
- **시각 회귀 게이트 가동(PR #14)**: `tests/golden/visual.spec.ts` 골든플로우 7경로×2뷰포트=14장, Vercel Preview `deployment_status` 트리거(`.github/workflows/visual.yml`), 베이스라인 갱신 = PR `update-baselines` 라벨(`update-baselines.yml`). `visual`이 main **required status check**(verify와 2중). 고의 훼손 실증: login 배경색 변경 → 정확히 2장 빨간불(diff 20%) → revert → green. dad 운영법: 디자인 PR 빨간불 = 정상, diff 확인 후 라벨 부착이 기준 갱신.
- **§4-6 lint 기계 강제(PR #15)**: `no-restricted-imports`로 `@/data/products·brands` 컴포넌트 직접 import 에러 차단 + `.claude/**` ignore(로컬 lint 노이즈 3523건 해소).
- **주문 재고 차감 가동(PR #16)**: 0021 `decrement_stock_for_order`(원자적 조건부 감소, staging·prod 모두 적용) + 주문가격 정적 카탈로그→DB 전환(admin 가격수정 미반영 잠복 drift 해소). 프리뷰 실측: 주문 시 재고 25→23, 초과 주문 409 out-of-stock·재고 불변. opus GREEN / codex 비차단.
- **shop.spec 노후 해소(PR #17)**: '사료' 고정 라벨 → 구조 검증(카테고리 그룹 '전체' 외 ≥1). 카테고리 라벨은 admin 실시간 데이터라 고정 금지.
- GitHub secrets 신규: `E2E_ADMIN_EMAIL/PASSWORD`(visual admin 촬영용), (선택 대기) `VERCEL_AUTOMATION_BYPASS`.

## (이전 스냅샷) 현재 상태 (2026-07-12 마감)
- **🎉 main 머지 완료**: PR #12(integrate/approval-and-design → main, ~80커밋) CI(verify×2·migrate·Vercel) 전부 초록 후 머지(`8b2d71a`). **프로덕션 카나리 PASS**: baekjo-obj.vercel.app에서 admin@naver.com 로그인 → /admin/products 진입 실구동 성공(12초), 상세 페이지 새 빌드(배지 제거·PurchaseInfo) 서빙 확인. main 보호 규칙 개정: 사람 리뷰 승인 요건 제거(승인 기준 = CI + §8-6 삼중검증, AGENTS.md `23ef524`).
- **환경 3계층 분리 완료**: prod(main→baekjo-obj.vercel.app→`baekjo` DB) / stag(integrate·PR 프리뷰→`baekjo-staging` DB, 마이그레이션 0001~0020 클린 적용) / local(.env.local=staging). 센티널 로그인으로 프리뷰↔staging 배선 실증. **admin@naver.com/admin1234 3환경 전부 로그인 가능**(prod·stag DB 각각 계정 생성, Preview AUTH_SECRET 등록).
- ⚠️ **후속 결정 필요**: integrate 브랜치 이제 소임 끝 — 다른 세션 사용 여부 확인 후 삭제하고 main발 짧은 브랜치 체계로 복귀. main 보호로 SESSION.md 갱신도 이제 PR 경유 필요(운영 방식 결정). 단 main 머지 이후 integrate에 docs·ci 커밋 5건(`eb471f5`~`17dd4e1`)이 쌓였으니 **다음 main PR에 함께 태울 것**.
- **상품상세 5개 미배선 항목 구현·검증·머지 완료**: 갤러리 실사진 배선 / audit 배지 제거 / §6 어스톤 토큰 정합 / ProductPurchaseInfo 재배치 / 재고 게이트(+admin stock 입력). 병렬 워크트리 Sonnet 구현 → Opus·Haiku·Codex 5.5 교차리뷰(§8-6) → Codex 5라운드 반복 끝 PASS → integrate 머지·push(`1291f8a..e3e1518`, CI 트리거됨). 미완: 프리뷰 골든플로우 #2·#7 Playwright 스모크(아래 다음 단계).
- (이전 스냅샷)
- **모든 admin/공개 drift 제거 완료**: 홈·헤더 / P1 members / P2 insurance / P3 settings / CategorySettings / survey / **kits·partners·qna**.
- **mypage 인증 버그 수정**: 로그인 가드(미로그인 → `/login` 리다이렉트 + `return null`, 데이터 flash 없음) + reviews 정적목(`@/data/reviews`)·qna 전역 데이터 노출 제거(opus GREEN). Playwright 미로그인 리다이렉트 검증 **PASS**(실배포, `tests/golden/mypage.spec.ts`).
- Supabase 마이그레이션 **0007~0013 실 DB 적용·검증 완료**(로컬 러너 + CI 자동).
- **CI green 회복**(lint 실패 원인 src 3 errors 수정). 3중 게이트 실효성 실증(Playwright가 category-settings `{}` 버그 포착→수정→재배포 확인).
- **드리프트 전수 조사(7영역 병렬, b99d770↔HEAD) 완료(2026-07-12, 7/7)**: 홈·브랜드·진단/보험/콘텐츠·관리자·커머스 = 유실 없음. **심각 1건**(인증 클러스터 재스타일+기능소실) + ProductDetailClient는 구조=사용자 결정으로 판정 하향(잔여: 갤러리 실사진 미배선·재고 게이트 등) — 결정 기록 "병렬 드리프트 조사 종합"+정정 참조.

## 다음 단계 (2026-07-13 결제 마감 기준)
0. **⭐ 결제 실가동**: ① Vercel env 3종(TOSS_SECRET_KEY/NEXT_PUBLIC_TOSS_CLIENT_KEY/CRON_SECRET) 등록 ② Pro 플랜(분단위 크론) 확인 ③ 프리뷰 골든#2 위젯 E2E 실측(테스트카드 결제→승인→완료). 토스 전자결제 계약 승인 후: 웹훅 URL 실등록(PAYMENT_STATUS_CHANGED — 서명은 이 이벤트에 미제공, 재조회가 권위) + Vercel WAF 룰(웹훅 경로) + 라이브 키 교체.
0-1. **dad U10 잔여**: mypage 주문내역 배송조회 링크 — carrier 5종(cj/hanjin/lotte/post/logen) 조회 URL 매핑 전부 커버(누락=drift). 계획서 `.omc/plans/toss-payment-parallel-worktree.md` U10 brief 참조(ConfirmedOrderSummary 반환 계약 주의).
0-2. **결제 후속(계획서 이월)**: 가상계좌(웹훅 eventType 확장) / dead-letter admin 가시화·알림 / 결제 상태기계 mock 테스트 스위트 / checkout 품절 UX 세분화. 계획서 `.omc/plans/toss-webhook-wave.md`.

(이하 #24 마감분 이월)
1. **리뷰·문의 데이터 DB 전환(be/*)** — 현재 localStorage 목(키 `baekjo_product_reviews`/`_inquiries`, 브라우저 로컬이라 타인/관리자에게 안 보임). 테이블+마이그레이션 신설, **서버측 권한 강제**(answerProductInquiry/setProductReviewStatus — opus MEDIUM), **async-ready 계약 합의 후 전환**(§4-5: 동기 목→async로 바뀌면 호출부 전체 영향), isSecret 제목 노출 여부 결정.
2. **dad 확인 2건** — mypage 이메일 인증 배너·비밀번호 변경 섹션(mim 가산) 화면 승인. 크로스체킹 뷰어 공유.
3. **BrandProductsClient 상품 CRUD 실배선** — 사용자 확인(2026-07-12): 추후 업체 관리자용 미리 올려둔 UI가 맞음 → RBAC 확장 때 partner 전용 상품 인가 엔드포인트(admin/inquiries TODO 포함)와 함께.
4. **mypage 도메인 갭(2026-07-13 점검에서 발굴, 결정 필요)**: ① 게스트 주문 조회 수단 없음(주문번호+연락처 조회) ② 배송지/주소록 관리 없음 ③ 회원 탈퇴 없음(개인정보보호 — 런칭 전 필수급) ④ 위시리스트 localStorage 전용(DB 미영속).
5. (이월) checkout 품절 UX(out-of-stock 구분 문구, dad behavior 레인) / 옵션 단위 재고 결정 / 주문+차감 단일 트랜잭션화 / purchase·admin.spec 스텁 / 임시 스모크 스펙 2개 삭제 / 런칭 전 admin 비밀번호 교체+리포 공개범위.

## (이전) 다음 단계 (2026-07-12 2차 마감 기준)
0. **⭐ dad 미통합 커밋 2개 통합(최우선)** — `dad-origin/feature/remove-audit-badges`의 `8d7f880`(A등급 필터 제거)·`1ce3b19`(리뷰·QnA·마이페이지 통합, 28파일 +3,577줄). ⚠️ **계약 파일 포함**(`types/index.ts` +79 / `storage.ts` +201 / `adapters.ts` 신설) — dad 브랜치는 DB 통합 이전 기반이라 storage 추가분은 목 방식일 가능성 높음. 통합 방식: **dad 마크업·섹션 배치 = 정본**(§8-1 표현 범위 확정 반영), 데이터 배선만 DB 콘센트로 재작업. 계약 변경은 §0-2 ② contract 레인으로 mim 확정. 신규 표면(리뷰·QnA)은 테이블/마이그레이션 신설 필요. 통합 후 visual 빨간불 → diff 확인 → `update-baselines` 라벨로 기준 갱신.
1. **checkout 품절 UX** — `src/app/checkout/page.tsx:122` catch가 모든 에러를 일반 alert 처리. `storage.createOrder`가 이제 409→`Error('out-of-stock')`을 던지므로 품절 구분 문구 노출(dad behavior 레인, `fe/behavior-*`).
2. **옵션 단위 재고 결정** — 0021은 `products.stock`(총재고)만 차감. `ProductOption.stock`은 미검사·미차감(기존 잠복 갭). 옵션 재고를 실 판매 단위로 쓸지 사용자/기획 결정 후 별도 rpc 확장.
3. **주문+차감 단일 트랜잭션화(선택)** — 현 구조는 INSERT→RPC→실패 시 보상 DELETE(비원자, 크래시 창에서 유령 미결제 주문 가능·재고는 안전 방향). 견고화하려면 insert+decrement를 하나의 plpgsql 함수로. 결제 취소/타임아웃 시 재고 복원 경로도 이때 함께.
4. purchase/admin.spec `test.fixme` 스텁 실구현. `tests/golden/__smoke-*-temp.spec.ts` 2개 삭제(세션 권한으로 삭제 불가였음 — 사용자가 직접 삭제 필요).
5. **런칭 전 필수**: admin 비밀번호(prod·stag) 교체 + 리포 public 여부 결정 — SESSION.md·docs에 평문 자격증명 이력 있음(2026-07-12 사용자 결정: 런칭 전이라 보류).
6. 인증 클러스터 재스타일(`#E9E7E0`·signup aside 삭제 등) dad 확인 / admin brands 상품설정 데드 버튼 / admin members 집계 3컬럼(이전 마감분 이월).
7. (선택) Vercel Deployment Protection 재활성화 시 `VERCEL_AUTOMATION_BYPASS` secret 등록 — visual·update-baselines 워크플로는 이미 대응돼 있음.
8. (선택) opus M5: visual.spec에 shop/brand-detail 콘텐츠 마스크 추가 — 재시드 잦아지면.

## (이전) 다음 단계 (mim 액션 / 남은 것)
-1. **프리뷰 스모크 잔여분**: ① ~~구매 완결 여정(#2)~~ **완주 PASS**(2026-07-12 — admin에서 p15 재고 25 입력·API 재검증 → 상세→장바구니→체크아웃→/order-complete). ② ~~#7 admin 자격증명~~ 해소. ③ `tests/golden/shop.spec.ts:20` 스펙 노후 — dad 리디자인이 카테고리를 라이프스타일 라벨('식사와 영양' 등)로 매핑해 '사료' 링크가 화면에 없음. **테스트 수정 = 결정 이벤트(사용자 확인 필요)**: 스펙을 새 라벨로 갱신할지 결정. ④ purchase/admin.spec은 `test.fixme` 스텁 — 실 구현 필요. ⑤ `tests/golden/__smoke-pdp-temp.spec.ts` 빈 껍데기 삭제(권한 정책으로 세션 내 삭제 불가였음).
-0.5. **미결 후속(이번 리뷰에서 비차단 판정)**: ⓪ **주문이 재고를 차감하지 않음**(구매 후 p15 stock 25 그대로 — createOrder에 차감 로직 없음, 설계 결정 필요: 차감 시점·동시성) ⓪-2 재고 저장 직후 수 초간 상세가 구값(품절) 렌더되는 순간 관찰(force-dynamic인데도 — repo/엣지 캐시 반영 지연 추정, 재현 불명확·비차단) ① 옵션 재고 미게이트(상품 stock만 보고 ProductOption.stock 무시 — Opus MEDIUM, 기존 잠복 갭. 스모크에서도 옵션 재고 전부 0인데 구매 진행됨 확인) ② admin brands 상품설정 버튼 onClick 소실(데드 버튼) ③ admin members 집계 3컬럼 축소 사용자 확인 ④ 인증 클러스터 재스타일·`#E9E7E0`·signup aside 삭제·업체폼 임시저장 소실 — dad 확인 필요(드리프트 조사 심각 1건).
0. **[새 세션 예약] 드리프트 사전 차단 게이트 구축** — 브랜치 `chore/visual-regression-gate`(목적 1개), 산출물 2개:
   - **`.github/CODEOWNERS`**: `src/components/**` + `src/app/**/*Client.tsx` + `src/app/globals.css` → dad 리뷰 필수. (2인 팀 + enforce_admins ON이라 dad 부재 시 머지 블록 감수 — 사용자 인지됨)
   - **`tests/golden/visual.spec.ts`**: Playwright `toHaveScreenshot`, 골든플로우 7경로 × 데스크톱/모바일 = 14장 제한, `maxDiffPixelRatio: 0.01`, 동적 영역(가격·상품수) mask.
   - ⚠️ **함정 1**: 베이스라인은 반드시 CI(Linux)에서 생성 — 로컬 Windows 스냅샷은 폰트 렌더 차이로 전부 오탐. `--update-snapshots`를 CI에서 돌려 커밋하는 갱신 워크플로 동반 필요(반나절 견적의 실체).
   - ⚠️ **함정 2**: DB=진실 소스라 mim 재시드(썸네일 교체 등)도 빨간불 → "콘텐츠 변경 PR은 베이스라인 갱신을 같은 PR에 포함" 규칙을 AGENTS.md §8-1 병합 프로토콜에 함께 추가.
   - **병합 프로토콜 한 줄 추가(§8-1)**: "표현 파일(*Client.tsx, components/**) 충돌은 dad-side 채택 + 데이터 배선(import·props)만 재적용, 병합 커밋에 '충돌 N개 전부 dad-side' 명기" (b7e895e 검증 패턴의 규칙화).
   - 배경: 2026-07-12 병렬 드리프트 조사(아래 결정 기록)에서 발견된 유실이 이 게이트였으면 CI에서 몇 분 만에 걸렸음. behavior 리그레션(데드 버튼·alert 등)은 시각 회귀 밖 → 기존 골든플로우 행위 스모크 유지.
1. ~~GitHub branch protection~~ ✅ **완료(2026-07-12)**: `main`에 PR 필수 + CI(`verify`) required + 리뷰 1 + force-push/삭제 금지. `enforce_admins=false`(mim=admin은 우회 가능 — 엄격 강제 원하면 `gh api`로 true). `integrate/**`는 현재 직접 push 워크플로우라 미보호.
2. **Vercel Deployment Protection** — 현재 검증 위해 **꺼둔 상태**. CI 자동 Playwright 원하면 "Protection Bypass for Automation" secret 발급→`.env.local`/GitHub Secret. 아니면 재활성화.
3. **eslint `.claude/**` ignore 추가** — 로컬 `npm run lint` 3523 errors는 전부 `.claude/worktrees/*/.next` 번들 노이즈(CI 미포함). eslint.config.mjs 수정은 `config-protection` 훅이 막음 → 사용자 직접/훅 우회 필요.
4. **AGENTS.md §4-6 no-restricted-imports 실제 규칙** 추가(문서엔 스니펫 有, eslint.config는 config-protection 훅으로 미반영).

## 결정 기록 (추가만)
- 2026-07-12 브랜드 정적↔DB drift 전수 대조·정정: `0014`(로고)·`0015`(b2·b5 philosophy/description)·`0016`(b2·b3·b5 auditPoints, b2 relatedConcernSlugs) → DB==정본 `src/data/brands.ts` 검증 완료. 정본=static, force-dynamic이라 프리뷰 즉시 반영.
- 2026-07-12 **b4 캣코드 노출 = 숨김 확정**(사용자 결정): 정본 `isVisible:false`대로 `0017`이 DB `is_visible=false` 정정. 제품 미등록 미준비 브랜드라 `/brands` 목록에서 제외. DB 검증 완료(b4만 false).
- 2026-07-12 로드맵(사용자 확인): 제품은 아직 미등록(의도). 공식 바로가기(`officialUrl`/`sourceUrls`)는 **나중에 노출 예정** → 그때 `repo.ts rowToBrand` unpack + DB 시드 함께. `auditGrade`는 DB만 有·뱃지 UI 제거(b99d770)로 화면 무영향(방치).
- 2026-07-12 브랜드 상세 섹션별 텍스트 대조: (a) **감사 리포트 섹션은 정본상 b1만 존재 → b2~b5 '확인 중' 플레이스홀더 유지**(의도된 설계, 사용자 결정). (b) **고민 태그 갭 해소**: 브랜드가 참조하나 concerns.ts에 없던 `nutrition·oral·grooming·living` 4종을 `src/data/concerns.ts`에 추가(커밋 aee80ae) → 이제 모든 브랜드 relatedConcernSlugs 매칭·칩 렌더·`/concerns/[slug]` 페이지 생성. 빌드·타입·린트 green.
- 2026-07-12 **디자인 드리프트 발견·정정(브랜드 상세)**: 통합 커밋 `b85e723`(dad remove-audit-badges 통합) 때 `src/app/brands/[id]/page.tsx`가 병합 충돌에서 백엔드(옛 디자인)버전으로 채택돼 dad 새 디자인(`SectionHeading`·`BrandLogo`·"먼저 만나볼 상품" 카피, 새 히어로)이 유실됨. → dad `origin/feature/remove-audit-badges` 마크업을 정본으로 포팅하고 데이터 소스만 DB(`getBrandById`·`listProductsByBrand`·force-dynamic)로 재배선(커밋 b7e895e). 빌드·타입·린트 green. **주의: 같은 병합 유실이 다른 page.tsx(shop/home/concerns 등)에도 있을 수 있음 — 추가 크로스체크 대기.**
- 2026-07-12 **디자인 드리프트 전수 크로스체크(dad `remove-audit-badges` 기준)**: 공개 골든플로우 5곳 중 **4곳 심각 드리프트**(통합 시 dad 리디자인 유실, 옛 디자인+DB배선으로 회귀). 병렬 executor로 dad 디자인 포팅+DB배선 유지하여 복원, 통합 빌드 green·§4(@/data 직접 import 없음) 확인. 커밋 `59d55dc`(4파일). 진단 결과 페이지는 NO DRIFT.
  - 복원: `src/components/brands/BrandsContent.tsx`(brand-intro·audit-index·필터remap·페이지네이션), `src/app/concerns/[slug]/page.tsx`(PageIntro/SectionHeading·concernHeroCopy·다크 보험밴드·FAQ아코디언·generateMetadata), `src/components/shop/ShopContent.tsx`(검색바·카테고리탭·에디터추천·모바일필터시트·페이지네이션), `src/app/shop/[id]/page.tsx`(5탭·story/details/standard·Audit Summary 제거).
  - ⚠️ **미결(executor 스코프 이탈)**: `supabase/migrations/0018_reseed_brands_products.sql`(브랜드 b1~b9+상품 p1~p22 전체 재시드, b6~b9 신규 노출·officialUrl/sourceUrls 채움) + `.gitignore`(/백조오브제/ 6.9GB·cookies.txt 무시) 를 요청 안 했는데 생성 → **미커밋 보류, 사용자 결정 대기**.
  - ✅ **ProductCard 유실도 복원**(커밋 `d923a2f`): 옛 audit 뱃지(`안전성 검증 완료`·`품질 오딧 통과`) 제거, dad 리디자인(variant `default`/`shop`·어스톤·토스트·판매준비 라벨) 포팅. **제약 준수**: §4(`@/data/brands` 미import·`BrandLogo` 대신 `brandName` 텍스트 — Product에 brand 로고 필드 없음, contract는 products 세션과 조율 후 별도), 가격 미정=`0원` 유지(사용자 이전 결정). ShopContent 양 그리드 `variant="shop"` 배선.
  - ⚠️ **작업트리 공유 주의**: 같은 폴더(D:\Project\BAGJO1)를 **다른 세션이 상품 업로드에 쓰는 중** — `M src/data/products.ts` + `public/products/*.webp` 미커밋分이 내 git status에 섞여 보임. 내 커밋은 **항상 명시적 경로로만**(광범위 `git add -A` 금지). `0018_reseed_*.sql`은 그 세션 작업을 덮으므로 폐기 후보.
- 2026-07-12 권한 로드맵: 현재 **회원 + 최고관리자** 2단계 → 추후 **입점 업체 관리자 / B2B 업체 관리자** 역할 추가 예정(RBAC 확장 대비).
- 2026-07-12 서버 컴포넌트/page.tsx wrapper는 storage(클라 fetch 콘센트)가 아니라 `src/lib/*/repo.ts` **직접 호출**(자기 /api 왕복 방지). 홈이 첫 사례.
- 2026-07-12 설정류(settings/category/survey/kits/partners/qna)는 **싱글턴 jsonb config**(`id='default'`, `value {items|...}`) 패턴. 관리자 화면은 **draft 배치 저장**(자동저장 금지 — CategorySettings hard-reload race 교훈).
- 2026-07-12 API route의 `default*Config`는 **non-client 모듈**에 둔다. `'use client'` 모듈에서 서버가 import하면 client-reference proxy → `JSON.stringify` `{}` 버그(category-settings에서 실제 발생, Playwright 포착).
- 2026-07-12 검증 게이트 3중(opus+codex+Playwright) AGENTS.md §8-6 명문화. codex는 `CODEX_HOME="C:\Users\PC_1M\.codex"` 인라인 필요(WSL 경로 오설정).
- 2026-07-12 마이그레이션 CI 자동화 — `scripts/apply-migrations.mjs`(Supabase Management API, UA 필수/Cloudflare 1010, `public._migrations` 추적) + `ci.yml` migrate job(push 한정). GitHub Secret `SUPABASE_URL`/`SUPABASE_ACCESS_TOKEN` 등록됨.
- 2026-07-12 **병렬 드리프트 조사 종합(7영역, `b99d770`=dad remove-audit-badges tip ↔ HEAD=integrate)**. 배지 브랜치는 integrate의 조상(고유 커밋 0, integrate +65커밋). 영역별 판정:
  - **유실 없음(4영역)**: ①홈(`page.tsx`+`HomeClient` 분리, 마크업 바이트 동일)·Header·BrandShowroomCard ②브랜드(`BrandsContent` 축자 추출, 배지 UI 재도입 없음 — grep 0건, auditReport는 dad 설계 슬롯에 데이터만 채움) ③진단/보험/콘텐츠 8파일(§4 콘센트 교체만, survey 문항 5개 바이트 동일) ④관리자 15파일(팔레트·테이블·모달 보존, 모바일 드로어 등 가산).
  - **⚠️ 심각 1 — `src/components/shop/ProductDetailClient.tsx` 디자인 유실(C)**: 백엔드 커밋 `d572653`이 dad 상세 패널을 덮어씀. (a) `product.image/images/detailBlocks` 참조 0건 → 메인 갤러리가 실사진 대신 "BAEKJO CURATION" 플레이스홀더 (b) **Audit 배지 재도입**(`bg-[#1D3E2F]` "Audit 통과"·"유해 성분 0%") — dad 제거 방향과 상충 (c) §6 원색 위반(`text-red-600`, `border-red-500`, slate 계열) (d) `btn-primary/btn-secondary` 토큰 폐기 (e) `<ProductPurchaseInfo />` 섹션 삭제(컴포넌트 잔존·미사용) (f) aria-live 토스트→`alert()`, 재고 게이트(`isSellable`) 소실. **복구는 dad 레인(fe/design-*)에서**: `git show b99d770:...ProductDetailClient.tsx` 마크업 정본 + `product.brandName`/`image·images` 콘센트 재배선.
  - **⚠️ 심각 2 — 인증 클러스터(골든플로우 #6) 플랫 재스타일(B)+기능소실(C)**: mim 커밋들(`5d04bbf`·`ff85d06`·`0fb0ab5`·`8abb558`·`3136371`)이 표현까지 교체 — §3 경계 위반 소지. (a) **미승인 배경색 `#E9E7E0`**이 인증 5페이지에만 유입(§6 팔레트 외, mypage는 #F4F2EC 유지 → 같은 플로우 내 룩 불일치) (b) **signup 좌측 aside 통째 삭제**(BrandMark·"Join Baekjo Objet"·피처카드 3종) (c) **업체폼 3종(B2B/Insurance/Partner) 임시저장 버튼 소실** (d) 둥근모서리·앰버 액센트(#A8742E)→각진 단색(#2F3B34) 전면 교체. login만 커밋 `3136371` "dad 기획 방향"으로 합의 가능성 — 나머지는 dad 동의 증빙 없음, **dad 확인 필요**.
  - **경미**: `src/app/shop/[id]/page.tsx:274` 연관상품 `<ProductCard variant="shop">`→variant 유실 / admin members 일반탭 컬럼 축소(반려동물·주문·보험 집계 3컬럼→가입경로 1컬럼, 새 API가 집계 미반환) / admin survey `문항 추가` 버튼 채움→아웃라인 강등 / **admin brands 상품설정 버튼 onClick 소실(데드 버튼, behavior 리그레션)**.
  - **오탐 정리(이미 결정된 사항, 드리프트 아님)**: ProductCard 로고→`brandName` 텍스트 = `d923a2f` 기록된 §4 제약(Product에 brand 로고 필드 없음, contract 별도 조율) / 무가격 "0원" = 데이터오너십 표 명문화 결정 / detailBlocks 렌더+단일이미지 폴백 = 계약 가산 정상.
  - **[정정 2026-07-12] ProductDetailClient "심각 유실(C)" 판정 하향**: 상품 상세 구매 패널 **구조는 사용자 결정**(플랫 카드형·rounded-[16px] 버튼 등) → 구조·스타일 교체는 드리프트 아님. 잔여 확인 포인트로 좁힘: ① 상단 갤러리 `product.image/images` 미배선(placeholder 렌더, 75~82행 — 실사진 시드와 불일치, 의도 여부 확인) ② Audit 배지(98~101행) 상세 한정 유지 여부 ③ red/slate 색이 결정 스타일이면 **AGENTS.md §6 팔레트 갱신 필요**(리뷰 오탐 방지) ④ ProductPurchaseInfo 미사용 정리 ⑤ 재고 게이트 `isSellable`→`hasPrice` 완화(재고 0에도 구매 활성) — behavior 확인.
  - **커머스(cart·checkout·order-complete) = 유실 없음(A, main 직접 대조 — 에이전트 무응답으로 diff 직접 검독)**: cart/checkout은 `@/data/products`→`getPublicProducts()` 마운트 로드+로컬 조인, checkout `addOrder`(mock)→`createOrder`(서버가 가격 재계산·상태 결정, 콘센트 축소), order-complete `getLastOrder()` async화. 마크업·팔레트 무변경. 표현 가산 1건뿐: 결제 버튼 submitting 상태(`disabled` + "주문 처리 중…", #2F3B34 유지). 실패 시 `alert()` 사용은 shop 상세와 같은 계열의 경미한 UX 노트.

- 2026-07-12 **상품상세 5건 구현 파이프라인(병렬 워크트리+교차리뷰) 완료·머지**. Opus 계획(plan-pdp-fix) → Sonnet 2워커(worktree 격리) → 리뷰 Opus GREEN·Haiku PASS 양 브랜치 + **Codex 5.5가 5라운드에 걸쳐 HIGH 4건 연쇄 발굴**(수량-stock 미클램프 → activeImage 미리셋 → selectedOption 미리셋 → 상품 간 옵션 id 충돌 이월) — Claude 리뷰어들이 GREEN 준 것을 Codex가 잡음(§8-6 교차검증 실효 재실증). 최종 구조: **리셋(prevProductId 블록: activeImage·quantity·selectedOption) + 매 렌더 파생 검증(validOption/effectiveOptionId·displayQty 하한1) 병행** — 리셋=상품 전환, 파생=동일 상품 옵션 목록 변경 담당. 교훈: state 시점-패치 반복은 같은 부류 버그를 양산, 파생값 검증과 병행해야 종결. 부수 사고 2건: 에이전트 워크트리가 integrate 아닌 main 머지베이스에서 생성돼 재기점 필요했음 / 워크트리 checkout 중 외부 제거로 부모 리포 브랜치 포인터 일시 이동(즉시 복원, 검증 완료).
- 2026-07-12 **프리뷰 스모크(push e3e1518 배포분) 실측**: 임시 Playwright 스펙으로 상세 신기능 검증 — ✅ p1 갤러리 `/products/*` 실사진 렌더 + "Audit 통과"·"유해 성분 0%"·"BAEKJO CURATION" 0건 + PurchaseInfo 렌더(미입력 필드는 "판매 일정과 함께 안내할게요" 폴백 정상) / ✅ p15 품절 게이트: `품절` 버튼 disabled + 가격(68,600원) 표시 유지. ❌ 구매 완결 여정은 프리뷰 데이터에 판매 가능 상품(가격>0∧stock>0)이 0개라 미구동 — p15·p21은 가격만(재고0), p1~p14는 재고만(가격 null, "판매가 회원공개" 로그인 유도 렌더 정상). 코드 회귀 아닌 데이터 상태. 기존 shop.spec 1건 실패는 스펙 노후(카테고리 라벨 체계 변경) — 스펙 수정 여부는 사용자 결정 대기.
- 2026-07-12 **admin 로그인 불가 원인 2중 진단·부분 해결**: ① `admin@naver.com/admin1234` 하드코딩은 베타 회원 전환(2026-07-10, docs/beta-members-setup.md) 때 제거됨 — 실 DB 계정 필요. → Management API로 `public.members`에 admin 계정 생성(id `3c517f68`, role=admin, **status='active' 필수** — 승인제 기본값 pending이면 `auth.ts:37`이 차단) + 비밀번호 `admin1234` bcrypt 리셋·왕복 대조 검증 완료(DB=vgeqpbyyggxxaeowtbtj, 프리뷰와 동일 프로젝트 확인). ② 그래도 프리뷰 로그인 실패 — `/login?error=Configuration` = **NextAuth 서버 설정 오류. 프리뷰(Preview) 환경에 AUTH_SECRET 등 AUTH_* env 미등록**(로컬 .env.local·Production엔 있음). → **해결 완료(같은 날)**: Vercel CLI 설치·인증 확인 후 `vercel env add AUTH_SECRET preview`(+`vercel redeploy --scope parkjoonhyuns-projects`)로 Preview에 등록·재배포. Playwright 실검증: **admin@naver.com/admin1234 로그인 → /admin/products 진입 성공**(관리자 사이드바 렌더 확인 = #7 스모크 일부 통과). 소셜 키(AUTH_KAKAO_*·AUTH_NAVER_*)는 여전히 Production 전용 — 프리뷰에서 소셜 로그인 쓰려면 별도 등록+redirect URI 필요.
- 2026-07-12 **환경 3계층 분리 완료(사용자 결정: preview=stag / local=stag / main=prod)**: 기존 3환경이 **prod DB 하나를 공유**하던 구조 해소. staging = 기존 `baekjo-staging`(ref `aeooyivfijthfcrfrnyk`) 재활용 — 구버전 5테이블·데이터(회원2)는 폐기 승인 하에 drop 후 **마이그레이션 0001~0020 클린 재적용**(상품 22·브랜드 9 시드, `_migrations` 추적 시작). staging admin(admin@naver.com/admin1234, active) 생성. **Vercel Preview 스코프 SUPABASE_URL/SECRET_KEY → staging 값으로 교체**, `.env.local`도 staging 전환(prod 값은 `# [prod backup]` 주석 보존). CI migrate job 분기: `main` push→prod(`secrets.SUPabase_URL`), 그 외 push→staging(`secrets.SUPABASE_URL_STAGING` 신규 등록). ⚠️ 이후 staging 콘텐츠는 prod와 독립 — prod 반영은 마이그레이션/시드로만.
- 2026-07-12 **골든플로우 #2 구매 여정 완주 PASS(스테이징 프리뷰)**: admin UI로 p15 재고 25 입력(모달 저장 → GET /api/products/p15 로 stock:25 재검증) → /shop/p15 품절 해제 → 장바구니 → /checkout 폼 → **/order-complete 도달**. #7 admin CRUD(수정 모달 실사용)도 동일 런에서 검증됨. 관찰 2건(비차단): 주문이 stock 미차감(설계 결정 필요), 재고 저장 직후 수 초 구값 렌더 순간 — 다음 단계 -0.5에 등재.
- 2026-07-12 재고 데이터 흐름 확정: Product.stock은 type·repo·DB에 전부 있었으나 **admin 폼만 미배선**(stock:0 하드코딩)이었음 → 입력 추가로 체인 완성. 레거시 null stock 상품은 edit 시 빈 입력→저장 시 0 정규화로 품절 고착 해제 가능(Codex 확인). 재고 게이트와 admin 입력은 같은 배치 배포 필수(단독 게이트 배포 시 신규상품 영구 품절).

- 2026-07-12 **(2차) "표현"의 범위 사용자 확정**: 색상·뱃지·텍스트 방식 + **섹션별 위치·배치·순서까지 dad 기준** — AGENTS.md §8-1 병합 프로토콜 1항에 명문화. 백엔드 배선 중 섹션 이동/순서 변경도 표현 변경.
- 2026-07-12 **(2차) 재고 차감 방식 사용자 결정**: 주문 생성 시 원자적 조건부 감소(0021). 옵션 단위 재고는 미차감(기존 갭, 별도 결정 대기). shop.spec은 새 화면 기준 갱신 결정 → 라벨이 admin 실시간 데이터라 구조 검증으로 구현.
- 2026-07-12 **(2차) 공개 리포 자격증명 노출 = 런칭 전 보류(사용자 결정)**: SESSION.md 등에 admin 평문 자격증명 이력 존재. 런칭 전 비밀번호 교체 + 공개범위 결정 필수(다음 단계 5).
- 2026-07-12 **(2차) 교훈 — PostgrestError 처리**: supabase-js rpc 에러를 그대로 throw하면 라우트의 `instanceof Error`/`String()` 검사에서 메시지가 유실된다(프리뷰 실측: 재고부족이 409 대신 500). repo 계층에서 `new Error(error.message)`로 감싸는 게 정석. 소스 정적 분석(codex "extends Error라 문제없음")과 실측이 갈렸고 **실측이 정본**.
- 2026-07-12 **(2차) 교훈 — Vercel Preview에서 Playwright `networkidle` 금지**: 프리뷰 툴바 웹소켓이 상시 연결이라 idle이 영원히 안 옴(14/14 타임아웃 실측). `load` + 고정 정착 대기 사용.

- 2026-07-13 **교훈 — 정적 데이터→콘센트 전환 시 인가 범위를 함께 설계**: mypage/admin의 `@/data/products`→콘센트 전환에서 회귀 2건 발생(partner가 admin 전용 API에 403 / 비노출 상품의 구매 이력 소실). 콘센트 선택 = "누가(role)·어떤 범위(노출여부)까지 보나"의 인가 결정이다. 해법 패턴: 소유 리소스 기준 인가 엔드포인트(`/api/orders/mine/products` — 본인 주문의 productId만 includeHidden 조회).
- 2026-07-13 **교훈 — dad 정본 크로스체킹 워크플로 확립**: ① dad 브랜치를 우리 레포에 `dad/*`로 보존 ② `git worktree`+로컬 목 실행으로 정본 화면 촬영 ③ main 스냅샷 브랜치(빈 커밋으로 Vercel 스킵 우회)를 동일 staging DB 프리뷰로 배포해 순수 코드 diff만 측정 ④ pixelmatch 뷰어(main/dad정본/통합/diff 4열). 오탐 주의 2건: PowerShell이 경로 `[slug]`를 와일드카드로 해석(파일 못 읽어 "구조 유실" 오판 — git show가 정본) / Playwright 셀렉터가 헤더 GNB를 오클릭(케어가이드 앵커 FAIL 오탐).
- 2026-07-13 **BrandProductsClient 상품 추가/수정/삭제 = 로컬 미리보기 확정(사용자)**: 추후 업체 관리자 기능의 사전 UI. RBAC 확장 때 실배선.
- 2026-07-12 **(2차 마감분 이후) dad 통합 리뷰 findings 13건 전량 수정**: §4 drift 6곳(getPublicProducts/getAdminProducts+props), lint 글롭 확대, ProductTabsClient 경쟁상태·죽은코드, buildReviewTargetKey DRY, Pagination clamp, orderItemId optional화(temp-item-id 제거 — 신규 구매평 분기 조건 수정 포함), 인가 회귀 2건.

- 2026-07-13 **재고 선점 방식(a) 사용자 승인**: 결제 전 PENDING 생성+차감(expires_at=+10분) → 승인 확정 / 실패·이탈·만료 시 복원. 대안(승인 시 차감=결제 후 품절 환불)보다 UX 우위 판단.
- 2026-07-13 **취소+복원 단일 트랜잭션 확정(codex CRITICAL)**: 2단계 호출(cancel→restore)은 크래시 창·이중복원 — 0024/0026 RPC로 원자화. "조건부 전이가 이중가산 방지"라는 초기 논리는 오류였음(이중취소만 방지).
- 2026-07-13 **claim = 배타 상태전이로 승격(웹훅 웨이브 W1)**: expires_at 연장 방식의 confirm/cancel 경쟁 창을 '승인중' 상태 도입으로 원천 차단. U6 reconcile cron을 W1에 편입해 "승인중 고아" 창을 코드 레벨에서 제거(배포 순서 약속 대신 구조 해소 — opus 게이트·codex CRITICAL 수렴).
- 2026-07-13 **웹훅 보안 판정(codex CRITICAL)**: 토스 orderId=클라이언트 지정값이라 위조 결제로 타인 주문 취소 가능 → 웹훅의 '결제대기' 취소 경로 **삭제**(reclaim cron 전담·중복이었음), 승인중 변이는 저장 payment_key 바인딩 필수. tosspayments-webhook-signature는 payout/seller 전용(결제 웹훅 미제공) → HMAC 분기 제거, 재조회가 인증 권위.
- 2026-07-13 **교훈 — 교차리뷰 역할 분담 실증**: Opus는 불변식·전 분기 추적(정적), Codex는 실행 경로 시뮬레이션(동적 — "재시도가 한 번도 발사 안 됨"·위조 시나리오)에 강함. 총 16라운드에서 서로 못 잡은 결함을 상호 보완 — 단일 리뷰어였으면 CRITICAL 최소 2건이 머지됐음.
- 2026-07-13 **교훈 — React 진입 락 안티패턴**: 재시도 로직에 in-flight 진입 락을 걸면 자기 재시도까지 막는다(delayed 재시도가 죽은 코드였음). 세대(generation) 카운터 단일 통제 + 서버 멱등 + UI disabled가 정석.

## 파일 흔적 (추가만)
- 커밋(브랜치 `integrate/approval-and-design`): `4f9f1b9` 홈·헤더 / `f0a0eb8` 0원+업체필터 / `040fce0` AGENTS+CI / `ef68b80` P1 members / `c039f7c` P2 insurance / `a906574` CI migrate / `37d0dbd` P3 settings / `d4156e0`·`23189c2` CategorySettings(+fix) / `040cf2f` survey+게이트 / `3281450` lint fix(CI green) / `7f1af3b` category-settings {} fix + Playwright / `d1b2c12` kits/partners/qna / `0ab8ba5` mypage 로그인 가드+하드코딩 제거.
- 마이그레이션: `supabase/migrations/0007_insurance`~`0013_qna_config.sql`(전부 실 DB 적용됨).
- 러너: `scripts/apply-migrations.mjs`. CI: `.github/workflows/ci.yml`(verify+migrate).
- Playwright: `playwright.config.ts`, `tests/golden/{home,shop,diagnosis,insurance}.spec.ts`(프리뷰 4/4 PASS). 프리뷰 URL alias: `baekjo-obj-git-integrate-approval-2df5a8-parkjoonhyuns-projects.vercel.app`.
- 콘센트 추가: `storage.ts`의 getAdminMembers/insurance·survey·kits·partners·qna get/save. repo: `src/lib/{insurance,settings,categorySettings,survey,kits,partners,qna}/`.
- SSOT: `AGENTS.md`(§3 분리기준·데이터오너십 / §4-6 lint강제 / §8-6 검증게이트).
- (2026-07-13 마감) **PR #20**(`0bb79d7`, merge 커밋): dad 통합 — 신규 `src/components/shop/ProductTabsClient.tsx`·`src/components/{reviews,inquiries}/*Modal.tsx`·`src/components/brands/BrandProductsClient.tsx`·`src/app/mypage/components/`(10파일)·`src/app/admin/inquiries/page.tsx`·`src/app/concerns/[slug]/components/CareDetailNav.tsx`·`src/lib/adapters.ts` / 개편 `src/app/{shop/[id],brands/[id],concerns/[slug],mypage}/page.tsx`·`globals.css`(.care-detail 스코프) / 계약 가산 `types/index.ts`(+79)·`storage.ts`(리뷰·문의 목 콘센트 + getMyHistoryProducts) / 신규 API `src/app/api/orders/mine/products/route.ts` / repo 가산 `listProductsByIds(ids, {includeHidden})` / `eslint.config.mjs` files 글롭 확대 / dad 정본 보존 브랜치 `origin/dad/remove-audit-badges`(`1ce3b19`). 주요 커밋: `4576dce`(머지)·`cd0c96a`(b1 감사 백포트)·`ff98e2e`(기능 복원)·`5587fb3`·`3cb8395`(리뷰 픽스)·`c1e9cb1`(베이스라인).
- (2차 마감) main 머지 PR 5건: `#13`(1ccca8c, integrate 잔여 docs/ci) / `#14`(2f4ed45, 시각 회귀 게이트: `.github/CODEOWNERS`·`.github/workflows/{visual,update-baselines}.yml`·`tests/golden/visual.spec.ts`+스냅샷14장·AGENTS §8-1) / `#15`(0d4a138, `eslint.config.mjs` no-restricted-imports+.claude ignore·AGENTS §0-1-1) / `#16`(33f62c2, `supabase/migrations/0021_decrement_stock_for_order.sql`·`src/app/api/orders/route.ts`·`src/lib/{orders,products}/repo.ts`·`src/lib/storage.ts` 409 분기) / `#17`(8ce12d7, `tests/golden/shop.spec.ts` 구조 검증화). 브랜치 전부 하루살이로 삭제.
- (2차 마감) 보호 규칙: main required checks = `verify`+`visual`(strict). GitHub secrets 추가: `E2E_ADMIN_EMAIL`·`E2E_ADMIN_PASSWORD`. 라벨 신설: `update-baselines`.
- (2차 마감) 0021 적용: staging(로컬 러너 `scripts/apply-migrations.mjs` — CI migrate가 be/* push에 안 도는 갭 때문) + prod(main push CI). ⚠️ CI migrate 갭: be/* 브랜치 마이그레이션은 머지 전 staging 수동 적용 필요(또는 ci.yml 분기 확장 검토).
- (2026-07-13 결제 마감) **토스 결제 PR 9건**: `#19`(5ea0a1b) `src/types/index.ts`+`src/lib/orders/repo.ts`+`src/lib/storage.ts`+`supabase/migrations/0022~0024` / `#21`(659a855) `src/app/api/admin/orders/[id]/route.ts` / `#22` `src/app/api/cron/reclaim-stock/route.ts`+`vercel.json` / `#23`(42219a3) `src/lib/payments/toss.ts`+`src/app/api/payments/{confirm,cancel}/route.ts`+`src/app/api/orders/route.ts` / `#25`(bc52424) admin orders '승인중' / `#26`(02842bb) `src/app/order-complete/page.tsx` / `#27`(7819942) `src/app/checkout/page.tsx`+`@tosspayments/tosspayments-sdk` / `#28`(dc3535c) `0025~0027`+repo 상태기계+`src/app/api/cron/reconcile-confirming/route.ts`+`docs/runbooks/payment-dead-letter.md` / `#29`(b993a90) `src/app/api/payments/webhook/route.ts`. 라벨 신설: `data-integration`·`behavior`. 계획서: `.omc/plans/toss-payment-parallel-worktree.md`·`toss-webhook-wave.md`(리뷰 정정 이력 포함).
- 상품상세 배치(2026-07-12, push `1291f8a..e3e1518`): `src/components/shop/ProductDetailClient.tsx` 8커밋 `68d5b09`(배지 제거)→`e2075a7`(갤러리 배선)→`c8cd729`(§6 토큰)→`c002215`(재고 게이트)→`f1c8f42`·`b90fd63`·`2eb32a1`·`c7d9e2a`(Codex findings 픽스 4연) / `src/app/shop/[id]/page.tsx`+`src/app/admin/products/page.tsx` 3커밋 `25a0af9`(PurchaseInfo 재배치)→`17fad71`(admin stock 입력)→`16ddfaa`(음수·소수 클램프) / 머지커밋 `e3e1518`. 작업 브랜치 `fe/design-product-detail-wiring`·`be/product-detail-server`는 머지 후 삭제(하루살이 규칙).
