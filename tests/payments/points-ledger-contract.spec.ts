import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/0036_points_ledger.sql', 'utf8');
const ordersRepo = readFileSync('src/lib/orders/repo.ts', 'utf8');
const ordersRoute = readFileSync('src/app/api/orders/route.ts', 'utf8');
const confirmPayment = readFileSync('src/lib/payments/confirmPayment.ts', 'utf8');
const adminOrderRoute = readFileSync('src/app/api/admin/orders/[id]/route.ts', 'utf8');
const orderCompletePage = readFileSync('src/app/order-complete/page.tsx', 'utf8');
const mypagePage = readFileSync('src/app/mypage/page.tsx', 'utf8');
const mypageOverview = readFileSync('src/app/mypage/components/OverviewSection.tsx', 'utf8');
const mypageOrders = readFileSync('src/app/mypage/components/OrdersSection.tsx', 'utf8');
const adminOrderTable = readFileSync('src/components/admin-new/orders/OrderDataTable.tsx', 'utf8');
const adminOrderMobile = readFileSync('src/components/admin-new/orders/OrderMobileCard.tsx', 'utf8');
const adminOrderDetail = readFileSync('src/components/admin-new/orders/OrderDetailPage.tsx', 'utf8');
const orderAmounts = readFileSync('src/lib/orders/amounts.ts', 'utf8');
const checkoutPage = readFileSync('src/app/checkout/page.tsx', 'utf8');
const storage = readFileSync('src/lib/storage.ts', 'utf8');

