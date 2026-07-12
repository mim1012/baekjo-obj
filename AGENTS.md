<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# 백조오브제 (Baekjo Objet) — 팀 협업 SSOT

> 이 파일은 **단일 진실(Single Source of Truth)** 입니다. Claude Code · Codex · **Antigravity IDE가 모두 이 파일을 읽습니다.**
> 규칙을 바꾸려면 여기만 고치세요. (`CLAUDE.md`는 `@AGENTS.md` 포인터라 자동으로 따라옵니다.)
> 상세 협업 절차는 [`COLLABORATION.md`](./COLLABORATION.md).

## 0. 운영 원칙 & Decision Flow (⭐ 작업 시작 전 필독)

### 0-1. 원칙 (Principles) — 규칙보다 먼저
1. **역할은 나눠도 코드베이스는 절대 안 나눈다.** 하나의 레포, 하나의 `main`.
2. **`main` = 항상 배포 가능한 단일 진실(SSOT).** 여기서 갈라져 나가 여기로 돌아온다.
3. **장기 브랜치 금지.** 브랜치는 하루살이다 — 목적 1개만 담고, 매일 `main`을 동기화하고, 끝나면 지운다.
4. **화면은 콘센트에만 꽂는다.** 데이터는 오직 `src/lib/storage.ts` 함수로만 흐른다(§4).

### 0-2. Decision Flow — "이 작업, 어디로 가야 하나"
작업을 시작하면 **규칙을 뒤지기 전에** 이 순서로 판단해 브랜치·라벨·담당을 정한다.

```
작업 요청
│
├─ ① 사용자에게 보이는 변경인가?
│     ├─ 화면 표현(마크업·스타일·애니메이션) ─→ fe/design-*     담당: dad   라벨: design
│     └─ 화면 동작(핸들러·상태·플로우)        ─→ fe/behavior-*   담당: dad   라벨: behavior
│
├─ ② types/index.ts 또는 storage.ts 시그니처를 바꾸나?
│     └─ 예 ─→ contract/*   라벨: contract-change   제안: 누구나 · 확정/머지: mim
│              (가짜데이터 + 모든 호출부를 같은 PR에서 함께 고쳐 빌드 green 유지 — §4)
│
├─ ③ API·DB·인증·결제 연결인가?  ─→ be/*    담당: mim   라벨: data-integration
│
└─ ④ 겉보기 무변경 내부 성능인가? ─→ perf/*  담당: mim   라벨: perf-internal
```

- **한 작업이 여러 갈래에 걸치면 쪼갠다.** 표현+계약이 섞이면 계약 PR을 먼저 직렬로 머지한 뒤 표현 PR을 올린다.
- **의존 순서**: `feature(fe·be 병렬) → contract(직렬화 지점) → integration → perf`. contract는 항상 단독 머지.

## 1. 프로젝트 한 줄 정의
프리미엄 반려생활 큐레이션 + 펫슈어런스(펫보험) + B2B 케어키트 **에코시스템 커머스 플랫폼**.
브랜드 비전: *"우리 아이에게 정말 필요한 선택만 남기는 곳."* 톤: **Quiet Luxury**(조용한 럭셔리).

- **성격**: 수주(외주) 프로젝트 — 클라이언트 납품물. 배포 게이트·납품 증빙(§8, §9) 적용.
- **현재 단계**: Phase 1 진행 중. 프론트 UI+가짜(mock) 데이터는 구축됨, **진짜 백엔드·데이터는 미완성.**
  진행 현황 SSOT: [`docs/baekjo-platform-completion/PROGRESS.md`](./docs/baekjo-platform-completion/PROGRESS.md).

