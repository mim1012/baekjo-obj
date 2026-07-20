# Staging과 Production 검증 기준

## 결론

Staging 통과는 production 통과를 보장하지 않는다.

이 프로젝트의 `golden-crud` 쓰기 스펙은 Vercel Preview와 staging DB를 대상으로 한 회귀 검증이다. Production 배포 가능성을 높이는 강한 신호지만, production 환경 자체의 최종 증명은 아니다.

## 왜 보장이 아닌가

Staging과 production은 같은 코드 경로를 많이 공유하지만, 다음 값이 다를 수 있다.

- 배포된 commit SHA와 실제 Vercel build artifact
- 환경변수와 secret 등록 상태
- Supabase project와 DB 데이터 형상
- migration 적용 여부
- storage bucket, public policy, 이미지 도메인
- Auth callback URL, OAuth provider 설정, 쿠키/domain 설정
- 결제 provider mode, webhook URL, webhook secret
- production에만 존재하는 레거시 데이터

특히 Supabase project ref가 다르다.

- staging: `aeooyivfijthfcrfrnyk`
- production: `vgeqpbyyggxxaeowtbtj`

따라서 staging에서 CRUD가 통과해도 production DB의 계정, 주문, 회원, 이미지, 설정 데이터가 다르면 production에서만 실패할 수 있다.

## 현재 자동화의 의도

`.github/workflows/golden-crud.yml`의 `golden-crud`는 Preview/staging 전용이다. 워크플로 주석과 dispatch guard가 production 도메인(`baekjo-obj.vercel.app`)을 쓰기 스펙 대상으로 쓰지 못하게 막는다.

`tests/golden/_lib/adminCrudHelpers.ts`와 `tests/golden/_lib/memberCrudHelpers.ts`도 같은 원칙을 따른다. CRUD 스펙은 production 직접 검증용이 아니라 staging 실구동 회귀 검증용이다.

상세한 테스트 구조는 [verification-procedures.md](../testing/verification-procedures.md)를 정본으로 본다.

## 릴리즈 판단 기준

Production 배포 전에는 최소 다음을 확인한다.

1. 대상 PR의 Vercel Preview가 성공한 commit을 확인한다.
2. 변경된 도메인의 `golden-crud` 또는 관련 Playwright 스펙이 staging에서 통과했는지 확인한다.
3. `npm run lint`, `npm run build`, 관련 단위/계약 테스트가 통과했는지 확인한다.
4. migration이 있으면 production 적용 경로와 순서를 확인한다.
5. production env var, auth callback, storage policy, payment webhook처럼 staging과 달라질 수 있는 설정을 점검한다.

Production 배포 후에는 별도 카나리를 실행한다.

1. 공개 페이지가 production 도메인에서 정상 렌더되는지 확인한다.
2. 변경 도메인의 읽기 API와 화면 반영을 production에서 확인한다.
3. 쓰기 검증은 production-safe로 설계된 스펙만 실행한다.
4. 일반 `golden-crud` 풀스윕을 production에 그대로 돌리지 않는다.

## Production 쓰기 검증 허용 조건

Production에서 쓰기 검증을 하려면 스펙이 아래 조건을 모두 만족해야 한다.

- 테스트 데이터가 실제 고객 데이터와 섞이지 않는다.
- 생성한 데이터가 스펙 안에서 정리된다.
- 실패해도 고객 주문, 결제, 회원 권한, 공개 콘텐츠를 오염시키지 않는다.
- production 도메인 guard를 의도적으로 우회하지 않는다.
- 어떤 계정과 어떤 데이터를 만지는지 문서나 스펙 주석에 남아 있다.

이 조건을 만족하지 못하면 production에서는 읽기 카나리만 실행하고, 쓰기 CRUD 검증은 staging에서 한다.

## 보고 문구

릴리즈 보고에서 다음 표현은 금지한다.

- "staging 통과했으니 production도 보장됨"
- "golden-crud green이므로 production 전체 CRUD 검증 완료"

대신 이렇게 쓴다.

- "staging golden-crud 기준 회귀 검증 통과. production은 배포 후 별도 카나리 필요."
- "production 카나리에서 변경 도메인의 공개 페이지/API 반영 확인."
- "production 전체 쓰기 CRUD 풀스윕은 안전 가드 때문에 실행 대상이 아님."
