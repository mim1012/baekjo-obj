// qna_config 테이블 접근 계층. 이 파일 밖에서는 Supabase를 직접 호출하지 않는다.
// Q&A config({ items })를 한 행(id='default')에 jsonb 로 통째로 저장/조회한다(싱글턴).
import { getSupabase } from '@/lib/supabase/server';
import type { QnaConfig } from '@/lib/qna/config';

const CONFIG_ROW_ID = 'default';

/**
 * 저장된 Q&A config 를 반환한다. 행이 없으면 null(→ 라우트가 defaultQnaConfig 로 폴백).
 * value jsonb 는 저장 시점의 QnaConfig 모양 그대로이므로 그대로 캐스팅해 돌려준다.
 */
export async function getQnaConfig(): Promise<QnaConfig | null> {
  const { data, error } = await getSupabase()
    .from('qna_config')
    .select('value')
    .eq('id', CONFIG_ROW_ID)
    .maybeSingle();
  if (error) throw error;
  return data ? (data.value as QnaConfig) : null;
}

/** Q&A config 를 통째로 upsert(id='default') 한다. 없으면 생성, 있으면 덮어쓴다. */
export async function saveQnaConfig(value: QnaConfig): Promise<void> {
  const { error } = await getSupabase()
    .from('qna_config')
    .upsert({ id: CONFIG_ROW_ID, value, updated_at: new Date().toISOString() });
  if (error) throw error;
}