## 2. 기술 스택 (추측 말고 이 목록 기준)
| 영역 | 채택 | 비고 |
|------|------|------|
| Framework | **Next.js 16.2.10 (App Router)** | ⚠️ Next 16 최신 → 위 nextjs-agent-rules 준수 |
| Language | **TypeScript 5** | 타입이 곧 계약서(§4). |
| UI | **React 19.2.4** | Server/Client Component 경계 주의 |
| Styling | **Tailwind CSS v4** + `globals.css` 변수 | v4 문법 — v3와 다름 |
| Animation | **framer-motion 12** | fade-up / wipe |
| Icons / Charts | **lucide-react** / **recharts** | recharts=관리자 대시보드 |
| Lint | **ESLint 9** | `npm run lint` |
| 데이터(현재) | `src/data/*.ts` 가짜데이터 + `localStorage`(`src/lib/storage.ts`) | → 실 API로 교체 예정 |

## 스킬 & 워크플로우 프로파일 (이 프로젝트 전용 라우팅)

> 글로벌 스킬 수백 개 중 아래 목록을 먼저 집는다. 수주 프로젝트 — 배포 게이트·납품 증빙(§8·§9) 적용.

- **도메인**: Next.js 16 App Router · React 19 · Tailwind v4 · framer-motion 12 · 프리미엄 펫커머스 · Quiet Luxury 디자인
- **DAILY 스킬**: `nextjs-turbopack`, `react-patterns`, `react-performance`, `react-testing`, `frontend-patterns`, `frontend-design-direction`, `motion-ui`, `motion-patterns`, `design-system`, `make-interfaces-feel-better`, `ecc:react-review`, `ecc:react-build`(빌드 실패 시)
- **워크플로우**: 디자인·표현 변경 = `frontend-design-direction` → `design-review` / 계약(types·storage) 변경 = §4 콘센트 규칙 준수 / 완료 전 `npm run lint`+`npm run build`+`verify` / 리뷰 = `ecc:react-review`
- **재사용 먼저(위키 D:\Project\_wiki)**: [[웹앱-인증-세션-계층]] · [[반응형-오프캔버스-모바일]] · [[카카오-네이버-소셜로그인-AuthJS]]
- **무시**: Android/Kotlin·트레이딩·네트워크·무거운 백엔드 계열(현재 Phase1 = FE+mock)

## 3. 역할 경계 — 디렉토리가 아니라 레이어로 나눈다
> ⚠️ **왜 바뀌었나:** 예전엔 "dad=`src/app/**`, mim=`src/lib/**`"로 폴더로 나눴는데, 백엔드 연동은
> dad가 디자인한 바로 그 페이지 파일(`page.tsx`)을 건드릴 수밖에 없어 **같은 파일이 충돌**했다.
> 경계는 폴더가 아니라 **"한 파일 안에서 누가 무엇을"** = 레이어로 긋는다.

**핵심 분리 규칙 (충돌이 구조적으로 불가능해지는 지점):**
페이지는 **서버 wrapper `page.tsx`(mim: 데이터 주입) + 클라이언트 표현 `*Client.tsx`(dad: UI)** 로 쪼갠다.
각자 자기 레이어 파일만 편집한다.

> **언제 쪼개나 — 전부 쪼개지 않는다 (2026-07-12 기준 명확화):**
> - **쪼갠다:** 서버 데이터(상품·브랜드·주문 등 DB)를 읽어 **첫 화면에 그려야 하는** page.
>   → 홈이 완료 사례: `page.tsx`(서버, `repo` 직접 호출) + `HomeClient.tsx`(표현). 서버 wrapper는
>   storage(클라용 fetch 콘센트)가 아니라 **`src/lib/*/repo.ts`를 직접 호출**한다(자기 `/api` HTTP 왕복 방지).
> - **안 쪼갠다:** 순수 폼·상태 페이지(`login`·`signup`·`cart`·`checkout`·`forgot-password` 등)는
>   통짜 `'use client'`가 오히려 맞다. 억지로 분리하지 말 것.
> - **남은 분리 대상(현황):** 서버 데이터를 client `useEffect`로 늦게 읽는 **admin 목록들**과
>   `diagnosis/result`. 여기가 dad·mim 충돌이 재발하기 쉬운 지점이므로 순차적으로 wrapper 분리한다.

