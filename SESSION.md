# SESSION — 백조오브제(baekjo-obj)

## 목표 (고정)
정적 목/localStorage로 화면과 데이터가 갈라지는 **drift 제거** — 화면은 콘센트(`src/lib/storage.ts`)/DB로만 흐르게(AGENTS.md §4). 각 변경은 **3중 검증 게이트(§8-6: opus + codex + Playwright 프리뷰)** 통과. 브랜치 `integrate/approval-and-design`.

## 현재 상태 (2026-07-12 마감)
- **상품상세 5개 미배선 항목 구현·검증·머지 완료**: 갤러리 실사진 배선 / audit 배지 제거 / §6 어스톤 토큰 정합 / ProductPurchaseInfo 재배치 / 재고 게이트(+admin stock 입력). 병렬 워크트리 Sonnet 구현 → Opus·Haiku·Codex 5.5 교차리뷰(§8-6) → Codex 5라운드 반복 끝 PASS → integrate 머지·push(`1291f8a..e3e1518`, CI 트리거됨). 미완: 프리뷰 골든플로우 #2·#7 Playwright 스모크(아래 다음 단계).
- (이전 스냅샷)
- **모든 admin/공개 drift 제거 완료**: 홈·헤더 / P1 members / P2 insurance / P3 settings / CategorySettings / survey / **kits·partners·qna**.
- **mypage 인증 버그 수정**: 로그인 가드(미로그인 → `/login` 리다이렉트 + `return null`, 데이터 flash 없음) + reviews 정적목(`@/data/reviews`)·qna 전역 데이터 노출 제거(opus GREEN). Playwright 미로그인 리다이렉트 검증 **PASS**(실배포, `tests/golden/mypage.spec.ts`).
- Supabase 마이그레이션 **0007~0013 실 DB 적용·검증 완료**(로컬 러너 + CI 자동).
- **CI green 회복**(lint 실패 원인 src 3 errors 수정). 3중 게이트 실효성 실증(Playwright가 category-settings `{}` 버그 포착→수정→재배포 확인).
- **드리프트 전수 조사(7영역 병렬, b99d770↔HEAD) 완료(2026-07-12, 7/7)**: 홈·브랜드·진단/보험/콘텐츠·관리자·커머스 = 유실 없음. **심각 1건**(인증 클러스터 재스타일+기능소실) + ProductDetailClient는 구조=사용자 결정으로 판정 하향(잔여: 갤러리 실사진 미배선·재고 게이트 등) — 결정 기록 "병렬 드리프트 조사 종합"+정정 참조.

## 다음 단계 (mim 액션 / 남은 것)
-1. **프리뷰 골든플로우 스모크(§8-6 3번 게이트, 이번 머지분)**: push `e3e1518`의 Vercel 프리뷰에서 #2(상세→장바구니→체크아웃: 갤러리 실사진·품절 게이트·PurchaseInfo 렌더 확인) + #7(admin products 재고 입력 저장→재조회) Playwright 구동. CI(verify) 초록 확인도 함께.
-0.5. **미결 후속(이번 리뷰에서 비차단 판정)**: ① 옵션 재고 미게이트(상품 stock만 보고 ProductOption.stock 무시 — Opus MEDIUM, 기존 잠복 갭) ② admin brands 상품설정 버튼 onClick 소실(데드 버튼) ③ admin members 집계 3컬럼 축소 사용자 확인 ④ 인증 클러스터 재스타일·`#E9E7E0`·signup aside 삭제·업체폼 임시저장 소실 — dad 확인 필요(드리프트 조사 심각 1건).
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
- 2026-07-12 재고 데이터 흐름 확정: Product.stock은 type·repo·DB에 전부 있었으나 **admin 폼만 미배선**(stock:0 하드코딩)이었음 → 입력 추가로 체인 완성. 레거시 null stock 상품은 edit 시 빈 입력→저장 시 0 정규화로 품절 고착 해제 가능(Codex 확인). 재고 게이트와 admin 입력은 같은 배치 배포 필수(단독 게이트 배포 시 신규상품 영구 품절).

## 파일 흔적 (추가만)
- 커밋(브랜치 `integrate/approval-and-design`): `4f9f1b9` 홈·헤더 / `f0a0eb8` 0원+업체필터 / `040fce0` AGENTS+CI / `ef68b80` P1 members / `c039f7c` P2 insurance / `a906574` CI migrate / `37d0dbd` P3 settings / `d4156e0`·`23189c2` CategorySettings(+fix) / `040cf2f` survey+게이트 / `3281450` lint fix(CI green) / `7f1af3b` category-settings {} fix + Playwright / `d1b2c12` kits/partners/qna / `0ab8ba5` mypage 로그인 가드+하드코딩 제거.
- 마이그레이션: `supabase/migrations/0007_insurance`~`0013_qna_config.sql`(전부 실 DB 적용됨).
- 러너: `scripts/apply-migrations.mjs`. CI: `.github/workflows/ci.yml`(verify+migrate).
- Playwright: `playwright.config.ts`, `tests/golden/{home,shop,diagnosis,insurance}.spec.ts`(프리뷰 4/4 PASS). 프리뷰 URL alias: `baekjo-obj-git-integrate-approval-2df5a8-parkjoonhyuns-projects.vercel.app`.
- 콘센트 추가: `storage.ts`의 getAdminMembers/insurance·survey·kits·partners·qna get/save. repo: `src/lib/{insurance,settings,categorySettings,survey,kits,partners,qna}/`.
- SSOT: `AGENTS.md`(§3 분리기준·데이터오너십 / §4-6 lint강제 / §8-6 검증게이트).
- 상품상세 배치(2026-07-12, push `1291f8a..e3e1518`): `src/components/shop/ProductDetailClient.tsx` 8커밋 `68d5b09`(배지 제거)→`e2075a7`(갤러리 배선)→`c8cd729`(§6 토큰)→`c002215`(재고 게이트)→`f1c8f42`·`b90fd63`·`2eb32a1`·`c7d9e2a`(Codex findings 픽스 4연) / `src/app/shop/[id]/page.tsx`+`src/app/admin/products/page.tsx` 3커밋 `25a0af9`(PurchaseInfo 재배치)→`17fad71`(admin stock 입력)→`16ddfaa`(음수·소수 클램프) / 머지커밋 `e3e1518`. 작업 브랜치 `fe/design-product-detail-wiring`·`be/product-detail-server`는 머지 후 삭제(하루살이 규칙).
