# 개발자용 테스트 가이드 — 백조오브제

> 대상: 이 레포에서 코드를 작성·검증하는 개발자(사람·AI 세션 모두).
> 운영자(고객사 관리자)용은 [`admin-ops-manual.md`](../guides/admin-ops-manual.md) — 섞지 말 것.
> 기준일: 2026-07-18. 아키텍처 근거는 `AGENTS.md` §8·§10-10.

## 1. 테스트 지형 — Playwright 프로젝트 4개

| project | 브라우저 | 대상 | 무엇을 지키나 |
|---|---|---|---|
| `chromium` | O | `tests/golden/**` | 골든플로우(§7) — 실제 화면 구동 + 시각 회귀 |
| `admin` | X | `tests/admin/**` | 순수 데이터/함수 회귀(내비 SSOT·폼 payload 등). DB 불필요, 초 단위 |
| `products` | X | `tests/products/**` | 검증·정규화·정책 순수 로직(validate, TTL, 클램프) |
| `payments` | X | `tests/payments/**` | 결제 상태기계 — **라이브 프리뷰 API + staging DB 통합** |

실행:
```bash
npm run test:e2e                                   # ⚠️ 전체 — 기본 타깃이 로컬이 아니라 라이브 프리뷰
npx playwright test --project=admin                # 브라우저·DB 없는 순수 검증(가장 빠른 피드백)
npx playwright test tests/products/xxx.spec.ts --project=products
E2E_BASE_URL=http://localhost:3000 npx playwright test --project=chromium   # 이때만 dev 서버 자동 기동
```

## 2. ⚠️ 함정 목록 (전부 실사고에서 나옴)

1. **기본 baseURL은 라이브 Vercel 프리뷰다.** `E2E_BASE_URL` 없이 돌리면 로컬 코드가 아니라
   배포본을 검증한다. `webServer`는 baseURL이 localhost일 때만 뜬다.
2. **visual 베이스라인은 CI(Linux) 전용.** 로컬 Windows 스냅샷은 폰트 렌더 차이로 전부 오탐 —
   커밋 금지. 갱신은 PR에 `update-baselines` 라벨 또는 워크플로 수동 dispatch.
   봇 커밋은 CI를 재트리거하지 않으므로 빈 커밋으로 깨운다.
3. **`networkidle` 금지** — 프리뷰 툴바 websocket 때문에 영원히 idle이 안 된다.
   `settlePage()`(load + 전체 스크롤) 패턴을 쓴다.
4. **주문 생성 레이트리밋(분당 5건/IP)과 스펙의 경합.** payments 스펙처럼 한 파일에서 주문을
   여러 건 만들면 CI 러너 단일 IP가 예산을 소진해, 이후 요청이 409가 아니라 **429로 오염**된다
   (2026-07-18 CI 2회 실측). 대책: 다건 주문 스펙은 발사 전 60초 창 리셋 대기
   (`payment-routes.spec.ts` 오버셀 테스트의 `test.slow()` + 65s 대기 패턴). 리밋은 인스턴스별
   인메모리라 완전 결정적이진 않다 — 신규 스펙 설계 시 주문 수 자체를 줄이는 게 우선.
5. **staging DB 스펙(`payments-db-spec`)은 훅 타임아웃 플레이크가 있다**(Management API 지연,
   `beforeAll` 60s 초과). 코드 무관 실패면 `gh run rerun <id> --failed` 1회가 적절한 대응.
6. **가드 스펙은 소스를 리터럴로 고정한다.** 메뉴·문구·시그니처를 *의도적으로* 바꾸면 해당
   스펙도 같은 PR에서 추종 갱신해야 한다(예: `admin-nav.spec.ts`의 href 목록/개수 — "기대값을
   같이 고치는 순간이 유실을 자각하는 지점"). 스펙을 코드에 맞추는 변경은 PR에 명시할 것.
7. **골든 스펙 중 `purchase`·`admin`은 아직 `test.fixme` 스텁**이다(§0 킥오프 잔재).
   "passed"가 아니라 "실행 안 됨"이다 — 플로우 2·7의 완전한 프리뷰 실구동 검증은
   스텁 구현 + 프리뷰 admin 계정(`E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD`) 주입이 선행 과제.

## 3. 스펙 작성 규약

- **회귀 스펙은 RED 먼저.** 버그 수정 시 수정 전 실패를 재현하는 테스트를 먼저 쓰고 GREEN을
  만든다(§5 버그픽스 프로토콜). "테스트를 배포된 동작에 맞춰 고치는 것"은 결정 이벤트 —
  사용자 확인 필수.
- **순수 로직은 browserless 프로젝트로.** DB·브라우저 없이 import만으로 검증 가능하게 모듈을
  분리하라(예: `orderPolicy/config.ts`의 normalize, `reservationExpiry.ts`의 순수 함수 + `now` 주입).
  서버 전용 모듈(`repo.ts`)을 import하는 스펙은 browserless 프로젝트에서 죽는다.
- **픽스처는 `fixtureId()`로 격리**하고 `beforeAll`/`afterAll`에서 자기 데이터만 삭제한다.
  다른 워커와 같은 상품/주문 id를 공유하면 23505 duplicate 경합이 난다(실측) —
  상품 픽스처가 필요 없는 테스트는 describe를 분리한다.
- **레거시 데이터 모양 포함**: 필터·목록 스펙은 깨끗한 픽스처만으로 끝내지 말고 과거 값 모양
  (혼합 코드·null 필드)을 섞어라(계약 프로젝트 게이트 §4 — massage 환불 사고의 교훈).

## 4. CI 게이트와 로컬 사전 체크

머지 차단 required checks: `verify`(typecheck+build+lint+browserless) · `payments-routes` ·
`payments-db-spec` · (변경 시) `visual`. 강제 사항이므로 push 전에 로컬에서:

```bash
npm run lint && npm run build
npx playwright test --project=admin --project=products     # 초 단위, 항상 돌릴 것
```

- PR은 CI green + §8-6 삼중 검증(opus 리뷰·codex 리뷰·Playwright 프리뷰)이 머지 조건이다.
  빌드 green만으로는 완료가 아니다. 증빙은 PR 코멘트로 남긴다.
- auto-merge 장전 후 push 금지(구 헤드로 머지돼 커밋 유실 실사고). 장전은 모든 push가 끝난 뒤.
- main이 전진해 PR이 BEHIND면 `gh pr update-branch <n>` → CI 재실행 → auto-merge 발화.

## 5. 프리뷰 검증 치트시트

```bash
# 프리뷰 URL: PR의 Vercel 봇 코멘트 또는 gh pr view <n> --json statusCheckRollup
E2E_BASE_URL=<preview> npx playwright test tests/golden/shop.spec.ts --project=chromium

# 가드 라이브 확인(무인증 프로브 — 창구 가드가 살아있는지)
curl -si <preview>/api/admin/xxx | head -1        # 401이어야 정상
curl -si <preview>/admin/xxx | grep -i location    # /login?error=admin 리다이렉트여야 정상
```

Deployment Protection이 걸려 있으면 `VERCEL_AUTOMATION_BYPASS` 헤더로 통과한다.
관리자 화면 스펙은 `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD` 없으면 조용히 skip — 결과 보고 시
"passed"와 "skipped"를 구분해 적을 것.
