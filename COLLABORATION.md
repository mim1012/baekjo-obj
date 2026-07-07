# 협업 가이드 — Claude Code · Codex ↔ Antigravity IDE

> 규칙의 SSOT은 [`AGENTS.md`](./AGENTS.md). 이 문서는 **실제로 어떻게 손발을 맞추나**(역할·콘센트·브랜치·핸드오프)를 쉽게 풀어 설명합니다.

## 0. 3줄 요약
1. **디자이너 = 프론트 전부**(화면 + 가짜데이터 + 기능연결), **나(Claude+Codex) = 백엔드/진짜데이터.**
2. **콘센트 규칙**: 화면은 `src/lib/storage.ts`에만 데이터 요청, 나는 그 함수 속만 진짜로 바꾼다 → 화면 안 깨짐.
3. **각자 자기 브랜치**(디자이너 `fe/*`, 나 `be/*`)에서 작업 → PR로 `main`에 합침. GitHub CI가 자동 검사.

## 1. 참여자와 도구 (셋 다 루트 `AGENTS.md`를 읽음)
| 참여자 | 도구 | 읽는 지침 | 담당 |
|--------|------|-----------|------|
| 디자이너 | **Antigravity IDE** | 루트 `AGENTS.md` | 프론트 전부: `src/app/**`, `src/components/**`, `src/data/**`(가짜데이터), `globals.css`, `public/**` |
| 나 | **Claude Code** | `CLAUDE.md` → `@AGENTS.md` | 백엔드/진짜데이터: `src/lib/**`, `src/app/api/**`, 인증·결제·주문 |
| 나 | **Codex** | 루트 `AGENTS.md` | 동상 (구현·리뷰 보조) |

## 2. 콘센트 규칙 — drift 안 나게 하는 핵심 (쉬운 버전)
- 화면은 **벽에 있는 콘센트(`src/lib/storage.ts`)에만 플러그를 꽂는다.** (`getOrders()`, `addOrder()` 같은 함수)
  → 컴포넌트에서 `fetch`나 `localStorage`를 **직접** 쓰지 않는다.
- 나는 **벽 안 배선만** 바꾼다. 가짜 전기(mock) → 진짜 전기(API). **콘센트 모양(함수 이름·인자·반환)은 안 바꾼다.**
- 데이터 모양(콘센트 규격)은 **설계도 한 장 `src/types/index.ts`** 에만 있다. 어기면 빌드가 빨간불로 잡는다.
- 콘센트/설계도를 꼭 바꿔야 하면 = **계약 변경**: 가짜데이터+호출부를 같은 PR에서 함께 고치고 `contract-change` 라벨.

> 이 규칙을 지키면 **내가 백엔드를 아무리 고쳐도 디자이너 화면이 안 깨진다.** (상세: `AGENTS.md` §4)

## 3. 최초 셋업
```bash
git clone https://github.com/dad041566-hue/BAGJO1.git
cd BAGJO1
npm install
npm run dev   # http://localhost:3000
```
- **Antigravity(디자이너)**: 폴더 열면 `AGENTS.md`가 에이전트 컨텍스트로 자동 로드됨(→ §6). 첫 작업 전 도메인 규칙(폰트/컬러) 확인.
- **Claude Code / Codex(나)**: 루트에서 실행 → `CLAUDE.md`·`AGENTS.md` 자동 로드.

## 4. Git 흐름
- **`main` = 통합 브랜치**(항상 배포 가능). 디자이너 `fe/*`, 나 `be/*`. 서로의 레인에 직접 push 금지.
- 하루 흐름:
  ```bash
  git checkout main && git pull
  git checkout -b fe/진단화면      # 나는 be/주문API
  # 작업 → 작은 커밋 (feat:/fix:)
  git pull --rebase origin main    # push 전 최신화
  git push -u origin fe/진단화면
  # GitHub에서 PR → 리뷰 → Squash merge → 브랜치 삭제
  ```
- **PR 머지 조건**: GitHub CI(`.github/workflows/ci.yml`)의 typecheck+build+lint 통과 + 리뷰어 승인(작성자≠리뷰어).
  백엔드 PR은 내가 `code-reviewer`·`security-reviewer` 에이전트로 리뷰 후 당신이 승인(2명뿐인 리뷰 보완).

## 5. 핸드오프 (UI ↔ 로직 왕복)
- 디자이너가 로직 필요한 자리에 마커: `// HANDOFF(logic): 실제 주문 API 필요` → 내가 `storage.ts` 속을 채운다.
- 내가 UI 변경 필요하면 GitHub Issue(`needs-ui` 라벨) + 대상 컴포넌트·필요 상태(로딩/에러/빈값) 명시.
- 마커 통일: `// HANDOFF(logic):`, `// HANDOFF(ui):`, `// TODO(logic):`, `// TODO(ui):` (grep 가능).

## 6. Antigravity에 규칙이 자동 적용되나? (중요)
- **규칙(AGENTS.md)**: Antigravity는 워크스페이스 루트의 `AGENTS.md`를 에이전트 컨텍스트로 읽습니다 →
  디자이너의 AI가 이 규칙을 **자동으로 참고**합니다. 단 이건 "AI가 읽고 지키려 노력하는" **소프트 가이드**라
  100% 강제는 아닙니다. (Antigravity가 별도 규칙 파일을 쓰면 내용을 복제하지 말고 `AGENTS.md`를 가리키게 하세요.)
- **진짜 강제(하드)**: GitHub **CI 게이트**입니다. 이건 IDE와 무관하게 **PR을 올리는 순간 GitHub에서 실행**되어
  계약 위반(drift)·빌드 실패를 막습니다. Antigravity로 짜든 Claude로 짜든 **똑같이 걸립니다.**
- 정리: *가이드는 자동으로 읽히고(소프트), 실제 방어는 CI가 IDE 무관하게 자동으로 한다(하드).*

## 7. 진행 현황
- 상태 SSOT: [`docs/baekjo-platform-completion/PROGRESS.md`](./docs/baekjo-platform-completion/PROGRESS.md).
- 기획/설계: [`docs_for_notebooklm/`](./docs_for_notebooklm/) (브랜드·기능·데이터·디자인).
