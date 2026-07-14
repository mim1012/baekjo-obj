# 백조오브제 UI 레포 (BAGJO) — 에이전트 작업 규칙

> 이 레포는 **UI 목업·디자인·레이아웃 전용 작업장**이다. 소유자(dad041566-hue)가 Antigravity로
> 화면을 만들면, 기여자(mim1012)가 주기적으로 **표현 파일만 수확(diff 추출)**해 프로덕션 레포
> (`mim1012/baekjo-obj`)에 이식하고 실데이터를 배선한다.
> **에이전트가 지킬 제1원칙: 아래 🔴 구역을 절대 수정하지 않는다.** 🔴 구역은 프로덕션 스냅샷의
> 동결된 배경이며, 여기서 고친 내용은 수확 시 버려질 뿐 아니라 프로덕션 배선과 충돌을 일으킨다.

## 0. 이 레포에서 하는 일 / 안 하는 일

- ✅ 하는 일: 화면 디자인, 레이아웃, 컴포넌트 마크업·스타일, 애니메이션, 이미지 자산, mock 데이터로 화면 확인.
- ❌ 안 하는 일: DB·API·인증·결제·성능·테스트·CI. 그건 전부 프로덕션 레포(mim) 소관.
  화면에 데이터가 "진짜로" 연결되는 것도 프로덕션 쪽에서 일어난다 — 여기서는 mock이면 충분하다.

## 1. 파일 구역 — 작업 전 반드시 이 표로 판정

### 🟢 자유 구역 (마음껏 수정·생성 — 여기 작업물이 프로덕션에 그대로 이식된다)
```
src/components/**                 # 모든 표현 컴포넌트 (*Client.tsx 포함)
src/app/**/*Client.tsx            # 페이지 클라이언트 표현부
src/app/globals.css               # 전역 스타일·토큰
public/**                         # 이미지·폰트 등 정적 자산
src/data/concerns.ts, notices.ts, reviews.ts, homeContent.ts, shopFilters.ts   # 정적 콘텐츠
```

### 🟡 신고 구역 (수정 가능 — 단, 커밋 메시지에 `[wiring]` 표시. mim이 수동 포팅한다)
```
src/app/**/page.tsx               # 페이지 wrapper. 신규 페이지·섹션 구조 변경 시만 만진다
src/app/**/layout.tsx
src/data/products.ts, brands.ts   # mock 확장은 자유 — 새 화면에 새 필드가 필요하면 여기에
                                  # 임의로 추가해 화면을 완성해도 된다(계약은 mim이 나중에 확정)
```

### 🔴 동결 구역 (수정 금지 — 읽기는 가능, 쓰기는 어떤 이유로도 불가)
```
src/lib/**                        # storage.ts·repo·auth·payments — 프로덕션 배선의 심장
src/app/api/**                    # API 라우트
src/types/index.ts                # 데이터 계약(설계도) — 정본은 프로덕션 레포
supabase/**                       # DB 마이그레이션
tests/**  .github/**              # 테스트·CI (이 레포에선 돌릴 필요 없음)
eslint.config.mjs  next.config.ts  tsconfig.json  package.json  # 설정·의존성
```

**에이전트 판정 규칙**: 작업이 🔴 파일 수정을 요구하는 것처럼 보이면, 수정하지 말고
"이 부분은 프로덕션(mim) 소관 — 🟡 방식(mock 확장)으로 우회하거나 mim에게 요청"이라고 보고한다.
예: "이 화면에 배송상태 필드가 없다" → `src/types/index.ts`를 고치지 말고
`src/data/*.ts` mock에 필드를 임의 추가해 화면을 완성한 뒤 `[wiring]` 커밋으로 남긴다.

## 2. 데이터 표시 규칙 (배선이 꼬이지 않게 하는 딱 2가지)

