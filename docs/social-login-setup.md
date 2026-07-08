# 소셜 로그인(카카오·네이버) 셋업 가이드

> 작성: mim1012 (2026-07-08). 코드 구현은 `be/social-login` 브랜치 — Auth.js(next-auth v5) 기반.
> **키(환경변수)만 채우면 켜지는 구조**입니다. 키가 없으면 버튼은 "준비 중" 안내만 띄우고 아무것도 깨지지 않습니다.

## 1. 구조 한 장 요약

```
[로그인 화면 카카오/네이버 버튼]
  → /api/auth/... (Auth.js가 OAuth 전 과정 처리)
  → 성공 시 /auth/complete (브릿지 페이지)
  → 기존 회원 흐름(storage.ts의 setCurrentUser/registerUser)에 합류
  → 마이페이지 등 기존 화면은 코드 변경 없이 그대로 동작
```

- 세션: JWT 쿠키 (DB 없이 동작 — Phase 1 기준. 추후 실DB 붙일 때 어댑터만 추가)
- 계약 변경: `User`에 optional 필드 2개만 추가 (`provider?`, `profileImage?`) — 가산적, 기존 화면 영향 없음

## 2. 환경변수 (콘센트에 꽂을 키)

`.env.example` 참고. 로컬은 `.env.local`에, 운영은 Vercel 환경변수에 넣는다.

| 변수 | 값 출처 |
|------|---------|
| `AUTH_SECRET` | `npx auth secret` 한 번 실행해서 생성 (아무 랜덤 32바이트) |
| `AUTH_KAKAO_ID` | 카카오 디벨로퍼스 → 앱 → **REST API 키** |
| `AUTH_KAKAO_SECRET` | 카카오 디벨로퍼스 → 제품 설정 → 카카오 로그인 → 보안 → **Client Secret** (활성화 필요) |
| `AUTH_NAVER_ID` | 네이버 개발자센터 → 애플리케이션 → **Client ID** |
| `AUTH_NAVER_SECRET` | 같은 곳 → **Client Secret** |
| `NEXT_PUBLIC_SOCIAL_LOGIN` | `1`이면 로그인 화면 소셜 버튼 활성화. **키를 다 채운 뒤에만 1로.** |

## 3. 카카오 디벨로퍼스 등록 절차

1. https://developers.kakao.com → 내 애플리케이션 → **애플리케이션 추가** (앱 이름: 백조오브제)
2. 제품 설정 → **카카오 로그인 활성화** ON
3. 카카오 로그인 → **Redirect URI 등록** (둘 다):
   - `http://localhost:3000/api/auth/callback/kakao`
   - `https://baekjo-obj.vercel.app/api/auth/callback/kakao`
4. 카카오 로그인 → 보안 → **Client Secret 생성 + 활성화**
5. **동의항목**: 닉네임·프로필 이미지 = 기본 동의 설정.
   ⚠️ **이메일은 "비즈 앱" 전환(사업자등록번호 인증) 후에만 필수 수집 가능** — 그 전엔 이메일 없이 로그인될 수 있고, 코드가 이 경우를 처리함(플레이스홀더 이메일).
6. (운영 전환 시) 앱 → 비즈니스 → **비즈 앱 전환**: 사업주의 사업자등록번호 필요.

## 4. 네이버 개발자센터 등록 절차

1. https://developers.naver.com → Application → **애플리케이션 등록**
2. 사용 API: **네이버 로그인** / 제공 정보: 이메일, 이름(닉네임), 프로필 사진
3. 서비스 URL: `https://baekjo-obj.vercel.app`
4. **Callback URL 등록** (둘 다):
   - `http://localhost:3000/api/auth/callback/naver`
   - `https://baekjo-obj.vercel.app/api/auth/callback/naver`
5. ⚠️ 검수 전("개발 중" 상태)에는 **멤버 관리에 등록된 아이디만 로그인 가능** — 테스트할 계정을 멤버로 추가.
6. (운영 전환 시) **네이버 로그인 검수 신청**: 개인정보처리방침 URL 필수 → 사이트에 해당 페이지 준비 필요.

## 5. 계정 소유권 정책 (누가 등록하나)

- **최종(운영) 앱 = 사업주 계정 소유.** 카카오 비즈 앱(사업자번호)·네이버 검수가 사업주 명의 기준이고, 납품물 소유권 분쟁 방지.
- 사업주에게 요청할 것 (각 1회):
  1. 카카오 디벨로퍼스 가입 → 앱 생성 → **팀 관리에서 mim1012 카카오 계정을 관리자로 초대**
  2. 네이버 개발자센터 가입 → 앱 등록 → **멤버 관리에 mim1012 네이버 아이디를 관리자로 등록**
  - 이후 모든 설정 변경은 개발자가 직접 — 사업주에게 매번 로그인 요청할 필요 없음.
- **개발 중에는 개발자 개인 계정의 "개발용 앱"으로 진행** (키는 환경변수라 나중에 사업주 앱 키로 교체만 하면 됨 — 코드 변경 0줄).

## 6. Vercel 프리뷰 배포 주의

프리뷰 URL(`baekjo-obj-git-*.vercel.app`)은 매번 바뀌어서 Redirect URI로 등록 불가.
→ **소셜 로그인 실테스트는 localhost 또는 프로덕션 도메인에서만.** 프리뷰에서는 버튼이 OAuth 단계에서 redirect_uri 오류가 나는 게 정상.

## 7. 오픈(운영 전환) 체크리스트

- [ ] 사업주 계정으로 카카오/네이버 앱 생성 + 개발자 멤버 초대
- [ ] 카카오 비즈 앱 전환 (사업자등록번호) → 이메일 동의항목 필수로 변경
- [ ] 개인정보처리방침 페이지 게시 → 네이버 검수 신청 → 통과
- [ ] Vercel 환경변수(Production)에 사업주 앱 키 입력 + `NEXT_PUBLIC_SOCIAL_LOGIN=1`
- [ ] 프로덕션 도메인 Redirect URI 등록 확인
- [ ] 골든플로우 #6 (회원) 수동 검증: 카카오/네이버 각각 가입→로그인→마이페이지 상태 유지 + 증빙 스크린샷
