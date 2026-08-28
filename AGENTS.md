# 백조오브제 작업 규칙

## 테스트 환경

- 일반 개발·PR 검증은 로컬 또는 Preview에서 수행한다.
- 주문, 결제, 환불, 부분환불, 관리자 CRUD, 배송 데이터 쓰기는 Supabase staging ref `aeooyivfijthfcrfrnyk`에서만 수행한다.
- Production DB를 테스트 대상으로 사용하거나 테스트 데이터를 생성하지 않는다.
- Preview 테스트는 Vercel Deployment Protection을 통과한 뒤 실행한다. 우회 secret은 환경변수로만 주입하고 문서·로그·커밋에 기록하지 않는다.

## 필수 게이트

- 필수 테스트가 환경변수 부족으로 `skip`되면 성공으로 간주하지 않는다. CI staging job은 설정 누락 시 실패해야 한다.
- `TEST_SUPABASE_PROJECT_REF`와 `SUPABASE_URL`의 ref를 비교하고, 불일치하면 즉시 실패한다.
- 관리자·구매자 로그인은 `/api/members/me`의 role/status로 세션을 확인한다.
- 결제 테스트는 다중 브랜드 주문, Toss 승인, 무통장입금, 취소, 부분환불, 전액환불, 재고·환불 원장 read-back을 포함한다.
- 카카오·네이버는 PR에서 callback 계약을 검증하고, 실제 OAuth는 Preview 수동 승인 게이트에서 검증한다.
- Production은 읽기 전용 스모크만 허용한다.

## 브랜치 운영

- 여러 워크스페이스의 변경은 `develop`에 선별 통합한 뒤 전체 테스트한다.
- 통합 테스트 통과 후에만 `main`에 fast-forward 또는 승인된 병합을 수행한다.
- 백조오브제와 무관한 ZeroRun·플릿 운영 변경은 통합 브랜치에 섞지 않는다.
- 미커밋·미추적 파일은 자동 병합하지 말고 소유자 확인 후 별도 처리한다.

## 검증 명령

```powershell
npm run lint
npx tsc --noEmit
npx playwright test --project=products --project=admin --project=tracking --project=security
npx playwright test --project=payments --project=shipments
```

자세한 규칙은 `.claude/rules/ci-cd-testing.md`와 `.claude/rules/payment-and-auth-testing.md`를 참조한다.
