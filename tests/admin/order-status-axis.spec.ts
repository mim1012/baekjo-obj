import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  DELIVERY_STATUSES,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
} from '../../src/types';
import { DEPOSIT_CONFIRM_UPDATE } from '../../src/components/admin-new/orders/DepositConfirmButton';

test.describe('주문 상태 3축 분리 계약', () => {
  test('주문상태 옵션에는 결제/배송 상태가 섞이지 않는다', () => {
    expect(ORDER_STATUSES).toEqual(['주문접수', '취소요청', '취소완료']);

    for (const status of ORDER_STATUSES) {
      expect(PAYMENT_STATUSES).not.toContain(status);
      expect(DELIVERY_STATUSES).not.toContain(status);
    }
  });

  test('입금확인 버튼은 결제상태만 결제완료로 전이한다', () => {
    expect(DEPOSIT_CONFIRM_UPDATE).toEqual({ paymentStatus: '결제완료' });
  });

  test('Toss 결제 확정은 결제상태만 완료로 쓰고 주문상태를 결제완료로 덮지 않는다', () => {
    const repoPath = path.join(process.cwd(), 'src', 'lib', 'orders', 'repo.ts');
    const source = fs.readFileSync(repoPath, 'utf8');
    const setOrderPaidBody = source.match(/export async function setOrderPaid[\s\S]*?\n}\n/);

    expect(setOrderPaidBody?.[0]).toContain("payment_status: '결제완료'");
    expect(setOrderPaidBody?.[0]).not.toContain("order_status: '결제완료'");
  });

  test('새 주문의 배송상태 기본값은 배송전이다', () => {
    const routePath = path.join(process.cwd(), 'src', 'app', 'api', 'orders', 'route.ts');
    const source = fs.readFileSync(routePath, 'utf8');

    expect(source).toContain("deliveryStatus: '배송전'");
    expect(source).not.toContain("deliveryStatus: '배송준비'");
  });
});
