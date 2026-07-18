# 소셜 로그인 UI 개선 기록 (2026-07-09 직접 반영 완료)

> 작성: mim1012, 2026-07-09. 원래 dad041566 전달용으로 작성했으나 **팀 결정으로 같은 날 백엔드
> 레인에서 직접 반영 완료** (공용 컴포넌트 `src/components/common/SocialLoginButtons.tsx` + 로그인·
> 가입·마이페이지 적용, react-reviewer 검토 통과). 아래는 반영 근거와 배경 설명으로 보존.

## 1. 소셜 버튼 공식 브랜드 가이드 적용 (⚠️ 검수 요건 — 런칭 블로커)

현재 `/login`의 카카오/네이버 버튼이 회색 테두리 텍스트 버튼인데, **네이버 애플리케이션 검수는
공식 로그인 버튼 디자인 준수를 확인하며 미준수 시 반려**됩니다. 카카오도 비즈앱 심사에 디자인
가이드가 있습니다.

- 카카오 가이드: https://developers.kakao.com/docs/latest/ko/kakaologin/design-guide
  (버튼 배경 `#FEE500`, 카카오 심볼, 텍스트 "카카오 로그인")
- 네이버 가이드: https://developers.naver.com/docs/login/bi/bi.md
  (버튼 배경 `#03C75A`, 네이버 로고, 텍스트 "네이버 로그인")

Quiet Luxury 톤("쨍한 원색 금지", AGENTS.md §6)과 충돌하는 지점 → **간편 로그인 영역에 한해
브랜드 컬러 예외를 허용**하는 절충을 제안합니다. 최소선: 공식 심볼 + 지정 배경색.

## 2. 마이페이지에 소셜 연결 정보 표시

`User` 타입에 이미 들어 있는 두 필드를 화면에 쓰면 됩니다 (`src/types/index.ts`):

- `provider?: 'kakao' | 'naver' | 'email'` → "카카오로 연결된 계정" 배지
- `profileImage?: string` → 프로필 사진 (소셜에서 받아옴)

**중요 — 플레이스홀더 이메일 처리**: 카카오는 비즈앱 전환 전 이메일을 주지 않아서, 이메일 없는
유저는 `social-kakao-<타임스탬프>@placeholder.baekjo` 형태의 내부용 이메일로 저장됩니다.
이게 마이페이지에 그대로 노출되면 안 됩니다:

```ts
const isPlaceholderEmail = user.email.endsWith('@placeholder.baekjo');
// true면 이메일 대신 "이메일 미등록" 표시 (또는 숨김)
```

## 3. 회원가입(/signup)에 간편 가입 진입점 추가

소셜 버튼이 `/login`에만 있고 `/signup`에는 없음. 신규 유저 최다 진입점이 가입 페이지이므로
같은 "간편 로그인" 블록을 추가 권장. 핸들러는 로그인 페이지와 동일:

```ts
import { isSocialLoginEnabled, loginWithProvider } from '@/lib/socialAuth';
// isSocialLoginEnabled() false → "준비 중" 안내, true → void loginWithProvider('kakao' | 'naver')
```

(소셜은 가입/로그인 구분이 없습니다 — 첫 로그인 때 자동 가입되므로 버튼 문구만 "간편 가입"으로.)

## 참고: 이미 백엔드 레인에서 처리된 것

- 소셜 로그인 실패 시 `/login?error=...`로 복귀 + 로그인 페이지가 안내 문구 표시
- 소셜 버튼 클릭 시 잠금 + "이동 중…" 표시 (중복 시도 방지)
- OAuth 흐름 전체 (`docs/guides/social-login-setup.md` 참고)
