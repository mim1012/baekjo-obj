# Claude 작업 지침

이 저장소의 최상위 작업 기준은 `AGENTS.md`이다. 모든 작업 전에 읽고, 추가 세부 규칙은 `.claude/rules/` 아래의 관련 문서를 참조한다. Codex와 Claude는 동일한 규칙·양식·스크립트를 사용한다.

## 공통 참조 순서

1. `AGENTS.md`
2. `.claude/rules/`의 작업별 규칙
3. 관련 `docs/` 문서와 기존 테스트 양식
4. `package.json` 및 `scripts/`의 실행 명령
5. 변경 전 현재 워크트리 상태와 로컬 `main` 기준 확인

- 결제·환불·배송 쓰기 테스트는 staging에서만 실행한다.
- Production에서는 주문 생성·결제·환불·관리자 CRUD를 실행하지 않는다.
- 환경변수와 인증정보는 채팅, 로그, 커밋, 문서에 원문으로 기록하지 않는다.
- 테스트가 스킵된 경우 원인을 보고하고, 필수 게이트라면 CI를 실패시킨다.
- 변경 전 기존 워크트리의 미커밋 작업을 보존하고, 관련 없는 브랜치 변경을 임의로 합치지 않는다.

참조 규칙: `.claude/rules/ci-cd-testing.md`, `.claude/rules/payment-and-auth-testing.md`
