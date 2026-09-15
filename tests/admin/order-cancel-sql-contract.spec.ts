import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// 소스-계약 스펙(순수, DB/네트워크/브라우저 불필요) — 0169/0170/0171이 PR4 취소 계약(0169~0171)
// 을 정확히 구현하는지 SQL 텍스트만으로 고정한다. staging에는 옛 0151(order_action_request_items)
// 이 이미 적용돼 있어 0169는 reconcile(대부분 no-op)이고, 0170/0171은 같은 시그니처를
// create or replace로 재발행한다 — 40001은 PostgREST가 투명 재시도하다 30초+ 무응답을 내므로
// (wiki: PostgREST-RPC-40001충돌-30초무응답-PT409) 절대 금지, 애플리케이션 레벨 충돌은 전부
// PT409로 raise한다.

const root = path.resolve(__dirname, '..', '..');
const MIGRATIONS_DIR = path.join(root, 'supabase/migrations');

function read(file: string): string {
  return fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
}

const sql0072 = read('0072_order_refund_ledger.sql');
const sql0169 = read('0169_order_action_request_items_reconcile.sql');
const sql0170 = read('0170_order_action_request_contract.sql');
const sql0171 = read('0171_cancel_settlement_cross_guards.sql');
const allThree = `${sql0169}\n${sql0170}\n${sql0171}`;

/** `create or replace function public.<name>(` 부터, 다음 최상위 `create or replace function`
 *  / `revoke` / 파일 끝 중 먼저 오는 지점까지를 그 함수의 전체 정의(서명+본문)로 잘라낸다. */
function extractFunctionSource(sql: string, functionName: string): string {
  const startMarker = `create or replace function public.${functionName}(`;
  const start = sql.indexOf(startMarker);
  expect(start, `${functionName} 정의를 찾지 못함`).toBeGreaterThanOrEqual(0);
  const rest = sql.slice(start + startMarker.length);
  const nextFunction = rest.search(/create or replace function public\./);
  const nextRevoke = rest.search(/\nrevoke /);
  const candidates = [nextFunction, nextRevoke].filter((index) => index >= 0);
  const end = candidates.length > 0 ? Math.min(...candidates) : rest.length;
  return sql.slice(start, start + startMarker.length + end);
}

/** `as $$ ... $$;` 사이의 함수 본문만 추출한다(서명·language·security 절 제외, 순수 로직 비교용). */
function extractFunctionBody(sql: string, functionName: string): string {
  const source = extractFunctionSource(sql, functionName);
  const bodyStart = source.indexOf('as $$');
  expect(bodyStart, `${functionName}의 'as $$' 시작부를 찾지 못함`).toBeGreaterThanOrEqual(0);
  const bodyEnd = source.lastIndexOf('$$;');
  expect(bodyEnd, `${functionName}의 '$$;' 종료부를 찾지 못함`).toBeGreaterThan(bodyStart);
  return source.slice(bodyStart + 'as $$'.length, bodyEnd);
}

