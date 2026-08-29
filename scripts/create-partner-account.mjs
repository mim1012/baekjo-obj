// 파트너(입점업체) 계정 발급용 INSERT SQL 생성기 — DB에 직접 접속하지 않는다. 이 스크립트는
// SQL을 표준출력으로만 찍고, 운영자가 그 SQL을 Supabase SQL Editor에서 직접 실행하는 용도다
// (자격정보를 로컬 스크립트에 넣지 않기 위함).
//
// 사용법 예시:
//   node scripts/create-partner-account.mjs --email partner@penefit.co.kr --name 페네핏 --company "페네핏" --brands b1
//
// 옵션: --email(필수) --name(필수, 담당자/업체명) --company(선택) --brands(필수, 쉼표구분 브랜드ID)
//       --password(선택, 미지정 시 랜덤 생성)

import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BRAND_ID_RE = /^[A-Za-z0-9_-]+$/;
// 혼동하기 쉬운 문자(0/O, 1/l/I)를 제외한 영대소문자+숫자.
const PASSWORD_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

function printUsageAndExit() {
  console.error(
    '사용법: node scripts/create-partner-account.mjs --email <이메일> --name <담당자/업체명> ' +
      '[--company <회사명>] --brands <브랜드ID,쉼표구분> [--password <비밀번호>]',
  );
  process.exit(1);
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const value = argv[index + 1];
    args[key] = value;
    index += 1;
  }
  return args;
}

/** crypto.randomBytes 기반 12자 랜덤 비밀번호(혼동 문자 제외). */
function generatePassword(length = 12) {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let index = 0; index < length; index += 1) {
    out += PASSWORD_CHARS[bytes[index] % PASSWORD_CHARS.length];
  }
  return out;
}

/** SQL 문자열 리터럴 이스케이프(작은따옴표 → 이중 작은따옴표). */
function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

/** brandIds → Postgres text[] 리터럴, 예: '{b1,b6}'. 각 요소는 이미 BRAND_ID_RE로 검증됨. */
function sqlTextArray(values) {
  return `'{${values.join(',')}}'`;
}

/**
 * members INSERT SQL을 생성한다. 비밀번호는 이미 해시된 값(passwordHash)만 받는다 — 평문을
 * SQL에 그대로 박지 않기 위함. must_change_password는 항상 true로 발급한다.
 */
export function buildPartnerInsertSql({ email, name, companyName, passwordHash, brandIds }) {
  const companyLiteral = companyName ? sqlString(companyName) : 'null';
  const columns = [
    'name',
    'email',
    'phone',
    'password_hash',
    'provider',
    'role',
    'status',
    'email_verified',
    'company_name',
    'managed_brand_ids',
    'must_change_password',
  ];
  const values = [
    sqlString(name),
    sqlString(email),
    sqlString(''),
    sqlString(passwordHash),
    sqlString('email'),
    sqlString('partner'),
    sqlString('active'),
    'true',
    companyLiteral,
    sqlTextArray(brandIds),
    'true',
  ];

  return (
    `-- 실행 전 중복 확인: select id from public.members where email = ${sqlString(email)};\n` +
    `insert into public.members (${columns.join(', ')})\n` +
    `values (${values.join(', ')});`
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { email, name, company, brands, password } = args;

  if (!email || !name || !brands) {
    printUsageAndExit();
    return;
  }
  if (!EMAIL_RE.test(email)) {
    console.error(`유효하지 않은 이메일 형식입니다: ${email}`);
    process.exit(1);
  }
  const brandIds = brands.split(',').map((value) => value.trim()).filter(Boolean);
  if (brandIds.length === 0 || !brandIds.every((id) => BRAND_ID_RE.test(id))) {
    console.error(`유효하지 않은 브랜드 ID 목록입니다: ${brands}`);
    process.exit(1);
  }

  const plainPassword = password ?? generatePassword();
  const passwordHash = await bcrypt.hash(plainPassword, 10);

  const sql = buildPartnerInsertSql({
    email,
    name,
    companyName: company,
    passwordHash,
    brandIds,
  });

  console.log('생성된 초기 비밀번호(채팅/커밋에 남기지 말 것):');
  console.log(plainPassword);
  console.log('');
  console.log('아래 SQL을 Supabase SQL Editor에서 실행하세요:');
  console.log('');
  console.log(sql);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