### Role: dad — PM · UX · Frontend
- **책임(제품 관점):** 무엇을 왜 만드는지, 화면 표현·인터랙션·기획 기능 연결(핸들러·상태·플로우).
- **변경 가능:** `*Client.tsx`·`src/components/**`·`src/app/globals.css`·`src/data/**`(mock)·`public/**`.
- **변경 금지:** `page.tsx`의 **서버 컴포넌트 wrapper**, `src/lib/**`, `src/app/api/**`,
  그리고 **`types/index.ts`·`storage.ts`의 시그니처**(=계약). 필요하면 고치지 말고 §0-2 ② 경로로 요청.
- **PR 체크리스트:** ☐ Decision Flow 라벨(design/behavior) ☐ 콘센트 경유(직접 fetch/localStorage 없음)
  ☐ 계약 파일 무변경 ☐ 도메인 규칙(§6) 준수 ☐ 디자인 변경 시 스크린샷 ☐ build·lint green.

### Role: mim — Backend · DB · API · Infra · Performance
- **책임(기술 관점):** 진짜 데이터·서버 로직·DB·인증·결제·주문 처리·검증·성능, 그리고 **`main` 관리**.
- **변경 가능:** `src/lib/**`(콘센트 본문)·`src/app/api/**`·`page.tsx` 서버 wrapper·계약 파일 **본문/구현**.
- **변경 금지:** 디자인 마크업·표현 컴포넌트(`*Client.tsx`)의 임의 변경. UI가 필요하면 dad에게 요청.
- **PR 체크리스트:** ☐ Decision Flow 라벨(data-integration/perf/contract) ☐ 콘센트 시그니처 불변(또는 §4 계약 절차)
  ☐ 골든플로우(§7) 스모크 ☐ 성능 변경은 겉보기 무변경 증명 ☐ build·lint green.

### 공유 접점 = 계약 (양쪽 합의 필요)
**`src/types/index.ts`(데이터 설계도)** + **`src/lib/storage.ts`(콘센트 = 함수 시그니처)**.
시그니처 변경은 §0-2 ②(`contract/*` + `contract-change` 라벨, 확정=mim)로만. §4 규칙 준수.

> **계약 현행판 공지 (2026-07-12, dad 필독):**
> - `Product.detailBlocks?: ProductDetailBlock[]` 신설(optional 가산) — **네이버식 상세 본문**(text|image 블록 순차 렌더).
>   상세 페이지 `#story` 섹션이 이 블록을 렌더한다(블록 없으면 기존 단일 이미지 폴백). 상세 영역 디자인을 다듬을 때
>   **블록 순회 구조는 유지**하고 스타일만 바꿀 것. 이미지 블록 사이에 여백을 넣으면 통상세가 끊겨 보이니 주의.
> - 상품 `image`/`images`는 12개 상품이 실사진 webp(`/products/p*.webp`), 9개 상품은 상세 슬라이스
>   78장(`/products/detail/<group>/NN.webp`)까지 시드됨. 브랜드 b2·b3·b5는 `auditReport` 실데이터 채워짐.

### 데이터(콘텐츠) 오너십 — "누가 값을 채우나" (2026-07-12 추가)
> 코드 연동과 **콘텐츠 채우기는 별개다.** 연동이 끝나도 DB/데이터가 비어 있으면 화면은 그대로다
> (실제 겪음: 홈을 DB로 연동했지만 seed의 `price=null`·로고 placeholder 때문에 화면 무변화). 그래서
> "이 값을 누가 넣는지"를 못 박는다.

| 데이터 | 오너 | 넣는 위치 | 미정일 때 |
|--------|------|-----------|-----------|
| 브랜드 로고 이미지 | **dad**(디자인) | `public/brands/*` + `brands` 데이터/seed `logo` 경로 | placeholder → 채우면 즉시 표시 |
| 상품 판매가·재고 | **mim/기획** | `/admin/products` 입력 또는 seed `price` | 카드에 `0원` 표시(저장값은 `null` 유지) |
| 정적 콘텐츠(공지·후기·케어가이드) | **dad** | `src/data/*` (아직 API 라우트 없음) | 해당 없음 |
| 상품 상세 본문(detailBlocks)·썸네일 | **mim**(시드) → 추후 업체 관리자 | `src/data/products.ts` + 재시드 | 폴백: 단일 image 박스 |

