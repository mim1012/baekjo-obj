// survey_config 테이블 접근 계층. 이 파일 밖에서는 Supabase를 직접 호출하지 않는다.
// 진단 설문 config({ questions, rules })를 한 행(id='default')에 jsonb 로 통째로 저장/조회한다(싱글턴).
import { getSupabase } from '@/lib/supabase/server';
import type { SurveyConfig } from '@/lib/survey/config';

const CONFIG_ROW_ID = 'default';

/**
 * 저장된 설문 config 를 반환한다. 행이 없으면 null(→ 라우트가 defaultSurveyConfig 로 폴백).
 * value jsonb 는 저장 시점의 SurveyConfig 모양 그대로이므로 그대로 캐스팅해 돌려준다.
 */
export async function getSurveyConfig(): Promise<SurveyConfig | null> {
  const { data, error } = await getSupabase()
    .from('survey_config')
    .select('value')
    .eq('id', CONFIG_ROW_ID)
    .maybeSingle();
  if (error) throw error;
  return data ? (data.value as SurveyConfig) : null;
}

/** 설문 config 를 통째로 upsert(id='default') 한다. 없으면 생성, 있으면 덮어쓴다. */
export async function saveSurveyConfig(value: SurveyConfig): Promise<void> {
  const { error } = await getSupabase()
    .from('survey_config')
    .upsert({ id: CONFIG_ROW_ID, value, updated_at: new Date().toISOString() });
  if (error) throw error;
}
