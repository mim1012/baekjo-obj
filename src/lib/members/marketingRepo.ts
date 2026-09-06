import { getSupabase } from '@/lib/supabase/server';
import type { MarketingPreferences } from '@/types';

export const MARKETING_POLICY_VERSION = 'marketing-2026-09-06';

interface MarketingRow {
  email_enabled: boolean;
  sms_enabled: boolean;
  policy_version: string;
  updated_at: string;
}
function toModel(row: MarketingRow): MarketingPreferences {
  return { email: row.email_enabled, sms: row.sms_enabled, policyVersion: row.policy_version, updatedAt: row.updated_at };
}

export async function getMarketingPreferences(memberId: string): Promise<MarketingPreferences> {
  const { data, error } = await getSupabase().from('member_marketing_preferences')
    .select('email_enabled, sms_enabled, policy_version, updated_at').eq('member_id', memberId).maybeSingle();
  if (error) throw error;
  return data ? toModel(data as MarketingRow) : { email: false, sms: false, policyVersion: MARKETING_POLICY_VERSION };
}

export async function setMarketingPreferences(memberId: string, email: boolean, sms: boolean): Promise<MarketingPreferences> {
  const { data, error } = await getSupabase().rpc('set_member_marketing_preferences', {
    p_member_id: memberId,
    p_email_enabled: email,
    p_sms_enabled: sms,
    p_policy_version: MARKETING_POLICY_VERSION,
  });
  if (error) throw new Error(error.message);
  return toModel(data as MarketingRow);
}
