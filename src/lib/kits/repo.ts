// kits_config 테이블 접근 계층. 이 파일 밖에서는 Supabase를 직접 호출하지 않는다.
// 케어 키트 config({ items })를 한 행(id='default')에 jsonb 로 통째로 저장/조회한다(싱글턴).
import { getSupabase } from '@/lib/supabase/server';
import type { KitsConfig } from '@/lib/kits/config';

const CONFIG_ROW_ID = 'default';

/**
 * 저장된 키트 config 를 반환한다. 행이 없으면 null(→ 라우트가 defaultKitsConfig 로 폴백).
 * value jsonb 는 저장 시점의 KitsConfig 모양 그대로이므로 그대로 캐스팅해 돌려준다.
 */
export async function getKitsConfig(): Promise<KitsConfig | null> {
  const { data, error } = await getSupabase()
    .from('kits_config')
    .select('value')
    .eq('id', CONFIG_ROW_ID)
    .maybeSingle();
  if (error) throw error;
  return data ? (data.value as KitsConfig) : null;
}

/** 키트 config 를 통째로 upsert(id='default') 한다. 없으면 생성, 있으면 덮어쓴다. */
export async function saveKitsConfig(value: KitsConfig): Promise<void> {
  const { error } = await getSupabase()
    .from('kits_config')
    .upsert({ id: CONFIG_ROW_ID, value, updated_at: new Date().toISOString() });
  if (error) throw error;
}