> ⭐ **products·brands 는 이제 DB가 화면의 진실 소스다 (2026-07-12, 0018~0020 재시드 이후).**
> `src/data/{products,brands}.ts`만 고치면 **화면은 안 바뀐다** — 정본(파일)과 DB를 함께 맞춰야 한다.
> 콘텐츠를 바꾸려면 ① `/admin`에서 수정(즉시 반영, 단 정본 파일과 drift 생기니 mim에게 공유) 또는
> ② 정본 `src/data/*.ts` 수정 후 **mim에게 재시드 요청**(gen 스크립트로 `00XX` 마이그레이션 기계 생성 — 수기 SQL 금지).

## 4. ⭐ drift 방지 — "콘센트" 규칙 (이 프로젝트의 제1원칙)
프론트는 가짜 데이터로, 백엔드는 진짜 데이터로 만든다. **둘이 따로 놀아(=drift) 화면이 조용히 깨지는 것**이
가장 위험하다. 이 리포엔 이미 그걸 막는 구조가 있으니 아래를 지키면 drift가 구조적으로 불가능해진다.

1. **화면은 콘센트에만 꽂는다.** 프론트(컴포넌트)는 데이터를 `src/lib/storage.ts`의 함수로만 읽고 쓴다.
   🚫 컴포넌트에서 `fetch(...)`·`localStorage` **직접 호출 금지.**
2. **나는 콘센트 속만 바꾼다.** 백엔드 작업 = `storage.ts` 함수의 *내용*을 가짜→진짜(API 호출)로 교체.
   🚫 함수의 **이름·인자·반환 타입(=콘센트 모양)은 바꾸지 않는다.** 모양이 같으면 프론트는 한 줄도 안 바뀐다.
3. **데이터 모양은 설계도 한 장.** 모든 데이터 형태는 `src/types/index.ts`에만 정의한다. 누가 이걸 어기면
   `npm run build`가 **빨간불(빌드 실패)** 로 잡는다 → 조용히 못 깨지고 시끄럽게 걸린다. (§8 CI가 강제)
4. **콘센트 모양·설계도를 바꿔야 하면 = 계약 변경.** 반드시:
   - 가능하면 **가산적**으로(필드는 optional 추가, 기존 이름 변경·삭제 지양),
   - 깨는 변경이면 **가짜데이터+모든 호출부를 같은 PR에서** 함께 고쳐 빌드를 green 유지,
   - PR에 `contract-change` 라벨 → 양쪽 인지. `src/types/index.ts` diff는 항상 리뷰 필수.
5. **동기/비동기 결정(지뢰).** 진짜 API는 비동기다. 나중에 `storage` 함수를 async로 바꾸면 모든 호출부가
   깨진다 → **처음부터 async-ready로 갈지 팀이 먼저 합의**(권장). 합의 전엔 시그니처 변경 금지.
6. **⭐ 약속이 아니라 기계가 막는다 (2026-07-12 추가).** "컴포넌트에서 `@/data/*` 직접 import 금지"는
   사람 약속으로는 안 지켜졌다 — dad `ProductCard`가 `@/data/brands`를 직접 import한 채 CI를 통과했고,
   그 결과 두 브랜치의 카드가 로고/문구로 조용히 갈라지는 drift가 실제로 발생했다. 그러니 `eslint.config.mjs`에
   `no-restricted-imports` 규칙으로 **관리자가 실시간 변경하는 데이터(`@/data/products`·`@/data/brands`)의
   컴포넌트 import를 에러로 막고**, CI lint 게이트가 잡게 한다. 서버 컴포넌트/`page.tsx` wrapper는 이 데이터를
   `@/data/*`가 아니라 `src/lib/*/repo.ts`(또는 storage 콘센트)로 읽는다. 예외: `concerns/notices/reviews/
   homeContent/shopFilters` 등 **API 라우트가 없는 정적 콘텐츠**는 관리자가 실시간 변경하지 않아 drift 위험이
   없으므로 규칙에서 제외한다.

   ```js
   // eslint.config.mjs 에 추가할 규칙(제안)
   {
     files: ["src/components/**", "src/app/**/*Client.tsx"],
     rules: {
       "no-restricted-imports": ["error", { patterns: [
         { group: ["@/data/products", "@/data/brands"],
           message: "실시간 데이터는 콘센트(storage) 또는 repo 로만 읽으세요 — 컴포넌트 직접 import 금지(§4)." },
       ]}],
     },
   }
   ```

