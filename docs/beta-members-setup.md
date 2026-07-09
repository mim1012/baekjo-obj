# 베타 회원 시스템 — Supabase 연동 (2026-07-10)

> 브랜치 `be/beta-members`. 이 문서는 베타테스트에서 **실회원을 받기 위한** 셋업 기록과 운영 절차의 SSOT.

## 무엇이 진짜가 됐나

| 항목 | 이전 (Phase 1 mock) | 이후 (베타) |
|------|---------------------|-------------|
| 회원 저장소 | 가입자 본인 브라우저 localStorage | **Supabase Postgres `public.members`** (서버 저장, 전 기기 공유) |
| 비밀번호 | 받기만 하고 버림(검증 없음) | **bcryptjs 해시(cost 10) 저장 + 서버 검증** |
| 로그인 | 이메일만 맞으면 통과 | Auth.js **Credentials 프로바이더** — 서버가 해시 대조, 실패 시 세션 없음 |
| 소셜 로그인 | 클라이언트 localStorage 등록 | 서버 jwt 콜백에서 **(provider, provider_id) 키로 upsert** — 이메일 없는 카카오 유저도 중복 생성 없음 |
| 관리자 판별 | `admin@naver.com`/`admin1234` 하드코딩 | DB `role='admin'` + **JWT 세션 role** (하드코딩 제거됨) |
| `/admin` 접근 | 무방비(URL만 알면 진입) | **`src/proxy.ts` 가드** — 비관리자는 `/login?error=admin` 리다이렉트, `/api/admin/*`는 401/403 |

콘센트 규칙 준수: 화면은 여전히 `storage.ts`/`socialAuth.ts` 함수만 호출. 회원 도메인 2개 함수만 계약 변경(사장님 결정, 2026-07-09):
- `login(email, password): Promise<{ user?: User; error?: 'invalid-credentials' | 'network' }>`
- `registerUser(input): Promise<{ user?: User; error?: 'duplicate-email' | 'invalid-input' | 'session' | 'network' }>`

`getCurrentUser()` 등 나머지는 그대로(localStorage = UI 세션 캐시, 진실원본 = Supabase + JWT).

## 구성 요소

- `supabase/migrations/0001_members.sql` — members 테이블(citext email unique, provider 복합 유니크, RLS on·정책 없음=서버 전용)
- `src/lib/supabase/server.ts` — 서버 전용 클라이언트(getSupabase, window 가드)
- `src/lib/members/repo.ts` — 회원 CRUD (모든 insert는 `role: 'user'` 고정 — admin 승격은 SQL로만)
- `src/lib/members/password.ts` — bcrypt 해시/검증
- `src/lib/auth.config.ts` + `src/lib/auth.ts` — 공유 설정 + Credentials/소셜 upsert
- `src/proxy.ts` — 관리자 가드 (Next 16: middleware → proxy 개명 반영)
- API: `POST /api/members`(가입) · `GET /api/members/me`(세션→회원) · `GET /api/admin/members`(관리자 목록)

## 환경변수 (로컬 `.env.local` + Vercel Production 등록 완료)

```
SUPABASE_URL=            # https://xxxx.supabase.co — 서버 전용
SUPABASE_SECRET_KEY=     # sb_secret_... — 절대 NEXT_PUBLIC_ 금지
```

`SUPABASE_ACCESS_TOKEN`(sbp_)은 마이그레이션 실행용 — 로컬 전용, 배포에 불필요.

## 운영 절차

### 마이그레이션 실행 (완료됨)
Management API로 실행: `POST https://api.supabase.com/v1/projects/<ref>/database/query` + `Authorization: Bearer <sbp_토큰>`, body `{"query":"<SQL>"}`. 2026-07-10에 프로젝트 `vgeqpbyyggxxaeowtbtj`에 0001 적용 완료.

### 관리자 만들기
1. 베타 사이트에서 일반 가입(이메일/비밀번호).
2. SQL 1회 실행: `update public.members set role = 'admin' where email = '본인이메일';`
3. 재로그인하면 관리자 콘솔 접근 가능. (소셜 로그인으로는 어떤 경우에도 admin이 되지 않음 — 보안 불변식)

### 베타 공개 시
- Vercel env는 이미 등록됨 → **머지 후 재배포만 하면 프로덕션에서 동작**.
- 소셜 로그인은 기존 설정 그대로(카카오/네이버 프로덕션 redirect 등록 완료 상태).

## 알려진 한계 (Opus·Codex 리뷰 2026-07-10 — 공개 런칭 전 재평가)

- **Rate limiting 없음**: 가입/로그인 무제한 시도 가능. 클로즈드 베타 수용, 공개 전 필수.
- **이메일 소유 검증 없음**: 타인 이메일로 가입 가능. Phase 2에서 확인 메일 도입.
- **가입 409가 가입 여부를 노출**(이메일 열거). 베타 수용, rate limit과 함께 재평가.
- 관리자 회원 화면은 베타에선 **조회 전용**(등록/수정 API 미구현 — 화면에서 버튼 제거됨).
- **소셜 로그인의 이메일 매칭은 무상태(stateless)**: 기존 이메일 계정과 같은 이메일의 소셜 로그인은 그 계정을 재사용하지만 provider 연결을 DB에 기록하지 않음(의도된 베타 설계 — 명시적 계정 연동 플로우는 Phase 2). 제공자가 이메일을 계속 반환하는 한 동작 동일.

## 테스트 데이터 정리

스모크 테스트로 생성된 `@test.baekjo` 계정은 다음 SQL로 정리:
`delete from public.members where email like '%@test.baekjo';`
