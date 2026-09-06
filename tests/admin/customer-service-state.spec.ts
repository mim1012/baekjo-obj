import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { isCustomerServiceRequestTransitionAllowed, nextCustomerServiceRequestStatuses } from '@/lib/orders/customerServiceState';

test('교환·반품 요청은 접수 → 검토 → 승인/반려 → 완료 순서만 허용한다', () => {
  expect(nextCustomerServiceRequestStatuses('received')).toEqual(['reviewing']);
  expect(nextCustomerServiceRequestStatuses('reviewing')).toEqual(['approved', 'rejected']);
  expect(nextCustomerServiceRequestStatuses('approved')).toEqual(['completed']);
  expect(nextCustomerServiceRequestStatuses('rejected')).toEqual(['completed']);
  expect(nextCustomerServiceRequestStatuses('completed')).toEqual([]);
  expect(isCustomerServiceRequestTransitionAllowed('received', 'approved')).toBe(false);
  expect(isCustomerServiceRequestTransitionAllowed('completed', 'reviewing')).toBe(false);
  expect(isCustomerServiceRequestTransitionAllowed('reviewing', 'reviewing')).toBe(true);
});

test('화면·API·DB가 같은 상태 전이 방어를 사용한다', () => {
  const root = path.resolve(__dirname, '..', '..');
  const page = fs.readFileSync(path.join(root, 'src/app/admin/order-requests/page.tsx'), 'utf8');
  const route = fs.readFileSync(path.join(root, 'src/app/api/admin/order-requests/[id]/route.ts'), 'utf8');
  const migration = fs.readFileSync(path.join(root, 'supabase/migrations/0158_customer_service_request_state_guard.sql'), 'utf8');
  expect(page).toContain('nextCustomerServiceRequestStatuses(request.status)');
  expect(route).toContain('isCustomerServiceRequestTransitionAllowed(current.status');
  expect(route).toContain('invalid-status-transition');
  expect(migration).toContain('INVALID_CUSTOMER_REQUEST_STATUS_TRANSITION');
  expect(migration).toContain("old.status = 'received' and new.status = 'reviewing'");
  expect(migration).toContain("old.status in ('approved', 'rejected') and new.status = 'completed'");
});