## 5. 코드 규약
- 파일 200–400줄 권장, 800줄 초과 금지. 불변성(기존 객체 mutate 금지, 새 객체 반환).
- 네이밍: 변수/함수 `camelCase`, 컴포넌트/타입 `PascalCase`, 상수 `UPPER_SNAKE_CASE`, boolean `is/has/should/can`.
- `any` 지양. 공용 타입은 `src/types/index.ts` 재사용. 완료 전 `npm run lint` + `npm run build` 통과, debug 로그 제거.

## 6. 도메인 규칙 (백조오브제 고유 — 위반 시 브랜드 훼손)
- **폰트**: 한글·본문 = **Pretendard**. 영문 타이틀/장식(`font-editorial`) = **Playfair Display**.
  🚫 한글에 Playfair Display 강제 금지(렌더 깨짐).
- **컬러**: 어스톤/모노톤만. Dark `#1A1D1B`/`#202521`, Light `#F9F8F3`/`#F4F2EC`/`#FAF9F5`,
  Accent=글래스모피즘(`bg-white/20`+`backdrop-blur-md`). 🚫 쨍한 원색 금지.
- **인터랙션**: 카드 hover = `hover-lift`(`-translate-y-1`+`shadow-xl`), 등장 = fade-up/wipe.
- **레거시 커머스 호환**: cart/checkout/order-complete/notices/mypage 삭제 금지, 하위호환 유지하며 확장.

## 7. Golden Flows — 배포 게이트 (전부 통과해야 프로모트)
클라이언트가 실제로 쓰는 흐름. 해당 경로 변경은 배포 전 스모크 통과 + 배포 후 프로덕션 카나리 필수.

| # | 플로우 | 시작점 | 통과 기준 |
|---|--------|--------|-----------|
| 1 | 1분 맞춤 진단 | `/diagnosis` | 응답 → `/diagnosis/result`에 매칭 상품+보험 추천 렌더 |
| 2 | 스토어 구매 여정 | `/shop` | 상품 → 상세 → 장바구니 → `/checkout` → `/order-complete` 완결 |
| 3 | 펫보험 분석·신청 | `/insurance` | recommend → apply → complete, 증권 업로드 |
| 4 | 브랜드관 | `/brands` | 목록 → `/brands/[id]` 상세 |
| 5 | 케어키트 B2B 신청 | `/landing/care-kit` | 파트너 신청 폼 제출 |
| 6 | 회원 | `/login` `/signup` `/mypage` | 가입→로그인→마이페이지 상태 유지 |
| 7 | **관리자 콘솔 CRUD** | `/admin` | orders·products·members 등 목록/상세 렌더·수정 |

