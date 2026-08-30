import { getSupabase } from '@/lib/supabase/server';
import type { MemberAddress } from '@/types';

interface MemberAddressRow {
  id: string;
  label: string;
  recipient_name: string;
  phone: string;
  postal_code: string;
  address_line1: string;
  address_line2: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface MemberAddressInput {
  label: string;
  recipientName: string;
  phone: string;
  postalCode: string;
  addressLine1: string;
  addressLine2?: string;
  isDefault?: boolean;
}

export interface MemberAddressPatch {
  label?: string;
  recipientName?: string;
  phone?: string;
  postalCode?: string;
  addressLine1?: string;
  addressLine2?: string;
  isDefault?: boolean;
}

const SELECT_COLUMNS =
  'id, label, recipient_name, phone, postal_code, address_line1, address_line2, is_default, created_at, updated_at';

function rowToAddress(row: MemberAddressRow): MemberAddress {
  return {
    id: row.id,
    label: row.label,
    recipientName: row.recipient_name,
    phone: row.phone,
    postalCode: row.postal_code,
    addressLine1: row.address_line1,
    addressLine2: row.address_line2 || undefined,
    isDefault: row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listMemberAddresses(memberId: string): Promise<MemberAddress[]> {
  const { data, error } = await getSupabase()
    .from('member_addresses')
    .select(SELECT_COLUMNS)
    .eq('member_id', memberId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as MemberAddressRow[]).map(rowToAddress);
}

export async function createMemberAddress(
  memberId: string,
  input: MemberAddressInput,
): Promise<MemberAddress> {
  const { data, error } = await getSupabase()
    .from('member_addresses')
    .insert({
      member_id: memberId,
      label: input.label,
      recipient_name: input.recipientName,
      phone: input.phone,
      postal_code: input.postalCode,
      address_line1: input.addressLine1,
      address_line2: input.addressLine2 ?? '',
      is_default: false,
    })
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw error;

  const address = rowToAddress(data as MemberAddressRow);
  if (!input.isDefault) return address;
  const isDefault = await setMemberDefaultAddress(memberId, address.id);
  if (!isDefault) throw new Error('address-default-update-failed');
  return { ...address, isDefault: true };
}

export async function updateMemberAddress(
  memberId: string,
  addressId: string,
  patch: MemberAddressPatch,
): Promise<MemberAddress | null> {
  const columns: Record<string, unknown> = {};
  if (patch.label !== undefined) columns.label = patch.label;
  if (patch.recipientName !== undefined) columns.recipient_name = patch.recipientName;
  if (patch.phone !== undefined) columns.phone = patch.phone;
  if (patch.postalCode !== undefined) columns.postal_code = patch.postalCode;
  if (patch.addressLine1 !== undefined) columns.address_line1 = patch.addressLine1;
  if (patch.addressLine2 !== undefined) columns.address_line2 = patch.addressLine2;

  let address: MemberAddress | null = null;
  if (Object.keys(columns).length > 0) {
    const { data, error } = await getSupabase()
      .from('member_addresses')
      .update({ ...columns, updated_at: new Date().toISOString() })
      .eq('id', addressId)
      .eq('member_id', memberId)
      .select(SELECT_COLUMNS)
      .maybeSingle();
    if (error) throw error;
    address = data ? rowToAddress(data as MemberAddressRow) : null;
  } else {
    const { data, error } = await getSupabase()
      .from('member_addresses')
      .select(SELECT_COLUMNS)
      .eq('id', addressId)
      .eq('member_id', memberId)
      .maybeSingle();
    if (error) throw error;
    address = data ? rowToAddress(data as MemberAddressRow) : null;
  }
  if (!address) return null;
  if (patch.isDefault === true) {
    const isDefault = await setMemberDefaultAddress(memberId, addressId);
    if (!isDefault) return null;
    return { ...address, isDefault: true };
  }
  return address;
}

export async function setMemberDefaultAddress(memberId: string, addressId: string): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('set_member_default_address', {
    p_member_id: memberId,
    p_address_id: addressId,
  });
  if (error) throw error;
  return data === true;
}

export async function deleteMemberAddress(memberId: string, addressId: string): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('delete_member_address', {
    p_member_id: memberId,
    p_address_id: addressId,
  });
  if (error) throw error;
  return data === true;
}
