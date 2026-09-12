import { getSupabase } from '@/lib/supabase/server';
import type { CustomerServiceRequest, CustomerServiceRequestStatus, CustomerServiceRequestType } from '@/types';

interface RequestRow {
  id: string;
  order_id: string;
  member_id: string;
  seller_key: string;
  request_type: CustomerServiceRequestType;
  reason: string;
  status: CustomerServiceRequestStatus;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
}

const COLUMNS = 'id, order_id, member_id, seller_key, request_type, reason, status, admin_note, created_at, updated_at';

function toModel(row: RequestRow): CustomerServiceRequest {
  return {
    id: row.id,
    orderId: row.order_id,
    memberId: row.member_id,
    sellerKey: row.seller_key,
    type: row.request_type,
    reason: row.reason,
    status: row.status,
    adminNote: row.admin_note ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listCustomerServiceRequestsByMember(memberId: string): Promise<CustomerServiceRequest[]> {
  const { data, error } = await getSupabase().from('customer_service_requests').select(COLUMNS).eq('member_id', memberId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data as RequestRow[]).map(toModel);
}

export async function listAllCustomerServiceRequests(): Promise<CustomerServiceRequest[]> {
  const { data, error } = await getSupabase().from('customer_service_requests').select(COLUMNS).order('created_at', { ascending: false }).limit(2000);
  if (error) throw error;
  const rows = data as RequestRow[];
  const orderIds = [...new Set(rows.map((row) => row.order_id))];
  if (orderIds.length === 0) return [];
  const { data: orderData, error: orderError } = await getSupabase()
    .from('orders').select('id, seller_groups').in('id', orderIds);
  if (orderError) throw orderError;
  const sellerNameByKey = new Map<string, string>();
  for (const order of (orderData ?? []) as Array<{ id: string; seller_groups: unknown }>) {
    if (!Array.isArray(order.seller_groups)) continue;
    for (const value of order.seller_groups) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
      const group = value as Record<string, unknown>;
      const seller = group.seller;
      if (typeof group.key !== 'string' || !seller || typeof seller !== 'object' || Array.isArray(seller)) continue;
      const sellerValue = seller as Record<string, unknown>;
      const name = typeof sellerValue.legalName === 'string'
        ? sellerValue.legalName
        : typeof sellerValue.displayName === 'string' ? sellerValue.displayName : null;
      if (name) sellerNameByKey.set(`${order.id}:${group.key}`, name);
    }
  }
  return rows.map((row) => ({
    ...toModel(row),
    sellerName: sellerNameByKey.get(`${row.order_id}:${row.seller_key}`),
  }));
}

export async function getCustomerServiceRequestById(id: string): Promise<CustomerServiceRequest | null> {
  const { data, error } = await getSupabase().from('customer_service_requests')
    .select(COLUMNS).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? toModel(data as RequestRow) : null;
}

export async function insertCustomerServiceRequest(input: {
  orderId: string;
  memberId: string;
  sellerKey: string;
  type: CustomerServiceRequestType;
  reason: string;
}): Promise<CustomerServiceRequest> {
  const { data, error } = await getSupabase().from('customer_service_requests').insert({
    order_id: input.orderId,
    member_id: input.memberId,
    seller_key: input.sellerKey,
    request_type: input.type,
    reason: input.reason,
  }).select(COLUMNS).single();
  if (error) throw error;
  return toModel(data as RequestRow);
}

export async function updateCustomerServiceRequest(id: string, patch: { status: CustomerServiceRequestStatus; adminNote?: string }): Promise<CustomerServiceRequest | null> {
  const { data, error } = await getSupabase().from('customer_service_requests').update({
    status: patch.status,
    admin_note: patch.adminNote ?? null,
    updated_at: new Date().toISOString(),
  }).eq('id', id).select(COLUMNS).maybeSingle();
  if (error) throw error;
  return data ? toModel(data as RequestRow) : null;
}
