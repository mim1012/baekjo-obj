// order_policy_config 테이블 접근 계층. 이 파일 밖에서는 Supabase를 직접 호출하지 않는다.
// 주문 정책(OrderPolicyConfig)을 한 행(id='default')에 jsonb 로 통째로 저장/조회한다(싱글턴).
import { getSupabase } from '@/lib/supabase/server';
import {
  defaultOrderPolicyConfig,
  normalizeOrderPolicyConfig,
  type OrderPolicyConfig,
} from '@/lib/orderPolicy/config';
import { logServerError } from '@/lib/logServerError';

const SETTINGS_ROW_ID = 'default';

const HOUR_MS = 3_600_000;

/**
 * 저장된 주문 정책을 반환한다. 행이 없으면 null(→ 라우트가 defaultOrderPolicyConfig 로 폴백).
 * 저장값이 손으로 건드려져 깨졌을 수 있으므로 그대로 캐스팅하지 않고 normalize 를 거쳐 돌려준다.
 */
export async function getOrderPolicyConfig(): Promise<OrderPolicyConfig | null> {
  const { data, error } = await getSupabase()
    .from('order_policy_config')
    .select('value')
    .eq('id', SETTINGS_ROW_ID)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizeOrderPolicyConfig(data.value) : null;
}

/** 주문 정책을 통째로 upsert(id='default') 한다. 없으면 생성, 있으면 덮어쓴다. */
export async function saveOrderPolicyConfig(value: OrderPolicyConfig): Promise<void> {
  const { error } = await getSupabase()
    .from('order_policy_config')
    .upsert({ id: SETTINGS_ROW_ID, value, updated_at: new Date().toISOString() });
  if (error) throw error;
}

/** config 를 TTL(ms | null)로 접는다 — null = 무통장 자동취소 미사용(expiresAt 미기록). */
function toTtlMs(config: OrderPolicyConfig): number | null {
  return config.bankTransferAutoCancelEnabled ? config.bankTransferTtlHours * HOUR_MS : null;
}

/**
 * 주문 생성(POST /api/orders)용 무통장입금 TTL(ms) 해석.
 * **null = 무통장 자동취소 미사용 → expiresAt 미기록(cron 스캔 제외).** 활성일 때만 ttlHours*ms.
 * 행이 없거나 조회가 어떤 이유로든 실패해도 defaultOrderPolicyConfig 기준으로 폴백한다
 * (기본이 비활성이므로 폴백 = null) — 정책 테이블 장애가 주문 생성 실패(매출 중단)로
 * 번지면 안 되기 때문이다. 실패는 로그로만 드러낸다.
 */
export async function resolveBankTransferTtlMs(): Promise<number | null> {
  try {
    const config = await getOrderPolicyConfig();
    return toTtlMs(config ?? defaultOrderPolicyConfig);
  } catch (error) {
    logServerError('[orderPolicy] 주문 정책 조회 실패 — 기본값(자동취소 비활성) 폴백', error);
    return toTtlMs(defaultOrderPolicyConfig);
  }
}
