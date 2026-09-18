import { getSupabase } from '@/lib/supabase/server';
import {
  normalizePageTextSettings,
  type PageTextSettings,
} from '@/data/pageTextContent';

const PAGE_TEXTS_ROW_ID = 'page-texts';

/** site_settings의 별도 행에 공개 페이지 문구를 통째로 저장한다. 홈 CMS 행과 분리해 회귀를 막는다. */
export async function getPageTextSettings(): Promise<PageTextSettings | null> {
  const { data, error } = await getSupabase()
    .from('site_settings')
    .select('value')
    .eq('id', PAGE_TEXTS_ROW_ID)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizePageTextSettings(data.value) : null;
}

export async function savePageTextSettings(value: PageTextSettings): Promise<void> {
  const { error } = await getSupabase()
    .from('site_settings')
    .upsert({ id: PAGE_TEXTS_ROW_ID, value, updated_at: new Date().toISOString() });
  if (error) throw error;
}
