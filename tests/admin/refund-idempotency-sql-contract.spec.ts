import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// 0174_refund_idempotency_order_guard.sql은 0072_order_refund_ledger.sql의
// create_order_refund_request()를 create or replace로 재정의하면서 "idempotency 키가 이미
// 존재하면 그대로 기존 행을 반환한다"는 블록만 갈아치운다(주문 불일치·payload 불일치를 PT409로
// 거부). 나머지 본문(시그니처, 초기 validation, 주문 조회부터 insert/return까지)은 손대지
// 않아야 한다 — 이 스펙은 그 사실을 소스-계약으로 고정한다(DB 접속 없음, 파일 텍스트만 검사).
const root = path.resolve(__dirname, '..', '..');
const OLD_SQL = readFileSync(path.join(root, 'supabase/migrations/0072_order_refund_ledger.sql'), 'utf8');
const NEW_SQL = readFileSync(path.join(root, 'supabase/migrations/0174_refund_idempotency_order_guard.sql'), 'utf8');

const SIGNATURE_START = 'create or replace function public.create_order_refund_request(';
const SIGNATURE_END = ')\nreturns jsonb';
const EXISTING_LOOKUP_MARKER = 'select * into v_existing';
const ORDER_LOOKUP_MARKER = 'select * into v_order\n    from public.orders';
// 두 파일 모두 create_order_refund_request()가 이 문구로 끝난다(0072/0174 공통) — 0174에서는
// 이 뒤에 revoke/grant 문이 이어지므로, 함수 소스를 여기서 끊어야 grant 문이 섞여 들어가지 않는다.
const FUNCTION_END_MARKER = 'return to_jsonb(v_refund);\nend;\n$$;';

function extractFunctionSource(sql: string, file: string): string {
  const start = sql.indexOf(SIGNATURE_START);
  expect(start, `${file}: create_order_refund_request 함수 시그니처를 찾지 못함`).toBeGreaterThanOrEqual(0);
  const endMarkerIdx = sql.indexOf(FUNCTION_END_MARKER, start);
  expect(endMarkerIdx, `${file}: create_order_refund_request 함수 종료부(return to_jsonb(v_refund); end; $$;)를 찾지 못함`).toBeGreaterThanOrEqual(0);
  return sql.slice(start, endMarkerIdx + FUNCTION_END_MARKER.length);
}

function extractSignature(fnSource: string, file: string): string {
  const end = fnSource.indexOf(SIGNATURE_END);
  expect(end, `${file}: returns jsonb 앞 시그니처 종료를 찾지 못함`).toBeGreaterThanOrEqual(0);
  return fnSource.slice(SIGNATURE_START.length, end).trim();
}

function splitAtExistingBlock(fnSource: string, file: string): { before: string; existingBlock: string; after: string } {
  const existingIdx = fnSource.indexOf(EXISTING_LOOKUP_MARKER);
  expect(existingIdx, `${file}: idempotency 키 조회(select * into v_existing) 블록을 찾지 못함`).toBeGreaterThanOrEqual(0);
  const orderIdx = fnSource.indexOf(ORDER_LOOKUP_MARKER, existingIdx);
  expect(orderIdx, `${file}: 주문 조회(select * into v_order) 블록을 찾지 못함`).toBeGreaterThanOrEqual(0);
  return {
    before: fnSource.slice(0, existingIdx),
    existingBlock: fnSource.slice(existingIdx, orderIdx),
    after: fnSource.slice(orderIdx),
  };
}

function declareVarNames(fnSource: string, file: string): Set<string> {
  const declareIdx = fnSource.indexOf('declare');
  const beginIdx = fnSource.indexOf('\nbegin\n', declareIdx);
  expect(declareIdx, `${file}: declare 블록을 찾지 못함`).toBeGreaterThanOrEqual(0);
  expect(beginIdx, `${file}: declare 이후 begin을 찾지 못함`).toBeGreaterThan(declareIdx);
  const declareSection = fnSource.slice(declareIdx + 'declare'.length, beginIdx);
  return new Set(
    declareSection
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0),
  );
}

