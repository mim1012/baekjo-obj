import { test, expect } from '@playwright/test';
import {
  ORDER_POLICY_TTL_MIN_HOURS,
  ORDER_POLICY_TTL_MAX_HOURS,
  defaultOrderPolicyConfig,
  normalizeOrderPolicyConfig,
} from '@/lib/orderPolicy/config';

// 주문 정책(무통장 자동취소 on/off + TTL) 정규화 순수 함수 스펙 — DB/브라우저/네트워크 불필요.
// normalize 는 주문 생성 경로(POST /api/orders → resolveBankTransferTtlMs)가 읽는 최종 방어선이라
// 어떤 입력에도 throw 없이 안전한 값을 돌려줘야 한다. 깨진 설정이 주문 생성을 죽이면 안 되고,
// 깨진 값이 자동취소를 "켜는" 방향으로 접혀서도 안 된다(기본 비활성 — 2026-07-18 결정).

test('기본값은 자동취소 비활성 + 72시간(재활성화 대비 보존값)이다', () => {
  expect(defaultOrderPolicyConfig.bankTransferAutoCancelEnabled).toBe(false);
  expect(defaultOrderPolicyConfig.bankTransferTtlHours).toBe(72);
});

test('bankTransferAutoCancelEnabled 는 저장값이 === true 일 때만 true 다', () => {
  expect(
    normalizeOrderPolicyConfig({ bankTransferAutoCancelEnabled: true, bankTransferTtlHours: 72 })
      .bankTransferAutoCancelEnabled,
  ).toBe(true);
  expect(
    normalizeOrderPolicyConfig({ bankTransferAutoCancelEnabled: false, bankTransferTtlHours: 72 })
      .bankTransferAutoCancelEnabled,
  ).toBe(false);
});

test('enabled 누락·비불리언(truthy 포함)은 전부 false 로 접는다(자동취소가 몰래 켜지면 안 됨)', () => {
  expect(normalizeOrderPolicyConfig({ bankTransferTtlHours: 72 }).bankTransferAutoCancelEnabled).toBe(false);
  expect(
    normalizeOrderPolicyConfig({ bankTransferAutoCancelEnabled: 'true', bankTransferTtlHours: 72 })
      .bankTransferAutoCancelEnabled,
  ).toBe(false);
  expect(
    normalizeOrderPolicyConfig({ bankTransferAutoCancelEnabled: 1, bankTransferTtlHours: 72 })
      .bankTransferAutoCancelEnabled,
  ).toBe(false);
  expect(normalizeOrderPolicyConfig(undefined).bankTransferAutoCancelEnabled).toBe(false);
  expect(normalizeOrderPolicyConfig(null).bankTransferAutoCancelEnabled).toBe(false);
  expect(normalizeOrderPolicyConfig({}).bankTransferAutoCancelEnabled).toBe(false);
});

test('ttlHours 는 enabled 와 무관하게 항상 정규화·보존한다(재활성화 대비)', () => {
  const disabled = normalizeOrderPolicyConfig({
    bankTransferAutoCancelEnabled: false,
    bankTransferTtlHours: 24,
  });
  expect(disabled.bankTransferTtlHours).toBe(24);
  const enabled = normalizeOrderPolicyConfig({
    bankTransferAutoCancelEnabled: true,
    bankTransferTtlHours: 24,
  });
  expect(enabled.bankTransferTtlHours).toBe(24);
});

test('쓰레기 입력(비객체·필드 누락·비수치)은 ttl 기본 72시간으로 접는다', () => {
  expect(normalizeOrderPolicyConfig(undefined).bankTransferTtlHours).toBe(72);
  expect(normalizeOrderPolicyConfig(null).bankTransferTtlHours).toBe(72);
  expect(normalizeOrderPolicyConfig({}).bankTransferTtlHours).toBe(72);
  expect(normalizeOrderPolicyConfig('abc').bankTransferTtlHours).toBe(72);
  expect(normalizeOrderPolicyConfig({ bankTransferTtlHours: 'abc' }).bankTransferTtlHours).toBe(72);
  expect(normalizeOrderPolicyConfig({ bankTransferTtlHours: NaN }).bankTransferTtlHours).toBe(72);
  expect(normalizeOrderPolicyConfig({ bankTransferTtlHours: Infinity }).bankTransferTtlHours).toBe(72);
});

test('ttl 이 깨져도 enabled === true 는 살아남는다(필드별 독립 정규화)', () => {
  const normalized = normalizeOrderPolicyConfig({
    bankTransferAutoCancelEnabled: true,
    bankTransferTtlHours: 'abc',
  });
  expect(normalized.bankTransferAutoCancelEnabled).toBe(true);
  expect(normalized.bankTransferTtlHours).toBe(72);
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
