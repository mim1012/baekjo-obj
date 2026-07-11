// Supabase 마이그레이션 러너 — CI(및 로컬)에서 supabase/migrations/*.sql 을 순서대로 적용한다.
//
// 왜 Management API 인가: 이 저장소엔 supabase CLI/psql 이 없어도 SUPABASE_ACCESS_TOKEN(sbp_) 하나로
//   SQL Editor 와 동일한 database/query 엔드포인트를 쓸 수 있다. (Cloudflare 가 UA 없는 요청을 1010 으로
//   막으므로 User-Agent 필수 — 실전에서 확인함.)
// 추적: public._migrations 테이블에 적용된 파일명을 기록해 재실행 시 미적용만 돌린다.
// baseline: 러너 도입 이전에 수동 적용된 마이그레이션(0001~0008 등)은 create 가 "already exists" 로
//   떨어지는데, 이를 "이미 적용됨"으로 관대 처리하고 기록만 남긴다(문법·권한 등 진짜 에러는 throw).
//
// 필요한 env: SUPABASE_URL, SUPABASE_ACCESS_TOKEN.  실행: node scripts/apply-migrations.mjs

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? '';
if (!SUPABASE_URL || !TOKEN) {
  console.error('환경변수 SUPABASE_URL, SUPABASE_ACCESS_TOKEN 이 필요합니다.');
  process.exit(1);
}

const ref = SUPABASE_URL.replace(/^https?:\/\/([^.]+)\..*$/, '$1');
const API = `https://api.supabase.com/v1/projects/${ref}/database/query`;
const UA = 'Mozilla/5.0 (baekjo-ci-migrate/1.0)';

/** SQL 을 실행하고 결과 rows(JSON) 를 반환. 실패 시 Error(메시지=서버 응답) throw. */
async function q(sql) {
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': UA,
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} ${text}`);
  try {
    return JSON.parse(text);
  } catch {
    return [];
  }
}

const IGNORABLE = /already exists|duplicate (object|table|key|column)|multiple primary keys/i;

async function main() {
  console.log(`[migrate] project ref: ${ref}`);

  // 1) 추적 테이블
  await q(
    `create table if not exists public._migrations (name text primary key, applied_at timestamptz not null default now());`,
  );
  const appliedRows = await q(`select name from public._migrations;`);
  const applied = new Set(appliedRows.map((r) => r.name));

  // 2) 파일 목록(사전순 = 번호순)
  const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'migrations');
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  let ran = 0;
  let baselined = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`[migrate] skip (기적용): ${file}`);
      continue;
    }
    const sql = readFileSync(join(dir, file), 'utf8');
    try {
      await q(sql);
      console.log(`[migrate] 적용: ${file}`);
      ran++;
    } catch (e) {
      if (IGNORABLE.test(String(e.message))) {
        console.log(`[migrate] baseline(이미 존재 → 기록만): ${file}`);
        baselined++;
      } else {
        console.error(`[migrate] 실패: ${file}\n${e.message}`);
        throw e;
      }
    }
    // 성공/베이스라인 모두 기록해 다음 실행에서 재시도하지 않는다.
    await q(
      `insert into public._migrations(name) values ('${file.replace(/'/g, "''")}') on conflict (name) do nothing;`,
    );
  }

  // 3) 검증 리포트 — 주요 테이블 존재 확인
  const check = await q(
    `select table_name from information_schema.tables
     where table_schema='public'
       and table_name in ('members','orders','products','brands','insurance_applications','site_settings')
     order by table_name;`,
  );
  console.log(`[migrate] 완료 — 신규 적용 ${ran}건, baseline ${baselined}건.`);
  console.log(`[migrate] 검증 — 존재 테이블: ${check.map((r) => r.table_name).join(', ')}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
