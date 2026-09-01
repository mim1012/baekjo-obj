# 릴리스 버전 규칙

Production 릴리스 태그는 `package.json`의 `version`을 기준으로 생성합니다.

- 태그 형식: `vMAJOR.MINOR.PATCH`
- 현재 시작 버전: `v0.1.0`
- Release 제목 형식: `v0.1.0 · 업데이트 및 버그 수정`
- 기존 날짜 태그(`v2026.08.31` 등)는 이력 보존을 위해 변경하지 않습니다.

다음 릴리스 전에 버전을 올린 뒤 커밋합니다.

```powershell
npm version patch --no-git-tag-version
# 또는 npm version minor --no-git-tag-version
git add package.json package-lock.json
git commit -m "릴리스 버전 갱신"
```

- `patch`: 버그 수정과 작은 운영 개선
- `minor`: 기존 기능을 깨지 않는 기능 추가
- `major`: 호환성이 깨지는 변경

이미 다른 커밋에 사용된 버전으로 Production 배포하면 워크플로가 실패합니다. 날짜 suffix를 자동으로 붙이지 않고, `package.json` 버전을 먼저 올리도록 강제해 태그와 실제 변경 범위가 어긋나는 것을 막습니다.
