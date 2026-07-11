// site_settings 테이블 접근 계층. 이 파일 밖에서는 Supabase를 직접 호출하지 않는다.
// 홈 CMS(HomeSettings)를 한 행(id='home')에 jsonb 로 통째로 저장/조회한다(싱글턴).
import { getSupabase } from '@/lib/supabase/server';
import type { HomeSettings } from '@/data/homeContent';

const SETTINGS_ROW_ID = 'home';

/**
 * 저장된 홈 설정을 반환한다. 행이 없으면 null(→ 라우트가 defaultHomeSettings 로 폴백).
 * value jsonb 는 저장 시점의 HomeSettings 모양 그대로이므로 그대로 캐스팅해 돌려준다.
 */
export async function getSiteSettings(): Promise<HomeSettings | null> {
  const { data, error } = await getSupabase()
    .from('site_settings')
    .select('value')
    .eq('id', SETTINGS_ROW_ID)
    .maybeSingle();
  if (error) throw error;
  return data ? (data.value as HomeSettings) : null;
}

/** 홈 설정을 통째로 upsert(id='home') 한다. 없으면 생성, 있으면 덮어쓴다. */
export async function saveSiteSettings(value: HomeSettings): Promise<void> {
  const { error } = await getSupabase()
    .from('site_settings')
    .upsert({ id: SETTINGS_ROW_ID, value, updated_at: new Date().toISOString() });
  if (error) throw error;
}