test.describe('0174 create_order_refund_request 소스 계약 (0072 대비)', () => {
  test('함수 시그니처(파라미터 목록)가 0072와 동일하다', () => {
    const oldFn = extractFunctionSource(OLD_SQL, '0072');
    const newFn = extractFunctionSource(NEW_SQL, '0174');
    expect(extractSignature(newFn, '0174')).toBe(extractSignature(oldFn, '0072'));
  });

  test('idempotency 키 조회 블록 앞(초기 validation)과 뒤(주문 조회~insert~return)는 0072와 byte-identical하다', () => {
    const oldFn = extractFunctionSource(OLD_SQL, '0072');
    const newFn = extractFunctionSource(NEW_SQL, '0174');
    const oldParts = splitAtExistingBlock(oldFn, '0072');
    const newParts = splitAtExistingBlock(newFn, '0174');

    // "before"는 declare 블록을 포함하므로 declare 변수 목록은 별도 테스트에서 검사하고,
    // 여기서는 declare 이후(begin~초기 validation) 로직만 비교한다.
    const oldBeginIdx = oldParts.before.indexOf('\nbegin\n');
    const newBeginIdx = newParts.before.indexOf('\nbegin\n');
    expect(oldBeginIdx).toBeGreaterThanOrEqual(0);
    expect(newBeginIdx).toBeGreaterThanOrEqual(0);
    expect(newParts.before.slice(newBeginIdx)).toBe(oldParts.before.slice(oldBeginIdx));

    // 주문 조회부터 함수 끝(insert/return/$$;)까지는 완전히 동일해야 한다.
    expect(newParts.after).toBe(oldParts.after);
  });

  test('declare 블록은 0072의 변수 전부를 유지하고 신규 비교용 변수 2개만 추가한다', () => {
    const oldFn = extractFunctionSource(OLD_SQL, '0072');
    const newFn = extractFunctionSource(NEW_SQL, '0174');
    const oldVars = declareVarNames(oldFn, '0072');
    const newVars = declareVarNames(newFn, '0174');

    for (const v of oldVars) {
      expect(newVars.has(v), `0174 declare 블록에서 누락된 0072 변수: ${v}`).toBe(true);
    }
    const added = [...newVars].filter((v) => !oldVars.has(v));
    expect(added.sort()).toEqual(['v_existing_key_items jsonb;', 'v_request_key_items jsonb;']);
  });

  test('0072의 existing-key 블록은 무조건 기존 행을 반환하고 PT409/충돌 코드가 없다', () => {
    const oldFn = extractFunctionSource(OLD_SQL, '0072');
    const { existingBlock } = splitAtExistingBlock(oldFn, '0072');
    expect(existingBlock).toContain('if found then');
    expect(existingBlock).toContain('return to_jsonb(v_existing);');
    expect(existingBlock).not.toContain('PT409');
    expect(existingBlock).not.toContain('REFUND_IDEMPOTENCY_KEY_CONFLICT');
  });

  test('0174의 existing-key 블록은 order_id 불일치·payload 불일치를 PT409 REFUND_IDEMPOTENCY_KEY_CONFLICT로 거부하고, 일치 시에만 기존 행을 반환한다', () => {
    const newFn = extractFunctionSource(NEW_SQL, '0174');
    const { existingBlock } = splitAtExistingBlock(newFn, '0174');

    expect(existingBlock).toContain('v_existing.order_id <> p_order_id');
    expect(existingBlock).toContain('v_existing.include_delivery_fee <> p_include_delivery_fee');
    expect(existingBlock).toContain('v_existing_key_items is distinct from v_request_key_items');
    expect(existingBlock).toContain('return to_jsonb(v_existing);');

    const conflictRaises = existingBlock.match(/raise exception 'REFUND_IDEMPOTENCY_KEY_CONFLICT' using errcode = 'PT409';/g) ?? [];
    expect(conflictRaises.length).toBe(2);

    // 재시도 30초 무응답을 유발하는 errcode '40001'(serialization_failure)은 이 충돌에 쓰지 않는다.
    // (헤더 주석 설명문에는 인용부호 없는 "40001"이 등장할 수 있으므로 코드 리터럴 형태만 검사한다.)
    expect(existingBlock).not.toContain("'40001'");
  });

  test("0174에는 errcode = '40001' 사용이 없고, PT409 사용 근거를 헤더 주석에 남긴다", () => {
    expect(NEW_SQL).not.toContain("'40001'");
    expect(NEW_SQL.toUpperCase()).toContain('PT409');
    expect(NEW_SQL).toMatch(/supersedes 0072|0072.*(대체|재정의)/i);
  });

  test('0174는 create_order_refund_request 실행권한을 public/anon/authenticated에서 회수하고 service_role에만 부여한다', () => {
    expect(NEW_SQL).toMatch(
      /revoke execute on function public\.create_order_refund_request\(uuid, text, jsonb, boolean, integer, text, uuid\)\s*\n\s*from public, anon, authenticated;/,
    );
    expect(NEW_SQL).toMatch(
      /grant execute on function public\.create_order_refund_request\(uuid, text, jsonb, boolean, integer, text, uuid\)\s*\n\s*to service_role;/,
    );
  });

  test('0174는 정확히 하나의 함수(create_order_refund_request)만 재정의한다', () => {
    const matches = NEW_SQL.match(/create or replace function/g) ?? [];
    expect(matches.length).toBe(1);
    expect(NEW_SQL).not.toContain('create table');
    expect(NEW_SQL).not.toContain('restore_stock_for_order');
    expect(NEW_SQL).not.toContain('complete_order_refund');
    expect(NEW_SQL).not.toContain('update_order_refund_exception');
  });
});
