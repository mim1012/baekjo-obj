import { test, expect } from '@playwright/test';
import {
  ORDER_POLICY_TTL_MIN_HOURS,
  ORDER_POLICY_TTL_MAX_HOURS,
  defaultOrderPolicyConfig,
  normalizeOrderPolicyConfig,
} from '@/lib/orderPolicy/config';

// 주문 정책(무통장 TTL) 정규화 순수 함수 스펙 — DB/브라우저/네트워크 불필요.
// normalize 는 주문 생성 경로(POST /api/orders → resolveBankTransferTtlMs)가 읽는 최종 방어선이라
// 어떤 입력에도 throw 없이 안전한 값을 돌려줘야 한다. 깨진 설정이 주문 생성을 죽이면 안 된다.

test('기본값은 72시간이다', () => {
  expect(defaultOrderPolicyConfig.bankTransferTtlHours).toBe(72);
});

test('쓰레기 입력(비객체·필드 누락·비수치)은 전부 기본 72시간으로 접는다', () => {
  expect(normalizeOrderPolicyConfig(undefined).bankTransferTtlHours).toBe(72);
  expect(normalizeOrderPolicyConfig(null).bankTransferTtlHours).toBe(72);
  expect(normalizeOrderPolicyConfig({}).bankTransferTtlHours).toBe(72);
  expect(normalizeOrderPolicyConfig('abc').bankTransferTtlHours).toBe(72);
  expect(normalizeOrderPolicyConfig({ bankTransferTtlHours: 'abc' }).bankTransferTtlHours).toBe(72);
  expect(normalizeOrderPolicyConfig({ bankTransferTtlHours: NaN }).bankTransferTtlHours).toBe(72);
  expect(normalizeOrderPolicyConfig({ bankTransferTtlHours: Infinity }).bankTransferTtlHours).toBe(72);
});

test('범위 밖 숫자는 [1, 720]으로 클램프한다(기본값 폴백이 아니라 클램프)', () => {
  expect(normalizeOrderPolicyConfig({ bankTransferTtlHours: 0 }).bankTransferTtlHours).toBe(
    ORDER_POLICY_TTL_MIN_HOURS,
  );
  expect(normalizeOrderPolicyConfig({ bankTransferTtlHours: -5 }).bankTransferTtlHours).toBe(
    ORDER_POLICY_TTL_MIN_HOURS,
  );
  expect(normalizeOrderPolicyConfig({ bankTransferTtlHours: 100000 }).bankTransferTtlHours).toBe(
    ORDER_POLICY_TTL_MAX_HOURS,
  );
});

test('소수는 정수로 반올림한다(47.6 → 48)', () => {
  expect(normalizeOrderPolicyConfig({ bankTransferTtlHours: 47.6 }).bankTransferTtlHours).toBe(48);
});

test('범위 안 정수는 그대로 통과한다', () => {
  expect(normalizeOrderPolicyConfig({ bankTransferTtlHours: 24 }).bankTransferTtlHours).toBe(24);
  expect(normalizeOrderPolicyConfig({ bankTransferTtlHours: 720 }).bankTransferTtlHours).toBe(720);
  expect(normalizeOrderPolicyConfig({ bankTransferTtlHours: 1 }).bankTransferTtlHours).toBe(1);
});
