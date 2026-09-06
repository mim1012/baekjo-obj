import { getSupabase } from '@/lib/supabase/server';
import type { SellerAcceptance } from '@/types';

interface AcceptanceRow {
  id: string;
  order_id: string;
  seller_key: string;
  seller_id: string | null;
  status: SellerAcceptance['status'];
  note: string | null;
  updated_at: string;
}
function toModel(row: AcceptanceRow): SellerAcceptance {
  return { id: row.id, orderId: row.order_id, sellerKey: row.seller_key, sellerId: row.seller_id ?? undefined, status: row.status, note: row.note ?? undefined, updatedAt: row.updated_at };
}

export async function updateSellerAcceptance(input: { orderId: string; sellerKey: string; status: SellerAcceptance['status']; note?: string }): Promise<SellerAcceptance | null> {
  const { data, error } = await getSupabase().from('order_seller_acceptances').update({
    status: input.status,
    note: input.note ?? null,
    updated_at: new Date().toISOString(),
  }).eq('order_id', input.orderId).eq('seller_key', input.sellerKey)
    .select('id, order_id, seller_key, seller_id, status, note, updated_at').maybeSingle();
  if (error) throw error;
  return data ? toModel(data as AcceptanceRow) : null;
}