test.describe('PR4 취소 SQL 계약 (0169/0170/0171)', () => {
  test('40001은 어디에도 없다', () => {
    expect(allThree).not.toContain('40001');
  });

  test('errcode를 지정하는 모든 raise exception은 PT409/P0002/22023 중 하나다', () => {
    const matches = [...allThree.matchAll(/using\s+errcode\s*=\s*'([^']+)'/g)].map((m) => m[1]);
    expect(matches.length).toBeGreaterThan(0);
    for (const code of matches) {
      expect(['PT409', 'P0002', '22023'], `허용되지 않은 errcode: ${code}`).toContain(code);
    }
  });

  test('0169는 DDL을 if not exists/if exists로만 쓰고, drop은 index if exists 하나뿐이다', () => {
    const createTableStatements = [...sql0169.matchAll(/create table\s+(if not exists\s+)?public\.\w+/g)];
    expect(createTableStatements.length).toBeGreaterThan(0);
    for (const [statement] of createTableStatements) {
      expect(statement).toMatch(/^create table if not exists /);
    }

    const addColumnStatements = [...sql0169.matchAll(/alter table public\.\w+ add column\s+(if not exists\s+)?\w+/g)];
    expect(addColumnStatements.length).toBeGreaterThan(0);
    for (const [statement] of addColumnStatements) {
      expect(statement).toMatch(/add column if not exists /);
    }

    const createIndexStatements = [...sql0169.matchAll(/create (?:unique )?index\s+(if not exists\s+)?\w+/g)];
    expect(createIndexStatements.length).toBeGreaterThan(0);
    for (const [statement] of createIndexStatements) {
      expect(statement).toMatch(/if not exists /);
    }

    const dropStatements = [...sql0169.matchAll(/\bdrop\s+\w+[^;]*/gi)];
    expect(dropStatements.length).toBeGreaterThan(0);
    for (const [statement] of dropStatements) {
      expect(statement.toLowerCase()).toMatch(/^drop index if exists /);
    }

    // 백필 INSERT는 "행 0건인 요청"만 대상으로 한다.
    const backfillInsert = sql0169.slice(
      sql0169.indexOf('insert into public.order_action_request_items'),
      sql0169.indexOf('-- Re-derive every'),
    );
    expect(backfillInsert).toContain('where not exists (');
    expect(backfillInsert).toContain('select 1 from public.order_action_request_items i where i.request_id = r.id');
  });

  test('create_order_action_request: 락 순서 orders < order_action_requests < order_action_request_items', () => {
    const source = extractFunctionSource(sql0170, 'create_order_action_request');
    const ordersLock = source.indexOf('from public.orders\n   where id = p_order_id\n   for update;');
    const requestsLock = source.indexOf('from public.order_action_requests\n   where order_id = p_order_id\n   for update;');
    const itemsInsert = source.indexOf('insert into public.order_action_request_items');
    expect(ordersLock).toBeGreaterThanOrEqual(0);
    expect(requestsLock).toBeGreaterThan(ordersLock);
    expect(itemsInsert).toBeGreaterThan(requestsLock);
  });

  test('create_order_action_request: 잔여 수량 위반은 PT409, 삽입은 이후에만 일어난다', () => {
    const source = extractFunctionSource(sql0170, 'create_order_action_request');
    expect(source).toContain('v_order_quantity - v_active_qty - v_refunded_qty');
    expect(source).toMatch(/raise exception 'ACTION_QUANTITY_EXCEEDS_REMAINING' using errcode = 'PT409';/);
    expect(source).toMatch(/raise exception 'ACTION_REQUEST_ALREADY_EXISTS' using errcode = 'PT409';/);
  });

  test('transition_action_request: 락 순서 order_action_requests < orders', () => {
    const source = extractFunctionSource(sql0170, 'transition_action_request');
    const requestLock = source.indexOf('from public.order_action_requests\n   where id = p_request_id\n   for update;');
    const orderLock = source.indexOf('from public.orders\n   where id = v_request.order_id\n   for update;');
    expect(requestLock).toBeGreaterThanOrEqual(0);
    expect(orderLock).toBeGreaterThan(requestLock);
  });

  test('complete_action_request_and_restore: 락 순서 orders < order_action_requests(잠금 select)', () => {
    const source = extractFunctionSource(sql0170, 'complete_action_request_and_restore');
    const ordersLock = source.indexOf('from public.orders\n   where id = v_order_id\n   for update;');
    // 잠금 없는 최초 order_id 조회(select order_id into v_order_id ... 끝에 for update 없음)와
    // 그 다음의 실제 잠금 select를 구분해야 한다 — 잠금 select만 찾는다.
    const requestLockMarker = 'from public.order_action_requests\n   where id = p_request_id\n   for update;';
    const requestLock = source.indexOf(requestLockMarker);
    expect(ordersLock).toBeGreaterThanOrEqual(0);
    expect(requestLock).toBeGreaterThan(ordersLock);
    // 잠금 없는 최초 조회가 orders 잠금보다 먼저 온다(그래야 order_id를 안 상태에서 orders를 먼저 잠글 수 있다).
    const unlockedLookup = source.indexOf('select order_id into v_order_id');
    expect(unlockedLookup).toBeGreaterThanOrEqual(0);
    expect(unlockedLookup).toBeLessThan(ordersLock);
  });

  test('complete_action_request_and_restore: 0031에 위임하고 restore_stock_for_order를 직접 호출하지 않는다', () => {
    const source = extractFunctionSource(sql0170, 'complete_action_request_and_restore');
    expect(source).toContain('cancel_order_reservation_and_restore(');
    expect(source).not.toContain('restore_stock_for_order(');
    expect(source).toContain("raise exception 'ACTION_UNPAID_PARTIAL_NOT_SUPPORTED' using errcode = 'PT409';");
    expect(source).toContain("raise exception 'ACTION_MANUAL_REFUND_REQUIRED' using errcode = 'PT409';");
    expect(source).toContain("raise exception 'ACTION_REFUND_NOT_SETTLED' using errcode = 'PT409';");
  });

  test('recompute_order_cancel_status: 배송비 상한 조건과 부분취소완료를 포함한다', () => {
    const source = extractFunctionSource(sql0170, 'recompute_order_cancel_status');
    expect(source).toContain("v_order.payment_status = '결제완료'");
    expect(source).toContain('v_order.delivery_fee > 0');
    expect(source).toContain('r.include_delivery_fee');
    expect(source).toContain("'부분취소완료'");
    expect(source).toContain("'취소완료'");
    // 전량 REJECTED → 주문접수 복귀는 '취소요청'/'부분취소'일 때만.
    expect(source).toMatch(/if v_order\.order_status in \('취소요청', '부분취소'\) then/);
    expect(source).toContain("update public.orders set order_status = '주문접수' where id = p_order_id;");
  });

  test('0171: complete_order_refund는 recompute 호출 한 줄만 추가하고 나머지는 0072 본문과 동일하다', () => {
    expect(sql0171).toContain('recompute_order_cancel_status(v_refund.order_id)');

    const body0072 = extractFunctionBody(sql0072, 'complete_order_refund');
    const body0171 = extractFunctionBody(sql0171, 'complete_order_refund');
    const addedLine = '\n  perform public.recompute_order_cancel_status(v_refund.order_id);';
    expect(body0171).toContain(addedLine);
    expect(body0171.replace(addedLine, '')).toBe(body0072);
  });

  test('0171: guard_customer_service_request_insert에 부분취소가 제외 상태로 추가됐다', () => {
    const source = extractFunctionSource(sql0171, 'guard_customer_service_request_insert');
    expect(source).toContain("o.order_status not in ('취소요청', '부분취소', '취소완료')");
  });

  test('0170/0171: 함수마다 revoke + grant service_role 쌍이 있다', () => {
    function escapeRegex(value: string): string {
      return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function expectRevokeGrant(sql: string, name: string, signature: string): void {
      const escaped = `public\\.${name}${escapeRegex(signature)}`;
      const revokeRe = new RegExp(`revoke execute on function ${escaped} from public, anon, authenticated;`);
      const grantRe = new RegExp(`grant execute on function ${escaped} to service_role;`);
      expect(sql, `${name} revoke 없음`).toMatch(revokeRe);
      expect(sql, `${name} grant 없음`).toMatch(grantRe);
    }

    const functionsIn0170 = [
      ['derive_action_request_status', '(uuid)'],
      ['recompute_order_cancel_status', '(uuid)'],
      ['create_order_action_request', '(uuid, uuid, text, text, jsonb, integer, text)'],
      ['transition_action_request', '(uuid, text)'],
      ['complete_action_request_and_restore', '(uuid)'],
    ] as const;
    for (const [name, signature] of functionsIn0170) {
      expectRevokeGrant(sql0170, name, signature);
    }

    const functionsIn0171 = [
      ['complete_order_refund', '(uuid, integer, integer, text, text)'],
      ['guard_customer_service_request_insert', '()'],
    ] as const;
    for (const [name, signature] of functionsIn0171) {
      expectRevokeGrant(sql0171, name, signature);
    }
  });

  test('0169: order_action_request_items 테이블 grant도 잠겨 있다', () => {
    expect(sql0169).toMatch(/revoke all on public\.order_action_request_items from public, anon, authenticated;/);
  });
});
