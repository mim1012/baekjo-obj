<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# 백조오브제 (Baekjo Objet) — 팀 협업 SSOT

> 이 파일은 **단일 진실(Single Source of Truth)** 입니다. Claude Code · Codex · **Antigravity IDE가 모두 이 파일을 읽습니다.**
> 규칙을 바꾸려면 여기만 고치세요. (`CLAUDE.md`는 `@AGENTS.md` 포인터라 자동으로 따라옵니다.)
> 상세 협업 절차는 [`COLLABORATION.md`](./COLLABORATION.md).

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

## 3. 역할 경계 (누가 무엇을 소유하나)
| 담당 | 사람 / 도구 | 소유 영역 |
|------|-------------|-----------|
| **프론트 전체** | 디자이너 (**Antigravity IDE**) | 화면·UI·애니메이션 + **가짜(mock) 데이터**(`src/data/**`) + **기획 기능 연결**(화면 동작·핸들러·상태). 경로: `src/app/**`, `src/components/**`, `src/data/**`, `src/app/globals.css`, `public/**` |
| **백엔드 / 실데이터** | 나 (**Claude Code + Codex**) | 진짜 데이터·서버 로직: `src/lib/**`(콘센트 속 구현), `src/app/api/**`(생성 예정), 인증·결제·주문 처리·검증 |
| **공유 접점 = 계약** | 양쪽 합의 필요 | **`src/types/index.ts`(데이터 설계도)** + **`src/lib/storage.ts`(콘센트 = 함수 시그니처)**. §4 규칙 준수 |

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
- **브랜치**: **`main` = 통합 브랜치**(항상 배포 가능). 디자이너 = `fe/*`, 나 = `be/*`(feat/fix). PR로만 main 머지.
  push 전 항상 `git pull --rebase origin main`. 서로의 레인에 직접 push 금지.
- **CI 게이트(IDE 무관·자동)**: 모든 PR에서 `.github/workflows/ci.yml`가 **typecheck+build+lint** 실행.
  실패하면 머지 불가 → drift가 프로덕션에 못 샌다. **어떤 IDE로 짰든 GitHub에서 똑같이 걸린다.**
- **배포**: preview → 골든플로우 스모크 → 프로모트. 직접 prod 배포 금지. 세션당 1배치.
- **커밋**: `type: 설명`(feat/fix/refactor/docs/test/chore). PR은 작성자≠리뷰어(자기승인 금지).
- **납품 증빙**: 마일스톤마다 골든플로우 수동 1회 + 스크린샷/녹화 → `docs/` 보관(분쟁 방어).

## 9. 명령어
```bash
npm install     # 의존성 설치
npm run dev      # 개발 서버 (http://localhost:3000)
npm run build    # 프로덕션 빌드 (배포 전·머지 전 필수)
npm run lint     # ESLint (완료 전 필수)
```
