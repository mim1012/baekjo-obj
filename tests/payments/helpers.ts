// 결제 상태기계 DB/라우트 스펙 공용 헬퍼 — staging Supabase Management API 질의.
// ⚠️ SUPABASE_URL은 반드시 staging 프로젝트 ref여야 한다. prod에 __test_* 합성 레코드가 심기면 안 된다.

export function supabaseEnvReady(): boolean {
  return !!process.env.SUPABASE_URL && !!process.env.SUPABASE_ACCESS_TOKEN;
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
