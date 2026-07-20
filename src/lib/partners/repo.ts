// partners_config 테이블 접근 계층. 이 파일 밖에서는 Supabase를 직접 호출하지 않는다.
// 제휴처 config({ items })를 한 행(id='default')에 jsonb 로 통째로 저장/조회한다(싱글턴).
import { getSupabase } from '@/lib/supabase/server';
import type { PartnersConfig } from '@/lib/partners/config';
import type { Partner } from '@/types';

const CONFIG_ROW_ID = 'default';
const PARTNER_TYPES: Partner['type'][] = ['hospital', 'funeral', 'brand', 'hotel', 'etc'];

function normalizePartnerType(type: unknown): Partner['type'] {
  return typeof type === 'string' && PARTNER_TYPES.includes(type as Partner['type'])
    ? (type as Partner['type'])
    : 'etc';
}

function normalizePartnersConfig(value: PartnersConfig): PartnersConfig {
  return {
    items: value.items.map((partner) => ({
      ...partner,
      type: normalizePartnerType(partner.type),
    })),
  };
}

/**
 * 저장된 제휴처 config 를 반환한다. 행이 없으면 null(→ 라우트가 defaultPartnersConfig 로 폴백).
 * value jsonb 는 저장 시점의 PartnersConfig 모양 그대로이므로 그대로 캐스팅해 돌려준다.
 */
export async function getPartnersConfig(): Promise<PartnersConfig | null> {
  const { data, error } = await getSupabase()
    .from('partners_config')
    .select('value')
    .eq('id', CONFIG_ROW_ID)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizePartnersConfig(data.value as PartnersConfig) : null;
}

/** 제휴처 config 를 통째로 upsert(id='default') 한다. 없으면 생성, 있으면 덮어쓴다. */
export async function savePartnersConfig(value: PartnersConfig): Promise<void> {
  const { error } = await getSupabase()
    .from('partners_config')
    .upsert({ id: CONFIG_ROW_ID, value, updated_at: new Date().toISOString() });
  if (error) throw error;
}
