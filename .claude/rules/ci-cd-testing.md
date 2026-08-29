# CI/CD 테스트 규칙

## 파이프라인

```text
PR → lint/typecheck/build/순수 계약 테스트
develop push → Preview + staging 통합 테스트
수동 승인 → Toss 승인·취소·환불 및 실제 OAuth
main merge → Production 배포 후 읽기 전용 스모크
```

## 실패 조건

- staging 필수 환경변수 누락
- `SUPABASE_URL`과 `TEST_SUPABASE_PROJECT_REF` 불일치
- Preview URL 누락 또는 Deployment Protection 우회 실패
- 필수 테스트의 조건부 skip
- 관리자·구매자 인증 실패
- 결제 금액, 재고, 환불 원장 read-back 불일치

## 환경변수 원칙

- staging DB용 변수는 GitHub Actions secret 또는 로컬 ignored env 파일로만 공급한다.
- `SUPABASE_ACCESS_TOKEN`은 마이그레이션·DB 테스트용이며 배포 런타임에 넣지 않는다.
- `CRON_SECRET`은 동일한 프로젝트 환경에서 세 Cron이 공유한다.
- `VERCEL_AUTOMATION_BYPASS`는 Preview 보호 우회용이며 Production 테스트 실행용으로 사용하지 않는다.
- 실제 secret 값은 이 규칙 파일에 기록하지 않는다.
