# supabase/archive — 이력 보존용 SQL (실행 금지)

`scripts/apply-migrations.mjs` 러너는 `supabase/migrations/`만 읽는다. 이 폴더의 파일은 **절대 재실행하지 않는다.**

## 2026-07-16_lost_0021 · 0022 (2026-07-18 회수)

- **무엇**: 2026-07-16 공식 브랜드몰 대조 결과를 prod에 반영한 카탈로그 동기화 SQL 2건.
  당시 커밋 없이 Management API로 prod에 직접 적용된 뒤 어느 브랜치에도 남지 않아 유실됐다
  (AGENTS.md §10-8 "커밋 안 된 SQL prod 직접 적용 금지" 규칙이 이 사고에서 신설됨).
- **어디서 회수**: dad 레포(dad-origin) `be/catalog-sync` 커밋 `51824c4`에 원본이 보존돼 있어 그대로 가져왔다.
- **왜 migrations가 아니라 archive인가**: 내용은 이미 prod에 적용된 상태이고, 이후 `0038`(p15/p16 개명·실사진)
  등이 같은 행을 다시 수정했다. migrations에 넣으면 CI `migrate` 잡이 **재실행해 최신 데이터를 과거 값으로
  되돌린다.** 목적은 재현·추적 가능성(이력) 복원이지 재적용이 아니다.
- 파일명의 `0021`·`0022`는 **dad 레포 당시 번호**다. 본 레포의 `0021_decrement_stock_for_order.sql`과는 무관하다.