> ⚠️ **관리자 화면(#7)은 클라이언트의 주 사용 surface.** "코드가 바뀐 곳"이 아니라 "클라이언트가 쓰는 곳" 기준으로 검증.

## 8. Git · 배포 · 자동 검증

### 8-1. 브랜치 전략 (Atomic — §0 원칙 3 강제)
- **`main` = 통합 브랜치**(항상 배포 가능). **main 관리자 = mim1012** — 머지 수행·최종 책임.
- **모든 작업은 `main`에서 딴 짧은 브랜치. 장기 브랜치 금지.** 목적 1개 = 브랜치 1개, 끝나면 삭제.
- **브랜치 네이밍 (Decision Flow §0-2와 1:1):**
  | 유형 | prefix | 담당 | 예 |
  |------|--------|------|----|
  | 화면 표현 | `fe/design-*` | dad | `fe/design-hero-video` |
  | 화면 동작 | `fe/behavior-*` | dad | `fe/behavior-cart-guard` |
  | 계약 변경 | `contract/*` | 확정=mim | `contract/insurance-quote` |
  | API·DB 연결 | `be/*` | mim | `be/orders-supabase` |
  | 내부 성능 | `perf/*` | mim | `perf/rsc-brand-list` |
- **main 직접 push 금지(양쪽 다).** 반드시 PR. push 전 항상 `git pull --rebase origin main`.
  하루 1회 이상 `git merge origin/main`으로 동기화(발산 방지).
- ⭐ **통합 브랜치(`integrate/*`) 동시 작업 프로토콜 (2026-07-12 — 실제 사고 2건에서 도출):**
  1. **통합 브랜치 위 직접 작업 금지(양쪽 다).** dad는 `integrate/*`에서 `fe/design-*`를 따서 작업하고
     **PR로 integrate에 머지**한다(CI가 `integrate/**`에도 돌므로 게이트 유효). mim의 데이터/마이그레이션
     작업도 오래 걸리면 `be/*`로 딴다. — 근거: 통합 커밋 `b85e723`에서 dad 리디자인이 병합 유실된 사고.
  2. **하나의 로컬 작업트리(체크아웃 폴더) = 한 시점에 한 세션.** 두 IDE/세션이 같은 폴더를 동시에 만지면
     서로의 미커밋 파일을 오인한다(실제: 다른 세션이 0018 마이그레이션을 "정체불명 파일"로 보류 처리).
     동시에 하려면 `git worktree`로 폴더를 분리할 것.
  3. **작업 시작 선언.** 통합 브랜치에 영향 주는 작업은 시작 전에 SESSION.md(또는 팀 채널)에
     "누가 · 어떤 파일/영역 · 어느 브랜치" 한 줄을 남긴다. 같은 파일이 겹치면 먼저 선언한 쪽 우선, 뒤쪽은 rebase 책임.
  4. **push 전 `git pull --rebase origin integrate/<name>`** — integrate에서도 main과 동일하게 적용.
- **공식 저장소**: `https://github.com/mim1012/baekjo-obj` (소유 = mim1012). 구 저장소는 이관 완료.
- **하드 강제(✅ 2026-07-12 적용, 같은 날 개정)**: `main` 보호 규칙 활성 — PR 필수 + `verify` required status check(strict) +
  force-push/삭제 차단 + **enforce_admins ON**(admin 포함 직접 push 불가).
  **사람 리뷰 승인 요건은 제거(2026-07-12, mim 결정)** — 머지 승인 기준은 CI(`verify`) green + **§8-6 삼중 검증**(opus·codex·Playwright)이다.
  코드 리뷰 가능 인력이 mim뿐인 팀 구성에서 사람 승인 요건은 자기승인 모순이라 게이트에서 제외. dad의 리뷰는 코드가 아니라
  **화면(스크린샷·프리뷰)** 기준으로 한다.

### 8-2. Commit 규칙 (Atomic Commit)
- 형식: `type(scope): 설명` — type = `feat/fix/refactor/perf/docs/test/chore`.
- 커밋 1개 = **독립적으로 검증 가능한 최소 변경.** 이전 세션 작업물을 한 방에 묶어 커밋 금지.

### 8-3. PR 규칙 & 템플릿 (Atomic PR)
- PR 1개 = 리뷰 가능한 단위. **작성 lane ≠ 검증 lane**(자기승인 금지) — 검증 lane = §8-6 삼중 검증(opus·codex·Playwright), 사람 승인은 요건 아님(2026-07-12 개정).
  계약(contract-change) PR은 **dad·mim 양쪽 인지 필수**(dad는 화면/스크린샷 기준으로 확인).
```markdown
## 유형
- [ ] design  [ ] behavior  [ ] contract-change  [ ] data-integration  [ ] perf-internal
## 변경 요약
(무엇을 왜)
## 콘센트 영향
- 계약(types/storage 시그니처) 변경? [ ] 없음  [ ] 있음 → 모든 호출부 동반 수정 완료
## 골든플로우(§7) 영향
(해당 번호 / 없음)
## 검증
- [ ] npm run build  [ ] npm run lint  [ ] (디자인 변경 시) 스크린샷 첨부
```

### 8-4. CI · 배포
- **CI 게이트(IDE 무관·자동)**: `.github/workflows/ci.yml`가 **typecheck+build+lint** 실행.
  실패하면 머지 불가 → drift가 프로덕션에 못 샌다. **어떤 IDE(Antigravity/Claude/Codex)로 짰든 GitHub에서 똑같이 걸린다.**
  - ✅ **통합 브랜치 게이트 (2026-07-12 해소)**: `on.pull_request/push.branches`에 `integrate/**` 추가됨 —
    통합 브랜치로 들어오는 PR/push에서도 CI가 돈다(integrate 브랜치 push 3건 초록불로 검증).
  - ✅ **branch protection (2026-07-12 적용 완료)**: `verify` 잡이 **required status check**(strict)로 지정됨.
    CI 빨간불이면 머지 불가 — 게이트가 "권고"가 아니라 "차단"이다. enforce_admins ON이라 admin도 예외 없음.
    — **크로스 IDE 협업에서 신뢰할 수 있는 유일한 공통 심판이 이 CI다.**
- **배포**: preview → 골든플로우 스모크 → 프로모트. 직접 prod 배포 금지. 세션당 1배치.
- **납품 증빙**: 마일스톤마다 골든플로우 수동 1회 + 스크린샷/녹화 → `docs/` 보관(분쟁 방어).

### 8-5. Definition of Done (완료 정의)
`npm run build` 통과 · `npm run lint` 통과 · debug 로그 제거 · 해당 골든플로우(§7) 스모크 통과 ·
계약 변경 시 모든 호출부 동반 수정으로 빌드 green · PR 라벨과 브랜치 prefix 일치 · **§8-6 검증 게이트 통과.**

### 8-6. ⭐ 검증 게이트 — 3중 통과해야 "완료" (2026-07-12 확정)
> 리뷰 findings 를 한 모델이 놓치는 걸 막고(교차검증), 코드가 아니라 **실제 프리뷰에서 동작함**을 증명한다.
> 작성 lane 과 검증 lane 은 분리한다(작성자·작성 모델의 자기승인 금지). 아래 셋을 **모두** 통과해야
> 머지·프로모트한다. 통과 증빙(두 리뷰 결론 + Playwright 결과)을 커밋/PR 에 남긴다.
>
> 1. **opus 리뷰** — 드리프트·계약(§4)·보안 관점의 적대적 리뷰가 GREEN.
> 2. **codex(GPT-5.5) 리뷰** — opus 와 독립된 2차 리뷰가 pass. 서로 다른 관점으로 교차검증한다.
> 3. **Playwright 프리뷰 검증** — 변경이 닿는 골든플로우(§7)를 **실제 프리뷰 배포**에서 구동해 통과.
>    프리뷰가 Vercel Authentication 뒤에 있으면 protection bypass 토큰(`x-vercel-protection-bypass`
>    헤더 / `?x-vercel-set-bypass-cookie`)으로 접근한다.
>
> 셋 중 하나라도 findings·실패가 나오면 **수정 후 재검증**한다(빌드 green 만으로는 완료가 아니다).
> 이 게이트는 어떤 IDE(Antigravity/Claude/Codex)로 짰든 동일하게 적용된다.

## 9. 명령어
```bash
npm install     # 의존성 설치
npm run dev      # 개발 서버 (http://localhost:3000)
npm run build    # 프로덕션 빌드 (배포 전·머지 전 필수)
npm run lint     # ESLint (완료 전 필수)
```