test.describe('points ledger foundation contract', () => {
  test('migration adds ledger, cached balance, order fields, and service-role-only order RPC', () => {
    expect(migration).toContain('add column if not exists points_balance');
    expect(migration).toContain('add column if not exists used_points');
    expect(migration).toContain('add column if not exists payable_amount');
    expect(migration).toContain('create table if not exists public.points_ledger');
    expect(migration).toContain('idempotency_key text not null unique');
    expect(migration).toContain('create or replace function public.create_order_with_points');
    expect(migration).toContain("v_member.role <> 'user' or v_member.status <> 'active'");
    expect(migration).toContain('perform public.decrement_stock_for_order(p_items)');
    expect(migration).toContain("case when v_payable_amount = 0 then '결제완료'");
    expect(migration).toContain('create or replace function public.restore_points_for_order');
    expect(migration).toContain("idempotency_key = 'order:' || p_order_id::text || ':points:restore'");
    expect(migration).toContain('perform public.restore_points_for_order');
    expect(migration).toContain('revoke execute on function public.create_order_with_points');
    expect(migration).toContain('grant execute on function public.create_order_with_points');
    expect(migration).toContain('to service_role');
    expect(migration).not.toContain('to anon');
  });

  test('order repository maps legacy-safe points fields and uses the atomic RPC', () => {
    expect(ordersRepo).toContain('used_points, payable_amount');
    expect(ordersRepo).toContain('usedPoints: row.used_points ?? 0');
    expect(ordersRepo).toContain('payableAmount: row.payable_amount ?? row.total_price + row.delivery_fee');
    expect(ordersRepo).toContain("rpc('create_order_with_points'");
    expect(ordersRepo).toContain('PointsIneligibleError');
    expect(ordersRepo).toContain('InsufficientPointsError');
    expect(ordersRepo).toContain('PointsExceedOrderTotalError');
    expect(ordersRepo).toContain("rpc('restore_points_for_order'");
  });

  test('order API rejects forged point usage and no longer performs app-layer insert-then-stock compensation', () => {
    expect(ordersRoute).toContain('pointsToUse');
    expect(ordersRoute).toContain('points-exceed-order-total');
    expect(ordersRoute).toContain('points-ineligible');
    expect(ordersRoute).toContain('insufficient-points');
    expect(ordersRoute).toContain('createOrderWithReservation(validated, memberId, pointsToUse)');
    expect(ordersRoute).not.toContain('deleteOrderById(order.id)');
    expect(ordersRoute).not.toContain('decrementStockForOrder(');
    expect(adminOrderRoute).toContain('restorePointsForOrder');
    expect(adminOrderRoute).toContain("updates.paymentStatus === '환불완료'");
    expect(adminOrderRoute).toContain("updates.orderStatus === '환불완료'");
  });

  test('terminal restoration surfaces restore points exactly once by shared RPC contract', () => {
    expect(migration).toContain('create or replace function public.cancel_order_reservation_and_restore');
    expect(migration).toContain("and payment_status in ('결제대기', '입금대기')");
    expect(migration).toContain('create or replace function public.cancel_confirming_and_restore');
    expect(migration).toContain("and payment_status = '승인중'");
    expect(migration).toContain('and payment_key = p_payment_key');
    expect(migration).toContain("'order:' || p_order_id::text || ':points:restore'");
    expect(adminOrderRoute).toContain("updates.orderStatus === '취소완료'");
    expect(adminOrderRoute).toContain("updates.orderStatus === '환불완료'");
    expect(adminOrderRoute).toContain("updates.paymentStatus === '결제취소'");
    expect(adminOrderRoute).toContain("updates.paymentStatus === '환불완료'");
    expect(adminOrderRoute).toContain('restorePointsForOrder(id,');
  });

  test('payment confirmation compares Toss amount against payableAmount, not gross order amount', () => {
    expect(confirmPayment).toContain('usedPoints: order.usedPoints');
    expect(confirmPayment).toContain('payableAmount: order.payableAmount');
    expect(confirmPayment).toContain('order.payableAmount ?? order.totalPrice + order.deliveryFee');
    expect(confirmPayment).not.toContain('const expectedAmount = order.totalPrice + order.deliveryFee;');
  });

  test('checkout exposes member-only points spend UX and skips Toss for zero-payable card orders', () => {
    expect(storage).toContain('pointsToUse?: number');
    expect(storage).toContain("fetch('/api/me/points')");
    expect(storage).toContain('throw new Error(body.error)');

    expect(checkoutPage).toContain('getMyPointsBalance');
    expect(checkoutPage).toContain('const maxUsablePoints = pointsBalance?.eligible ? Math.min(pointsBalance.balance, finalPrice) : 0;');
    expect(checkoutPage).toContain('const appliedPoints = Math.min(requestedPoints, maxUsablePoints);');
    expect(checkoutPage).toContain('const payablePrice = finalPrice - appliedPoints;');
    expect(checkoutPage).toContain('전액 사용');
    expect(checkoutPage).toContain('비회원·관리자·파트너 계정은 결제 금액에서 차감되지 않습니다.');
    expect(checkoutPage).toContain('pointsToUse: appliedPoints > 0 ? appliedPoints : undefined');
    expect(checkoutPage).toContain('widgetAmount <= 0');
    expect(checkoutPage).toContain('payablePrice === 0');
    expect(checkoutPage).toContain('외부 카드 결제창 없이 주문을 완료합니다.');
    expect(checkoutPage).toContain('authoritativePrice !== payablePrice');
    expect(checkoutPage).toContain('insufficient-points');
  });
  test('account, order-complete, and admin surfaces show used points and real payable amounts', () => {
    expect(orderAmounts).toContain('getOrderPayableAmount');
    expect(orderAmounts).toContain('order.payableAmount ?? getOrderGrossAmount(order)');
    expect(orderAmounts).toContain('getOrderUsedPoints');

    expect(orderCompletePage).toContain('getOrderPayableAmount(order)');
    expect(orderCompletePage).toContain('적립금 사용');
    expect(orderCompletePage).toContain('최종 결제금액');

    expect(mypagePage).toContain('getMyPoints');
    expect(mypagePage).toContain('pointsBalance');
    expect(mypageOverview).toContain('보유 적립금');
    expect(mypageOverview).toContain('최근 적립금 내역');
    expect(mypageOverview).toContain('잔액 {formatPrice(transaction.balanceAfter)}');
    expect(mypagePage).toContain('pointsTransactions');
    expect(mypageOrders).toContain('getOrderPayableAmount(order)');
    expect(mypageOrders).toContain('적립금 -{formatPrice(usedPoints)}');

    expect(adminOrderTable).toContain('getOrderPayableAmount(row)');
    expect(adminOrderTable).toContain('적립금 -{formatPrice(usedPoints)}');
    expect(adminOrderMobile).toContain("label: '실결제금액'");
    expect(adminOrderMobile).toContain("label: '사용 적립금'");
    expect(adminOrderDetail).toContain('getOrderPayableAmount(order)');
    expect(adminOrderDetail).toContain('실결제 금액');
    expect(adminOrderDetail).toContain('사용 적립금');
  });
});
