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

### 0-1-1. 세션 수명주기 — Codex/Claude 공통 인수인계
1. **첫 응답 전 `SESSION.md`를 읽는다.** 새 Claude Code/Codex/Antigravity 세션에서 프로젝트 상태·브랜치·환경·남은 일을 말하거나 작업을 시작하기 전에는 반드시 `SESSION.md` 최신 내용을 확인한다. 사용자가 단순 인사나 프로젝트와 무관한 질문만 한 경우는 예외다.
2. **`세션 마감`은 자동 갱신 트리거다.** 사용자가 `세션 마감`, `session close`, `마감 정리`를 입력하면 답변만 하지 말고 `SESSION.md`를 갱신한다. 포함할 것: 현재 브랜치, 변경 파일/커밋, 실행 중 서버·환경(staging/prod/local), 검증 결과, 미완/다음 액션, 사용자가 결정해야 할 사항.
3. **마감 갱신은 사실만 쓴다.** git 상태·최근 커밋·테스트/빌드 출력·서버 URL·DB 환경을 다시 확인하고 기록한다. 추측이나 기억으로 숫자·URL·브랜치명을 쓰지 않는다.
4. **Codex는 마감 스크립트를 먼저 쓴다.** 이 프로젝트에서 `세션 마감`을 처리할 때는 먼저 `scripts/session-close.ps1 -Apply`를 실행해 git/env/server/commit 사실을 수집한 뒤, 생성된 `SESSION.md` 초안의 TODO를 실제 완료·검증·다음 액션으로 채운다.
5. **main 보호와 충돌을 존중한다.** `SESSION.md`가 직접 갱신 가능한 브랜치에 있으면 수정하고, main 보호/충돌/권한 때문에 직접 반영할 수 없으면 갱신용 diff 또는 별도 브랜치/PR 경로를 남긴다. 기존 세션 기록은 삭제하지 말고 최신 상태를 위쪽에 누적한다.

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
| DB | **Supabase** (`@supabase/supabase-js` 2) | 클라이언트는 `src/lib/supabase/server.ts` **하나뿐**(service-role·server-only) — §10-3 |
| 인증 | **next-auth v5(beta)** + bcryptjs | Kakao·Naver + credentials. 가드는 `src/proxy.ts`(⚠️ middleware 아님) — §10-7 |
| 결제 | **Toss Payments SDK 2** | `src/lib/payments/*` 상태기계, 재고 RPC는 마이그레이션 — §10-6·10-8 |
| 메일 | **nodemailer 7** | `src/lib/email/*` |
| E2E | **Playwright 1.61** | ⚠️ 기본 타깃이 라이브 프리뷰 — §10-10 |
| 데이터 | **Supabase DB가 화면의 진실 소스.** 브라우저 → `storage.ts`(콘센트) / 서버 → `lib/*/repo.ts` | ⚠️ `src/data/{products,brands}.ts`는 **가짜데이터가 아니라 재시드용 정본**이다(고쳐도 화면 안 바뀜 — §3). 그 외(`notices`·`reviews`·`concerns` 등)는 아직 API 없는 정적 콘텐츠 — §4-6 |

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
>
> **실측 (2026-07-17 저녁 재실측): `page.tsx` 59개 = 서버 28 + `'use client'` 통짜 31.** 통짜 client가 절반이며
> **그 자체로 위반이 아니다**(§10-5 — 판단 기준은 "손님이 보나, 직원이 보나"). 새 페이지에 "무조건 쪼갠다"고
> 오해하지 말 것. 서버 28개 중 실제로 repo를 읽는 건 12개고, `*Client.tsx`라는 **파일명 관례를 따르는 건 4개뿐**
> (`/shop`은 `ShopContent.tsx`) — **파일명으로 세지 말고 `'use client'` 유무로 판단한다.** 상세는 §10-4.

### ⭐ 3-1. 배선보다 분리가 먼저다 (2026-07-17 신설 — 표현 드리프트의 유일한 근본 대책)

> **드리프트는 두 종류다. 하나로 묶어서 규칙을 쓰면 반드시 실패한다.**
>
> | | **A. 값 드리프트** | **B. 표현 드리프트** |
> |---|---|---|
> | 언제 | dad→mim 인계 후 | dad가 UI를 고칠 때 |
> | 뭐가 어긋나나 | `rating` 4.8 vs 4.5 (**값**) | 섹션 사라짐·카피 바뀜 (**마크업**) |
> | 원인 | Mock가 안 죽고 "정본"이 됨 | **같은 파일을 둘이 편집** |
> | 대책 | 사본을 **하나로** (§4 원칙 0) | 파일을 **둘로** (이 절) |
>
> 방향이 정반대라 한 문장으로 못 쓴다. §4 콘센트 규칙과 eslint 가드는 **A만** 겨냥한 무기였고,
> 그래서 B는 손도 대지 않은 채 계속 재발했다.

