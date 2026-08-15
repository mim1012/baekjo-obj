import { test, expect } from '@playwright/test';
import { q, stockOf, orderRow, supabaseEnvReady, fixtureId } from './helpers';

test.skip(!supabaseEnvReady(), 'SUPABASE_URL/SUPABASE_ACCESS_TOKEN 미설정 — staging DB 스펙 skip');

test.describe.serial('부분환불 원장 DB 계약', () => {
  const productId = fixtureId('partial_refund_product');
  const customerName = fixtureId('partial_refund_customer');
  const paymentKey = fixtureId('partial_refund_payment');
  const firstIdempotencyKey = fixtureId('partial_refund_first');
  const secondIdempotencyKey = fixtureId('partial_refund_second');
  const thirdIdempotencyKey = fixtureId('partial_refund_third');
  const items = `[{
    "productId":"${productId}",
    "productName":"${productId}",
    "quantity":5,
    "price":1000
  }]`;
  let orderId = '';
  let firstRefundId = '';

  test.beforeAll(async () => {
    await q(`delete from public.order_refunds where idempotency_key like '${fixtureId('partial_refund')}%';`);
    await q(`delete from public.orders where customer_name='${customerName}';`);
    await q(`delete from public.products where id='${productId}';`);
    await q(`insert into public.products (id, name, brand_id, category, price, stock, is_visible)
             values ('${productId}', '${productId}', (select id from public.brands limit 1), 'etc', 1000, 0, false);`);
    orderId = (
      await q(`insert into public.orders
        (customer_name, items, total_price, delivery_fee, payment_method, order_status, payment_status, delivery_status, payment_key, paid_at)
        values ('${customerName}', '${items}'::jsonb, 5000, 0, '신용카드', '주문접수', '결제완료', '배송전', '${paymentKey}', now())
        returning id;`)
    )[0].id as string;
  });

  test.afterAll(async () => {
    if (orderId) await q(`delete from public.order_refunds where order_id='${orderId}';`);
    if (orderId) await q(`delete from public.orders where id='${orderId}';`);
    await q(`delete from public.products where id='${productId}';`);
  });

  test('부분환불 원장은 서버 단가로 금액을 만들고 선택 수량만 복원한다', async () => {
    const created = (
      await q(`select public.create_order_refund_request(
        '${orderId}',
        '${firstIdempotencyKey}',
        '[{"lineIndex":0,"productId":"${productId}","quantity":1}]'::jsonb,
        false,
        5000,
        '상품 1개 반품',
        null
      ) as refund;`)
    )[0].refund as Record<string, unknown>;
    firstRefundId = created.id as string;
    expect(created.requested_amount).toBe(1000);

    const completed = (
      await q(`select public.complete_order_refund('${firstRefundId}', 1000, 4000, 'PARTIAL_CANCELED', 'transaction-1') as refund;`)
    )[0].refund as Record<string, unknown>;
    expect(completed.status).toBe('SUCCEEDED');
    expect(await stockOf(productId)).toBe(1);
    expect((await orderRow(orderId)).payment_status).toBe('결제완료');
  });

  test('원장 확정 재시도는 재고를 이중 복원하지 않는다', async () => {
    const completed = (
      await q(`select public.complete_order_refund('${firstRefundId}', 1000, 4000, 'PARTIAL_CANCELED', 'transaction-1') as refund;`)
    )[0].refund as Record<string, unknown>;
    expect(completed.status).toBe('SUCCEEDED');
    expect(await stockOf(productId)).toBe(1);
  });

  test('잔여 수량을 전액 환불하면 결제완료에서 환불완료로 전이한다', async () => {
    const created = (
      await q(`select public.create_order_refund_request(
        '${orderId}',
        '${secondIdempotencyKey}',
        '[{"lineIndex":0,"productId":"${productId}","quantity":4}]'::jsonb,
        true,
        4000,
        '잔여 상품 환불',
        null
      ) as refund;`)
    )[0].refund as Record<string, unknown>;
    const secondRefundId = created.id as string;
    expect(created.requested_amount).toBe(4000);

    const completed = (
      await q(`select public.complete_order_refund('${secondRefundId}', 4000, 0, 'CANCELED', 'transaction-2') as refund;`)
    )[0].refund as Record<string, unknown>;
    expect(completed.status).toBe('SUCCEEDED');
    expect(await stockOf(productId)).toBe(5);
    expect((await orderRow(orderId)).payment_status).toBe('환불완료');
  });

  test('환불완료 주문과 이미 환불된 수량은 새 원장을 만들 수 없다', async () => {
    let rejected = false;
    try {
      await q(`select public.create_order_refund_request(
        '${orderId}',
        '${thirdIdempotencyKey}',
        '[{"lineIndex":0,"productId":"${productId}","quantity":1}]'::jsonb,
        false,
        0,
        '중복 환불',
        null
      );`);
    } catch (error) {
      rejected = /REFUND_ORDER_NOT_PAID|REFUND_QUANTITY_EXCEEDS_REMAINING|REFUND_AMOUNT_EXCEEDS_BALANCE/.test(
        String(error),
      );
    }
    expect(rejected).toBe(true);
  });
});