1. **컴포넌트는 데이터를 props 또는 `src/data/*` import로만 받는다.**
   🚫 컴포넌트 안에서 `fetch(...)`·`localStorage` 직접 호출 금지, API 라우트 호출 금지.
   🚫 컴포넌트 JSX 깊숙이 상품명·가격·목록을 하드코딩하지 말 것 — 파일 상단 상수나 props로 빼면
   mim이 실데이터로 교체할 때 기계적으로 갈아끼울 수 있다.
2. **`src/lib/storage.ts`의 함수를 이미 쓰고 있는 컴포넌트는 그 호출을 그대로 둔다.**
   함수 이름·인자·반환 사용부를 바꾸지 않는다(그 모양이 프로덕션과의 접점이다).
   새 컴포넌트에서는 storage를 부르지 말고 props/mock으로 시작하면 된다.

## 3. 디자인 규칙 (브랜드 — 위반 시 납품물 훼손)

- **폰트**: 한글·본문 = Pretendard / 영문 타이틀·장식(`font-editorial`) = Playfair Display.
  🚫 한글에 Playfair Display 적용 금지(렌더 깨짐).
- **컬러**: 어스톤/모노톤만. Dark `#1A1D1B`/`#202521`, Light `#F9F8F3`/`#F4F2EC`/`#FAF9F5`,
  Accent = 글래스모피즘(`bg-white/20`+`backdrop-blur-md`). 🚫 쨍한 원색 금지.
- **인터랙션**: 카드 hover = `hover-lift`(`-translate-y-1`+`shadow-xl`), 등장 = fade-up/wipe.
- **페이지 삭제 금지**: cart/checkout/order-complete/notices/mypage (레거시 커머스 호환).
- 스택: Next.js 16 App Router · React 19 · Tailwind v4 · framer-motion 12 · lucide-react.
  ⚠️ Next 16·Tailwind v4는 구버전과 문법이 다르다 — 추측 말고 `node_modules/next/dist/docs/` 확인.

## 4. 커밋·푸시 규칙

- main에 직접 커밋해도 된다(이 레포는 소유자 개인 작업장). 브랜치는 자유.
- **푸시 전 `npm run build` 통과 확인** — 깨진 트리는 어디까지가 의도인지 알 수 없어 수확 불가.
- 커밋 메시지: `design: <무엇을>` 형식. 🟡 구역을 건드렸으면 `[wiring]` 태그 포함.
  예: `design: 홈 히어로 리디자인` / `design[wiring]: 브랜드 상세 신규 섹션 + page.tsx 구조 변경`
- 🔴 구역 diff가 커밋에 섞이면 안 된다 — 에이전트는 커밋 전 `git status`로 🔴 경로 변경이 없는지 확인.

## 5. 프로덕션 반영 흐름 (소유자가 알아야 할 전부)

1. 화면을 만들고 main에 푸시한다.
2. mim에게 알린다("홈 새 버전 올렸어") — mim이 표현 파일을 수확해 프로덕션 PR을 만든다.
3. mim이 **실데이터가 연결된 프리뷰 링크**를 보낸다. 확인할 것은 하나:
   **"내가 올린 화면 그대로인가."** 그대로면 승인, 다르면 어디가 다른지 말한다. 코드 리뷰는 불필요.
4. 수확이 끝나면 mim이 이 레포에 `harvested/<날짜>` 태그를 찍는다(다음 수확의 기준점 — 지우지 말 것).

## 6. 명령어

```bash
npm install && npm run dev    # http://localhost:3000 — 화면 확인
npm run build                 # 푸시 전 필수
```

## 7. 세션 기록 (가볍게)

- 세션 시작: `SESSION.md`가 있으면 먼저 읽는다.
- 세션 마감: `SESSION.md`에 "바꾼 화면 목록 · 진행 중인 화면 · [wiring] 남긴 것"만 짧게 갱신.
- 프로덕션 쪽 상태(DB·결제·CI)는 이 파일에 기록하지 않는다.