**규칙: mim이 dad에게서 페이지를 받으면, 첫 작업은 데이터 배선이 아니라 레이어 분리다.**
쪼갠 다음에야 배선한다. 서버 데이터를 읽지 않는 순수 폼 페이지는 위 예외대로 분리 대상이 아니다.

**왜 이 순서인가 — 안 쪼갠 채 배선하면 mim이 dad 마크업을 덮어쓸 경로가 열려 있다:**
- `SESSION.md:302` — 백엔드 커밋 `d572653`이 **dad 상세 패널을 덮어씀**. dad가 지운 감사 뱃지 부활,
  §6 팔레트 위반(`text-red-600`), `<ProductPurchaseInfo />` 섹션 삭제, aria-live 토스트 → `alert()` 퇴화.
- `b7e895e` — 커밋 제목이 문자 그대로 **"섹션 카피 드리프트"**. 배선 중 밀려난 dad 카피를 손으로 되돌린
  기록이며, 대상 파일이 `src/app/brands/[id]/page.tsx` — **안 쪼개진 페이지**다.
- `b85e723` — dad 리디자인을 mim 백엔드 위에 손으로 재통합(40파일 +2891/−1150).

쪼개면 mim이 `*Client.tsx`를 열 이유 자체가 사라진다. **충돌은 합의가 아니라 구조로 막는다**(§4-6과 같은 사상).

**분리 현황 (2026-07-17 실측):**
- ✅ 분리 완료 **4개**: `HomeClient` · `ProductDetailClient` · `ProductTabsClient` · `BrandProductsClient`
  (전부 `src/components/` 아래 있다 — `src/app/**/*Client.tsx` 글롭이 매칭 0건이던 이유)
- ❌ 미분리 **21개**(통짜 `'use client'` + `useEffect`로 서버 데이터 읽음) — **여기가 현재의 충돌 표면이다**:
  `/admin`(대시보드) · `/admin/brands` · `/admin/categories` · `/admin/inquiries` · `/admin/kits` ·
  `/admin/partners` · `/admin/products` · `/admin/settings` · `/admin/survey` · `/admin/survey-results` ·
  `/diagnosis` · `/diagnosis/result` · `/cart` · `/checkout` · `/login` · `/signup` · `/mypage` ·
  `/order-complete` · `/auth/complete` · `/verify-email` · `/insurance/recommend`
  - 교과서적 사례: `src/app/diagnosis/result/page.tsx:3-16` — `'use client'` + `useEffect` +
    `getPublicBrands`/`getPublicProducts`/`getSurveyConfig`가 한 파일에.
  - ⚠️ 위 목록 중 `/cart`·`/checkout`·`/login`·`/signup` 등 **순수 폼은 분리 대상이 아니다**(위 예외).
    실제 분리 대상은 **서버 데이터를 첫 화면에 그려야 하는** admin 목록들과 `diagnosis/result`다.
- 🔸 `/admin/orders`·`/admin/members`·`/admin/qna`·`/admin/insurance`는 7줄 `'use client'` shim이
  `src/components/admin-new/**`에 위임한다. **파일은 갈렸지만 §3 모양이 아니다** — 서버 wrapper가 없어
  데이터 페칭이 여전히 dad 컴포넌트 트리 안에 있다. 분리 대상.

