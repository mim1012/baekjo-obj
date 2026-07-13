// 결제 상태기계 DB/라우트 스펙 공용 헬퍼 — staging Supabase Management API 질의.
// ⚠️ SUPABASE_URL은 반드시 staging 프로젝트 ref여야 한다. prod에 __test_* 합성 레코드가 심기면 안 된다.

export function supabaseEnvReady(): boolean {
  return !!process.env.SUPABASE_URL && !!process.env.SUPABASE_ACCESS_TOKEN;
}

// 실행 스코프 고유 접두사(payments-db-spec CI 사고 실측 방지) — 스펙이 고정 ID 픽스처
// (__test_sm_wave0_p1 등)를 공유 staging DB에 만들면, 로컬 실행과 CI 실행이 겹치거나 여러 PR의
// CI가 동시에 돌 때 서로의 상품 재고를 소진시키거나(INSUFFICIENT_STOCK) afterAll이 서로의 픽스처를
// 지워버려 실패한다. GITHUB_RUN_ID는 같은 워크플로 실행 내에서 안정적으로 동일한 값이라 그대로
// 쓰고, 로컬(그 값이 없을 때)은 타임스탬프+랜덤으로 사실상 유일한 값을 만든다.
export const RUN_ID = process.env.GITHUB_RUN_ID ?? `local${Date.now()}${Math.floor(Math.random() * 1000)}`;

/** 실행 스코프 고유 픽스처 id/이름을 만든다 — products.id·orders.customer_name 등에 쓴다.
 *  두 컬럼 다 text(길이 제약 없음, 0004_products_brands.sql)라 잘라낼 필요는 없다. */
export function fixtureId(name: string): string {
  return `__test_${RUN_ID}_${name}`;
}

/**
 * 1시간 넘게 남아있는 고아 __test_* 레코드를 정리한다 — 중단/크래시된 과거 실행의 잔여물 청소용.
 * created_at 시간 게이트 덕에 현재 동시에 도는 다른 워커·실행의 살아있는 픽스처는 절대 건드리지
 * 않는다(그 시점엔 아직 1시간이 안 지났으므로). 실패해도 본 스펙 실행을 막지 않도록 호출부는
 * best-effort로 다룬다.
 */
export async function sweepStaleFixtures(): Promise<void> {
  await q(`delete from public.orders where customer_name like '\\_\\_test\\_%' escape '\\' and created_at < now() - interval '1 hour';`);
  await q(`delete from public.products where id like '\\_\\_test\\_%' escape '\\' and created_at < now() - interval '1 hour';`);
}

export async function q(sql: string): Promise<Record<string, unknown>[]> {
  const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
  const TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? '';
  const ref = SUPABASE_URL.replace(/^https?:\/\/([^.]+)\..*$/, '$1');
  const API = `https://api.supabase.com/v1/projects/${ref}/database/query`;

  const res = await fetch(API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (baekjo-payments-spec/1.0)',
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} ${text}`);
  try {
    return JSON.parse(text);
  } catch {
    return [];
  }
}

export async function stockOf(productId: string): Promise<number> {
  const rows = await q(`select stock from public.products where id='${productId}';`);
  return rows[0].stock as number;
}

export async function orderRow(orderId: string): Promise<{ order_status: string; payment_status: string; expires_at: string | null; payment_key?: string | null }> {
  const rows = await q(`select order_status, payment_status, expires_at, payment_key from public.orders where id='${orderId}';`);
  return rows[0] as { order_status: string; payment_status: string; expires_at: string | null; payment_key?: string | null };
}
