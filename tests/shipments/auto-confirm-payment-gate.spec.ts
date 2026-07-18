import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');
const src = (...parts: string[]) => fs.readFileSync(path.join(root, ...parts), 'utf8');

// 자동 구매확정 크론 결제 게이트 소스 배선 잠금 — 브라우저·DB 불필요, 항상 실행.
// 0044(orders 조인 RPC)가 실제로 배선돼 있는지, 그리고 고친 버그(조인 없는 직접 UPDATE)가
// 재도입되지 않았는지를 SQL 실행 없이 정적으로 잠근다. DB 계약 자체는
// auto-confirm-payment-gate.db.spec.ts가 staging에서 검증한다.

test.describe('자동 구매확정 결제 게이트 소스 배선', () => {
  test('autoConfirmDeliveredBefore는 결제 게이트 RPC를 호출하고, 조인 없는 직접 UPDATE를 쓰지 않는다', () => {
    const repo = src('src', 'lib', 'shipments', 'repo.ts');

    const match = repo.match(/export async function autoConfirmDeliveredBefore\([\s\S]*?\n\}/);
    expect(match, 'autoConfirmDeliveredBefore 함수를 repo.ts에서 찾지 못함').not.toBeNull();
    const fnBody = match![0];

    expect(fnBody).toContain("rpc('auto_confirm_paid_delivered_shipments'");
    expect(fnBody).toContain('p_cutoff: cutoffIso');
    expect(fnBody).toContain('p_confirmed_at: confirmedAt');

    // ⭐ 핵심 회귀: 조인 없는 구 set-based UPDATE(.from('shipments').update(...))가 이 함수 안에
    // 재도입되면 결제 게이트가 다시 사라진다 — orders.payment_status를 안 보는 경로로 퇴행.
    expect(fnBody).not.toContain(".from('shipments')");
  });

  test('0044 마이그레이션이 orders 조인 결제 게이트로 RPC를 정의한다', () => {
    const migration = src('supabase', 'migrations', '0044_auto_confirm_payment_gate.sql');

    expect(migration).toContain('create or replace function public.auto_confirm_paid_delivered_shipments');
    expect(migration).toContain('from public.orders o');
    expect(migration).toContain("o.payment_status = '결제완료'");
    expect(migration).toContain("s.delivery_status = '배송완료'");
    expect(migration).toContain("set delivery_status = '구매확정'");
  });
});
