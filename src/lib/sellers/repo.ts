import { getSupabase } from '@/lib/supabase/server';
import type { Seller } from '@/types';
import type { SellerPatchInput, SellerWriteInput } from '@/lib/sellers/validate';
import { isSellerLegallyComplete } from '@/lib/sellers/validate';

export interface SellerRow {
  id: string;
  display_name: string;
  legal_name: string;
  representative_name: string;
  business_registration_number: string;
  mail_order_registration_number: string;
  business_address: string;
  phone: string;
  email: string | null;
  return_address: string | null;
  shipping_fee: number;
  free_shipping_threshold: number | null;
  dispatch_estimate: string;
  return_policy: string;
  status: Seller['status'];
  created_at: string;
  updated_at: string;
}

export const SELLER_SELECT_COLUMNS =
  'id, display_name, legal_name, representative_name, business_registration_number, mail_order_registration_number, business_address, phone, email, return_address, shipping_fee, free_shipping_threshold, dispatch_estimate, return_policy, status, created_at, updated_at';

export function sellerRowToModel(row: SellerRow): Seller {
  return {
    id: row.id,
    displayName: row.display_name,
    legalName: row.legal_name,
    representativeName: row.representative_name,
    businessRegistrationNumber: row.business_registration_number,
    mailOrderRegistrationNumber: row.mail_order_registration_number,
    businessAddress: row.business_address,
    phone: row.phone,
    email: row.email ?? undefined,
    returnAddress: row.return_address ?? undefined,
    shippingFee: row.shipping_fee,
    freeShippingThreshold: row.free_shipping_threshold ?? undefined,
    dispatchEstimate: row.dispatch_estimate,
    returnPolicy: row.return_policy,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(input: SellerPatchInput): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (input.displayName !== undefined) row.display_name = input.displayName;
  if (input.legalName !== undefined) row.legal_name = input.legalName;
  if (input.representativeName !== undefined) row.representative_name = input.representativeName;
  if (input.businessRegistrationNumber !== undefined) row.business_registration_number = input.businessRegistrationNumber;
  if (input.mailOrderRegistrationNumber !== undefined) row.mail_order_registration_number = input.mailOrderRegistrationNumber;
  if (input.businessAddress !== undefined) row.business_address = input.businessAddress;
  if (input.phone !== undefined) row.phone = input.phone;
  if (input.email !== undefined) row.email = input.email || null;
  if (input.returnAddress !== undefined) row.return_address = input.returnAddress || null;
  if (input.shippingFee !== undefined) row.shipping_fee = input.shippingFee;
  if ('freeShippingThreshold' in input) row.free_shipping_threshold = input.freeShippingThreshold ?? null;
  if (input.dispatchEstimate !== undefined) row.dispatch_estimate = input.dispatchEstimate;
  if (input.returnPolicy !== undefined) row.return_policy = input.returnPolicy;
  if (input.status !== undefined) row.status = input.status;
  return row;
}

export async function listSellers(): Promise<Seller[]> {
  const { data, error } = await getSupabase()
    .from('sellers')
    .select(SELLER_SELECT_COLUMNS)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as SellerRow[]).map(sellerRowToModel);
}

/** 고객 화면에는 검증 완료 상태이면서 법정·배송 필수정보가 모두 있는 판매자만 공개한다. */
export async function listVerifiedSellers(): Promise<Seller[]> {
  const { data, error } = await getSupabase()
    .from('sellers')
    .select(SELLER_SELECT_COLUMNS)
    .eq('status', 'verified')
    .order('display_name', { ascending: true });
  if (error) throw error;
  return (data as SellerRow[]).map(sellerRowToModel).filter(isSellerLegallyComplete);
}

export async function getVerifiedSellerById(id: string): Promise<Seller | null> {
  const { data, error } = await getSupabase()
    .from('sellers')
    .select(SELLER_SELECT_COLUMNS)
    .eq('id', id)
    .eq('status', 'verified')
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const seller = sellerRowToModel(data as SellerRow);
  return isSellerLegallyComplete(seller) ? seller : null;
}

export async function listVerifiedSellersByIds(ids: string[]): Promise<Seller[]> {
  if (ids.length === 0) return [];
  const { data, error } = await getSupabase()
    .from('sellers')
    .select(SELLER_SELECT_COLUMNS)
    .in('id', [...new Set(ids)])
    .eq('status', 'verified');
  if (error) throw error;
  return (data as SellerRow[]).map(sellerRowToModel).filter(isSellerLegallyComplete);
}

export async function getSellerById(id: string): Promise<Seller | null> {
  const { data, error } = await getSupabase()
    .from('sellers')
    .select(SELLER_SELECT_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? sellerRowToModel(data as SellerRow) : null;
}

export async function insertSeller(input: SellerWriteInput): Promise<Seller> {
  const { data, error } = await getSupabase()
    .from('sellers')
    .insert(toRow(input))
    .select(SELLER_SELECT_COLUMNS)
    .single();
  if (error) throw error;
  return sellerRowToModel(data as SellerRow);
}

export async function updateSeller(id: string, patch: SellerPatchInput): Promise<Seller | null> {
  const existing = await getSellerById(id);
  if (!existing) return null;
  const merged = { ...existing, ...patch };
  if (merged.status === 'verified' && !isSellerLegallyComplete(merged)) {
    throw new Error('seller-incomplete');
  }
  const { data, error } = await getSupabase()
    .from('sellers')
    .update({ ...toRow(patch), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(SELLER_SELECT_COLUMNS)
    .maybeSingle();
  if (error) throw error;
  return data ? sellerRowToModel(data as SellerRow) : null;
}

export async function deleteSeller(id: string): Promise<boolean> {
  const { data, error } = await getSupabase().from('sellers').delete().eq('id', id).select('id');
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}
