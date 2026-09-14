// 0161 브랜드 Audit 콘텐츠 DB 시드 마이그레이션에서 값을 그대로 읽어오는 테스트 헬퍼.
// sourceContent.ts 하드코딩 제거 이후, 브랜드 콘텐츠의 유일한 정본은 이 마이그레이션 파일이다.
// (DB 단일정본화 — 애플리케이션 코드에는 더 이상 브랜드별 하드코딩 문구가 없다.)
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..');
const SEED_PATH = 'supabase/migrations/0161_brand_audit_content_db_seed.sql';

let cached: string | null = null;

export function readSeedMigration(): string {
  if (cached === null) {
    cached = fs.readFileSync(path.join(ROOT, SEED_PATH), 'utf8');
  }
  return cached;
}

/** 최상위 detail 필드(예: philosophy·highlights·auditPoints·summary*) 시드값을 JS 값으로 복원한다. */
export function seedTopField(id: string, field: string): unknown {
  const sql = readSeedMigration();
  const re = new RegExp(
    `jsonb_set\\(detail, '\\{${field}\\}', '((?:[^']|'')*)'::jsonb\\)\\s*\\n\\s*where id = '${id}'`,
  );
  const m = sql.match(re);
  if (!m) return undefined;
  return JSON.parse(m[1].replace(/''/g, "'"));
}

/** brands 시드의 auditReport 전체 객체(브랜드에 auditReport가 없을 때만 채우는 블록)를 복원한다. */
export function seedAuditReport(id: string): Record<string, unknown> | undefined {
  return seedTopField(id, 'auditReport') as Record<string, unknown> | undefined;
}

/** b1 전용 auditReport 하위 필드별 기본값(getSourceAuditReport의 b1 분기와 동일한 필드별 보완값). */
export function seedB1AuditReportField(field: string): unknown {
  const sql = readSeedMigration();
  const re = new RegExp(
    `jsonb_set\\(detail, '\\{auditReport,${field}\\}', '((?:[^']|'')*)'::jsonb\\)`,
  );
  const m = sql.match(re);
  if (!m) return undefined;
  return JSON.parse(m[1].replace(/''/g, "'"));
}