**게이트 순서(중요):** `.github/CODEOWNERS`의 `require_code_owner_review`는 **이 분리가 끝난 뒤** 켠다.
지금 켜면 mim의 배선 PR이 상시로 `src/components/**`를 건드려 전부 dad 승인 대기에 걸리고,
admin bypass(`current_user_can_bypass: always`)로 우회하는 습관만 남는다(PR #98 참조).

### 3-1-1. 인계·수정 운영 절차 (사람용 요약 — 2026-07-18 확립)

> 위 §3-1의 규칙을 "누가 언제 뭐라고 말하면 되는가"로 압축한 것. 세부 근거는 §3-1.

1. **dad가 페이지를 넘기면, 첫 지시는 "쪼개고 배선해"다.** 배선을 먼저 하지 않는다.
   (쪼개기 = dad 마크업을 `*Client.tsx`로 그대로 이사 — 화면 무변화. 그 다음 wrapper에서 repo 배선.)
2. **쪼갠 후 dad 수정은 인계 절차가 없다.** dad는 자기 파일(`*Client.tsx`)을 자기 브랜치에서 언제든 고친다.
   mim과 동시 작업해도 충돌 표면이 없다. "가져간다/돌려준다" 개념 자체를 쓰지 않는다.
3. **조율이 필요한 유일한 순간 = 건네주는 데이터(props)가 바뀔 때.**
   dad가 "이 데이터도 그리고 싶다" → mim이 wrapper에서 props 추가(선행) → dad가 그린다(후행).
   동작 추가(저장 버튼 등)도 동일: 필요한 storage 함수가 없으면 mim에게 요청 후 사용.

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
| 브랜드 로고 이미지 | **dad**(디자인) | `public/brands/*` 업로드 + `/admin/brands`에서 `logo` 경로 지정 | placeholder → 채우면 즉시 표시 |
| 상품 판매가·재고 | **mim/기획** | `/admin/products` 입력 | 카드에 `0원` 표시(저장값은 `null` 유지) |
| 정적 콘텐츠(공지·후기·케어가이드) | **dad** | `src/data/*` (아직 API 라우트 없음) | 해당 없음 |
| 상품 상세 본문(detailBlocks)·썸네일 | **mim** → 추후 업체 관리자 | `/admin/products` 입력 | 폴백: 단일 image 박스 |

> ⭐ **products·brands 는 DB가 유일한 진실이다 (2026-07-17 개정 — `be/kill-static-seed-canon`).**
> `src/data/{products,brands}.ts`는 **삭제됐다.** 두 도메인의 값을 바꾸는 경로는 **`/admin` 하나뿐**이다.
>
> **왜 지웠나:** 화면은 이미 DB만 읽고 있었는데(런타임 import 0건) 그 파일들이 "재시드의 정본"으로 남아
> **같은 값이 파일과 DB 두 곳에 손으로 적히고 있었다.** 사람 기억력 말고는 둘을 맞추는 게 없었고,
> 그 결과가 정적↔DB 불일치를 수습하려고 만든 마이그레이션 `0014`·`0015`·`0016`·`0017`·`0018`이다.
> `0035`는 프로덕션 값을 파일에 **역기입**까지 했다. lint(`no-restricted-imports`)는 *읽기 경로*만 막았기
> 때문에 드리프트가 화면 레이어에서 **시드 레이어로 이사**했을 뿐이었다 — 거기엔 테스트도 CI도 없다.
>
> **DB 재구축 경로:** 정본 파일이 아니라 `supabase/migrations/`다(`0004b` 최초 시드 + `0018` 전량 재시드 +
> 이후 정정분). `node scripts/apply-migrations.mjs`로 재생한다. 파일이 유일한 복구 수단이 아니었다.
>
> 🚫 **`src/data/`에 products·brands를 재도입하지 말 것.** 필요해 보이면 그건 `/admin`에 없는 필드라는
> 뜻이므로 admin 편집 경로를 추가하는 게 맞다. eslint `no-restricted-imports`가 재도입을 계속 막는다.

## 4. ⭐ drift 방지 — "콘센트" 규칙 (이 프로젝트의 제1원칙)
프론트는 가짜 데이터로, 백엔드는 진짜 데이터로 만든다. **둘이 따로 놀아(=drift) 화면이 조용히 깨지는 것**이
가장 위험하다. 이 리포엔 이미 그걸 막는 구조가 있으니 아래를 지키면 drift가 구조적으로 불가능해진다.

> ⭐ **원칙 0 — Mock의 수명 (2026-07-17 신설. 아래 1~6번보다 먼저 읽을 것).**
>
> **UI Mock는 화면 검증과 클라이언트 승인만을 위한 임시 산출물이며,
> 운영 데이터·Seed·복구 데이터의 정본으로 사용하지 않는다.**
>
> **Mock는 DB에 시드된 순간 죽는다.** 이후 그 값의 입력구는 `/admin` 하나뿐이고,
> 복구 정본은 `supabase/migrations/`다.
>
> 🚫 **"복구용으로 남겨두자"가 Mock를 살려두는 단골 명분이다** — 그 명분이 `src/data/{products,brands}.ts`를
> "재시드의 정본"으로 승격시켰고, 그래서 같은 값이 ① 정본 파일 ② 손으로 타이핑한 시드 SQL ③ `/admin`이
> 실시간 수정하는 라이브 DB **세 곳에 손으로** 적히게 됐다. 그 결과가 `0014`~`0018`(정적↔DB 불일치 수습)과
> `0035`(프로덕션→파일 **역기입**)다. 아래 1~6번(콘센트·eslint 가드)은 *읽기 경로*만 막기 때문에
> 드리프트를 화면 레이어에서 **시드 레이어로 이사시킬 뿐** 없애지 못한다 — 거긴 lint도 테스트도 CI도 없다.
>
> **알려진 예외 (2026-07-17 기준 — 늘리지 말 것):**
> - `reviews.ts`·`qna.ts` — `src/lib/adapters.ts:45`가 seed와 DB를 **의도적으로 병합**한다
>   (`source: 'seed' | 'user'` 태깅). 설계된 동작이라 예외. 단 seed 리뷰는 admin 편집 경로가 없어
>   수정이 저장되지 않는다 — 별도 결정 필요.
> - `homeContent.ts`·`survey.ts` — config **기본값 전용**(저장값이 없을 때만 쓰는 fallback).
>   운영 데이터의 정본이 아니라서 예외.
> - `company.ts` — 법정정보/정적 config. 관리자 운영 대상 아님.
>
> **새 도메인을 이 예외 목록에 추가하려면 admin 편집 경로를 먼저 만들 것.** 예외가 늘어나는 건
> "관리자에 그 필드가 없다"는 신호지, Mock를 살려둘 근거가 아니다.

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

   ✅ **적용 완료 (`eslint.config.mjs:17-35`).** 최초 제안(`src/components/**` + `*Client.tsx`)은 `page.tsx`처럼
   Client가 아닌 파일명이 규칙을 우회하는 사각지대가 있어, 2026-07-13 opus 리뷰(H1)에서 **`src/app/**` 전체로
   범위를 넓혀 봉합**했다. 서버 wrapper도 `@/data/*`가 아니라 repo 경유가 원칙이라 예외는 없다.

   ```js
   // eslint.config.mjs — 현행 (실측 2026-07-17)
   {
     files: ["src/app/**/*.{js,jsx,ts,tsx}", "src/components/**/*.{js,jsx,ts,tsx}"],
     rules: {
       "no-restricted-imports": ["error", { patterns: [
         { group: ["@/data/products", "@/data/brands"],
           message: "실시간 데이터는 콘센트(storage) 또는 repo 로만 읽으세요 — 컴포넌트 직접 import 금지(§4)." },
       ]}],
     },
   }
   ```

   > **이 예외 목록은 설계도가 아니라 남은 공사 목록이다.** `concerns/notices/reviews/homeContent/shopFilters`가
   > `@/data`에 남아 있는 건 "파일에 두는 게 옳아서"가 아니라 **아직 API 라우트·관리자 화면이 없어서**다.
   > 이사가 끝나면 예외는 지워지고 최종 상태는 전부 콘센트 경유다. 반대로 **"전부 `@/data`로"는 불가능** —
   > 파일은 배포 시점에 얼어붙어 관리자가 못 바꾸므로 골든플로우 7번(관리자 CRUD)이 죽는다.

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
- ⭐ **병합·시각 회귀 프로토콜 (2026-07-12 — 드리프트 전수조사 사고의 재발 방지 게이트):**
  1. **표현 파일 충돌 = 기계적 해소.** `*Client.tsx`·`src/components/**`·`globals.css` 병합 충돌은
     **dad-side 채택 + 데이터 배선(import·props)만 재적용**하고, 병합 커밋에 "충돌 N개 전부 dad-side" 명기
     (`b7e895e` 검증 패턴). mim의 역할은 표현 파일에 배선만 — 마크업·스타일 판단은 하지 않는다.
     **"표현"의 범위(2026-07-12 사용자 확정): 색상·뱃지·텍스트 표기 방식뿐 아니라 섹션별 위치·배치·순서
     (페이지 내 레이아웃 구조)까지 전부 dad 기준이다.** 백엔드 배선 중 섹션을 옮기거나 순서를 바꾸는 것도
     표현 변경이며 dad 정본을 따른다.
  2. **시각 회귀 게이트.** `tests/golden/visual.spec.ts`가 골든플로우 7경로 × 데스크톱/모바일 = 14장을
     Vercel Preview 배포 대상으로 픽셀 비교(`.github/workflows/visual.yml`, `deployment_status` 트리거).
     표현 유실이 병합에 섞이면 사람 전수조사 없이 CI가 잡는다.
  3. **베이스라인은 CI(Linux)에서만 생성.** 로컬 Windows 스냅샷은 폰트 렌더 차이로 전부 오탐 — 커밋 금지.
     갱신 = PR에 `update-baselines` 라벨 부착 또는 `update-baselines.yml` 수동 dispatch(CI가 재생성·커밋).
  4. **콘텐츠 변경 PR(재시드·썸네일 교체 등)은 베이스라인 갱신 커밋을 같은 PR에 포함.** DB가 화면의
     진실 소스라 콘텐츠 변경도 화면을 바꾼다 — 안 넣으면 정상 재시드가 visual 빨간불로 오탐.
  5. **표현 파일 소유권은 `.github/CODEOWNERS`(dad)로 명시.**
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
npm install      # 의존성 설치
npm run dev      # 개발 서버 (http://localhost:3000)
npm run build    # 프로덕션 빌드 (배포 전·머지 전 필수)
npm run lint     # ESLint (완료 전 필수)
npm run test:e2e # Playwright 전체 (⚠️ 기본 타깃이 로컬이 아니라 라이브 프리뷰 — §10-10)
```

```bash
# 단일 테스트 (파일/프로젝트 지정)
npx playwright test tests/golden/home.spec.ts --project=chromium
npx playwright test --project=admin          # 브라우저 없는 순수 검증 프로젝트

# 로컬을 타깃으로 e2e (이때만 dev 서버가 자동으로 뜬다)
E2E_BASE_URL=http://localhost:3000 npx playwright test --project=chromium

# 마이그레이션 적용 (npm 스크립트 없음 — 직접 실행)
node scripts/apply-migrations.mjs           # SUPABASE_ACCESS_TOKEN(sbp_) 필요
```

## 10. 코드 아키텍처 (추측 말고 이 기준 — 전부 2026-07-17 실측)

> §0~§9가 "어떻게 협업하나"라면, §10은 **"코드가 어떻게 생겼나"**다. 새 세션이 매번 코드를 뒤져
> 재발견하던 것을 못 박는다. 숫자·경로는 실제로 읽고 센 값이다.

### 10-1. ⭐ 뿌리 — 코드가 도는 곳이 두 군데고, 한쪽만 DB 비밀번호가 있다
나머지 규칙은 전부 여기서 따라 나온다.

| | 서버 | 브라우저 |
|---|---|---|
| DB 비밀번호(`SUPABASE_SECRET_KEY`) | **있음** | **없음** |
| 할 수 있는 것 | DB 직접 읽기 | 클릭·입력·상태·애니메이션 |
| 못 하는 것 | 클릭 못 받음 | DB 직접 못 읽음 |

### 10-2. 그래서 데이터 문이 두 개 — storage.ts ↔ repo.ts는 **같은 선의 양 끝**
⚠️ 이름이 헷갈리는 1순위. `repo`(repository)도 "저장소", `storage`도 "저장소"다. **이름 말고 비밀번호로 기억한다.**

- **`src/lib/storage.ts` (1381줄) = 브라우저 측.** 비밀번호가 없으니 **우리 API 라우트로 `fetch` 심부름**을 보낸다.
  `localStorage`(위시리스트 `baekjo_wishlist`)도 여기. **§4가 말하는 "콘센트"가 이것.**
  이름의 유래도 `localStorage` — **브라우저 물건이라 storage.**
- **`src/lib/<domain>/repo.ts` (16개) = 서버 전용.** **Supabase를 직접 부르는 유일한 계층.**
  각 파일 머리에 "이 파일 밖에서는 Supabase를 직접 호출하지 않는다"가 박혀 있다. row↔도메인 매핑
  (`ProductRow`→`Product`), snake_case↔camelCase, 방어적 정규화(`normalizePetType`→미지값은 `'both'`) 담당.
  이름의 유래는 repository 패턴 — **서버(백엔드) 물건이라 repo.**

```
② 브라우저 → storage.ts → app/api/* → lib/*/repo.ts → Supabase   ※ 갔던 길로 되돌아온다
① page.tsx(서버) ───────────────────→ lib/*/repo.ts → Supabase   ※ 자기 API HTTP 왕복 금지
```

### 10-3. 브라우저가 비밀번호 없이 데이터를 얻는 법 = **은행 창구**
손님은 금고 열쇠가 없어도 잔액을 안다. 창구에 부탁하면 되니까. **결과만 나가고 열쇠는 서버 밖으로 안 나간다.**

| 은행 | 우리 코드 |
|---|---|
| 손님(열쇠 없음) | 브라우저 |
| 창구 직원 | `app/api/*` 라우트 |
| 신분증 확인 | `lib/admin/requireAdmin.ts` |
| 금고 | Supabase |
| 열쇠 | `SUPABASE_SECRET_KEY` |

**②의 경로가 긴 건 불편해서가 아니라, 중간에 창구(신분증 확인)를 끼워넣기 위해서다.**

🚨 **금고 자체엔 잠금장치가 없다.** `src/lib/supabase/server.ts`가 유일한 클라이언트이고 **service-role 키**를 쓰므로
**RLS가 사실상 무력**하다. 창구(가드)가 유일한 방어선 — **새 API 라우트에 가드를 빼먹으면 금고가 통째로 열린다.**
DB가 막아줄 거라 가정하지 말 것.
- 이중 잠금: `import 'server-only'`(컴파일 타임 — 클라 컴포넌트에서 import하면 **빌드 실패**) + 런타임
  `typeof window !== 'undefined'` throw. 둘 다 의도된 것이니 **지우지 말 것.**
- 지연 생성 + 모듈 캐시(`cachedClient`), `auth: { persistSession: false, autoRefreshToken: false }`.
- **브라우저용 Supabase 클라이언트는 아예 없다.** ②가 API를 왕복할 수밖에 없는 이유이자, storage.ts가 1381줄인 이유.

### 10-4. 그래서 page.tsx가 두 종류 — **첫 줄만 보면 3초 만에 안다**
```
① 'use client' 없음 = 서버      → repo.ts     (홈·/shop·/brands·/experts …)
② 'use client' 있음 = 브라우저  → storage.ts  (/admin 목록·/cart·/checkout·/diagnosis …)
```

**실측 (2026-07-17 저녁 재실측) — 숫자 4개를 혼동하지 말 것:**

| 세는 대상 | 개수 |
|---|---|
| `page.tsx` 전체 | **59** |
| **② 클라이언트**(`'use client'` 있음) | **31** |
| **① 서버**(`'use client'` 없음) | **28** |
| ① 중 **repo로 DB를 직접 읽는 것** | **12** |
| `*Client.tsx`라는 **파일명**을 가진 것 | 4 |

⚠️ **①=28이지, 4도 12도 아니다.** 4는 파일명 관례를 센 것이고(`/shop`은 `ShopContent.tsx`라 여기서 빠진다),
12는 그중 DB를 읽는 것이다. 나머지 16개는 **DB를 안 읽는 서버 페이지**다 — 서버 페이지라고 다 DB를 읽지 않는다.
⚠️ **admin이 전부 ②인 것도 아니다** — `/admin/products/[id]`·`/new`·`/admin/brands/[id]`·`/admin/products/display`는 ①이다.

**어기면 벌어지는 일 (한쪽만 시끄럽다):**
- ②에서 `repo` import → **빌드 실패.** `server-only` 가드가 잡는다. **즉시 걸리니 오히려 안전하다.**
- ①에서 `storage` 호출 → **빌드 통과.** 서버가 자기 자신에게 HTTP를 건다. 에러가 안 나고 **조용히 느려진다 — 더 위험.**

### 10-5. ①/② 판단 기준 = **"손님이 보나, 직원이 보나"**
- **손님이 봄 → ①.** 검색로봇은 ②의 **빈 껍데기 html만 받고 간다**(JS 실행·fetch를 기다려주지 않음).
  `/shop`은 §7 골든플로우 2번의 **시작점**이라 여기가 검색에서 빠지면 구매 깔때기 입구가 막힌다.
  로봇이 백지를 보면 **손님도 백지를 본다**(같은 html) → 이탈.
- **직원만 봄 → ②로 충분.** admin은 로그인 뒤에 있고 검색 대상이 아니다. 첫 화면 0.5초 백지는 문제가 아니다.
  **통짜 client는 위반이 아니라 선택이다.**
- ⚠️ **`'use client'`는 보안 도구가 아니다.** 쓰는 이유는 **클릭·상태가 필요해서**고, 열쇠를 못 갖는 건
  그 결과로 따라오는 제약이다. 목적과 부작용을 뒤집지 말 것.
- 분리의 목적은 "브라우저가 먼저 그리게"가 **아니라** "서버가 DB를 미리 읽어 완성 html을 보내게"다(SSR·SEO·첫 페인트).
  서버는 클릭을 못 받으므로 데이터는 `page.tsx`, 표현·상호작용은 `*Client.tsx`로 나뉜다 — §3의 dad/mim 경계가
  **인위적 규칙이 아니라 이 구조적 경계선을 따라간 것**이다.

### 10-6. repo의 두 종류 (건드리기 전에 어느 쪽인지 볼 것)
| 종류 | 파일 | 모양 |
|------|------|------|
| **테이블 repo** | products·orders·members·brands·insurance·inquiries·reviews·shipments·partnerInquiries | 풀 CRUD. `SELECT_COLUMNS` 상수 + `XRow` 인터페이스 + `rowToX` 매퍼 |
| **싱글턴 JSONB 설정 repo** (각 ~28줄) | kits·partners·qna·survey·settings·categorySettings·insuranceContent | `id='default'` **한 행**의 `value jsonb`에 설정 통째로. `getXConfig`/`saveXConfig` upsert. 옆의 `config.ts`에 타입 + `defaultXConfig` 폴백(행 없을 때) |

- **`tracking/`도 repo가 없다** — `sweettracker.ts`는 스마트택배(스윗트래커) 폴링 어댑터. 배송 상태의 저장은 `shipments/repo.ts` 담당.
- **`payments/`는 repo가 없다** — 대신 상태기계: `decide.ts`(순수 결정 함수)·`execute.ts`·`confirmPayment.ts`·
  `cancelPending.ts`·`toss.ts`(Toss PG 어댑터). 결제 로직은 `decide.ts`의 순수 함수부터 볼 것.
- 도메인 부속: `products/`에 `validate.ts`·`formPayload.ts`·`splitProductInput.ts`(관리자 폼 입력을 컬럼 vs `detail` jsonb로 분리),
  `members/`에 `password.ts`(bcrypt)·`tokens.ts`, `admin/`에 `requireAdmin.ts`·`requireBrandScoped.ts`·`dashboardStats.ts`.

### 10-7. 인증 (next-auth v5) — 이중 방어
- **`src/lib/auth.config.ts`** = Node 의존 없는 공용(Kakao·Naver, `session.strategy: 'jwt'`).
  **`src/lib/auth.ts`** = Node 전용(credentials + bcrypt, `jwt()` 콜백). `{ handlers, auth, signIn, signOut }` export.
- 🔒 **손대면 안 되는 보안 장치 3개:**
  1. `DUMMY_PASSWORD_HASH`를 **유저가 없어도 항상 검증** — "없는 계정 / 소셜전용 / 틀린 비번"의 응답 시간을 맞춰
     타이밍 오라클을 막는다. 최적화한답시고 early-return 넣지 말 것.
  2. **소셜 로그인은 절대 admin이 될 수 없다** — kakao/naver는 `token.role`을 `'user'`로 하드 고정.
  3. `status === 'active'`만 로그인(pending/rejected/inactive 차단).
- ⚠️ **`middleware.ts`가 아니라 `src/proxy.ts` (36줄)** — Next 16이 `middleware` 파일 컨벤션을 폐기하고 `proxy`로 교체했다.
  matcher: `['/admin/:path*', '/api/admin/:path*']`. `/api/admin/*`→401/403 JSON, `/admin/*`→`/login?error=admin`.
- **`requireAdmin`을 왜 또 부르나:** JWT의 role은 **로그인 시점 스냅샷**이라, 강등·비활성화된 admin이 세션 만료까지
  admin으로 남는다. 그래서 매 요청 DB를 재조회한다. proxy만 믿고 생략하지 말 것.

### 10-8. 마이그레이션 · 시드 (`supabase/`)
- `supabase/migrations/NNNN_snake_case.sql` — **수기 작성**(생성기 없음), 파일명 순 적용. 현재 **0001–0040**.
  `0005`·`0032` 결번, `0004b` 같은 letter suffix 변형, 그리고 **`0034`가 2개**
  (`0034_move_catcode_products_to_alloming`·`0034_shipments` — 번호 충돌, 새 번호 딸 때 주의).
- **시드 파일이 없다** — 시드/재시드도 마이그레이션이다(`0004b_seed_products_brands.sql`,
  `0018_reseed_brands_products.sql`). §3의 "DB가 화면의 진실 소스"와 맞물린다.
- 결제 상태기계는 상당수가 Postgres RPC: `0021_decrement_stock_for_order`, `0023_restore_stock_for_order`,
  `0024_cancel_and_restore`, `0025_reclaim_deadletter`, `0027_increment_reclaim_attempts`.
- **러너 `scripts/apply-migrations.mjs`가 특이하다** — 레포에 psql/Supabase CLI가 없어서 생 SQL을
  **Supabase Management API**(`api.supabase.com/v1/projects/{ref}/database/query`)에 POST한다.
  `SUPABASE_ACCESS_TOKEN`(`sbp_`) 필요. 적용 이력은 `public._migrations` 테이블.
  ⚠️ **함정 2개:** `User-Agent` 헤더 필수(없으면 Cloudflare 1010) · 0001–0008은 러너 이전 것이라
  "already exists"를 적용된 것으로 간주해 베이스라인 처리한다.
- `scripts/session-close.ps1`의 `Get-EnvLabel`은 `.env.local`의 Supabase project ref를 읽어
  `aeooyivfijthfcrfrnyk`=staging / `vgeqpbyyggxxaeowtbtj`=**prod(주의)**로 라벨링한다 — 로컬이 prod를 보는 사고 방지용.
- 🚫 **커밋 안 된 SQL을 prod에 직접 적용 금지 (2026-07-17 사고에서 신설, mim 승인).** 스키마·데이터를 바꾸는
  SQL이 prod에 도달하는 경로는 **`supabase/migrations/`에 커밋 → PR 머지 → CI `migrate` 잡** 하나뿐이다.
  Management API로 prod에 직접 날리는 건 읽기 전용 조회만 허용(단건 hotfix도 같은 SQL을 마이그레이션
  파일로 먼저 커밋한 뒤 push가 적용하게 한다). — 근거: 미커밋 `0021_official_brand_catalog_sync.sql`이
  prod에 직접 적용된 뒤 어느 브랜치·워크트리에도 남지 않아 유실됐고, `_migrations`는 이름·적용시각만
  저장해 SQL 복구가 불가능했다. 그 결과가 2026-07-17 상품 이미지 404(p15~p18이 배포된 적 없는
  `.jpg`를 참조). 이력 없는 prod 변경 = 재현 불가·롤백 불가·원인 추적 곤란.

### 10-9. 타입 (`src/types/index.ts` — 609줄, 단일 배럴)
- 서브 파일 없이 전 도메인 타입이 여기 하나에. **§4-3 "설계도 한 장"의 그 한 장이 이 파일이다.**
- ⚠️ **상태값이 한글 문자열 리터럴이다**: `PAID_PAYMENT_STATUS: PaymentStatus = '결제완료'`. enum·영문 코드가 아니다.
- 관용구: `ORDER_STATUSES`/`PAYMENT_STATUSES`를 `as const` 배열로 export하고
  `type OrderStatus = (typeof ORDER_STATUSES)[number]`로 파생 — 런타임 순회와 타입을 한 소스에서 동시에 얻는다.
  상태를 추가할 땐 배열에만 넣으면 타입이 따라온다.
- 주요 export: `Product`·`ProductOption`·`ProductDetailBlock`(union)·`Brand`·`BrandAuditReport` / `Order`·`OrderItem`·
  `CartItem` / `User`·`QnA`·`Review`·`ProductInquiry` / `InsuranceApplication` / `SurveyQuestion`·`SurveyResultRule` /
  `AdminDashboard*` 클러스터.

### 10-10. 테스트 (Playwright)
- ⚠️ **`playwright.config.ts`의 baseURL 기본값이 로컬이 아니라 라이브 Vercel 프리뷰 URL이다.**
  `E2E_BASE_URL` ?? `BASE_URL` ?? (하드코딩된 프리뷰). `webServer`(`npm run dev`)는 **baseURL이
  localhost/127.0.0.1일 때만** 뜬다. 무심코 `npm run test:e2e`를 돌리면 로컬 코드가 아니라 **프리뷰 배포본**을 검증한다.
- 4개 project: `chromium`(tests/golden — 유일하게 브라우저 사용) · `payments` · `products` · `admin`(브라우저 없는 순수 검증).
  `retries: 1`, `timeout: 60s`, `fullyParallel`.
- **`visual.spec.ts` (§8-2 시각 회귀 게이트):**
  - 7 골든플로우 × {desktop 1280×800, mobile 390×844} = **14장 고정 예산**. `/shop/[id]`는 콘텐츠 변동이 커서 제외
    (behavioral `shop.spec`이 커버).
  - 🚫 **`networkidle` 금지** — Vercel 프리뷰 툴바가 websocket을 계속 열어둬서 14/14 타임아웃(2026-07-12 실측).
    `settlePage()`가 `load` + 전체 스크롤 후 복귀로 framer-motion `whileInView`를 발화시킨 뒤 `fullPage` 캡처.
  - 베이스라인 파일명의 `-chromium-linux` 접미사가 로컬 Windows 실행이 CI 베이스라인을 덮어쓰는 걸 막는다(§8-2·3).
  - 관리자 샷은 `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD`가 없으면 **조용히 skip**(공개 레포라 폴백 없음).
    프리뷰 Deployment Protection은 `VERCEL_AUTOMATION_BYPASS` 헤더로 통과.
