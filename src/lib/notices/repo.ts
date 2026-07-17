// notices_config 테이블 접근 계층. 이 파일 밖에서는 Supabase를 직접 호출하지 않는다.
// 공지 config({ items })를 한 행(id='default')에 jsonb 로 통째로 저장/조회한다(싱글턴).
import { getSupabase } from '@/lib/supabase/server';
import { defaultNoticesConfig, type NoticesConfig } from '@/lib/notices/config';
import { logServerError } from '@/lib/logServerError';

const CONFIG_ROW_ID = 'default';

/**
 * value jsonb 가 저장 시점의 NoticesConfig 모양({ items: [...] }, 1건 이상)인지 검사한다.
 * 0042 마이그레이션의 value default 가 '{}' 라 빈 객체 행이 존재할 수 있고, 수동 조작된 행이
 * malformed 일 수도 있다 — 무검증 캐스팅하면 request-time throw/렌더 깨짐으로 이어지므로
 * 모양이 아니면 null(→ default 폴백) 처리한다.
 */
function isNoticesConfigShape(value: unknown): value is NoticesConfig {
  if (typeof value !== 'object' || value === null) return false;
  const items = (value as { items?: unknown }).items;
  return Array.isArray(items) && items.length > 0;
}

/**
 * 저장된 공지 config 를 반환한다. 행이 없거나 value 가 config 모양이 아니면
 * null(→ 호출부가 defaultNoticesConfig 로 폴백).
 */
export async function getNoticesConfig(): Promise<NoticesConfig | null> {
  const { data, error } = await getSupabase()
    .from('notices_config')
    .select('value')
    .eq('id', CONFIG_ROW_ID)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if (!isNoticesConfigShape(data.value)) {
    logServerError('[notices/repo] value 가 NoticesConfig 모양이 아님 — null(default 폴백) 처리', 'malformed notices_config.value');
    return null;
  }
  return data.value;
}

/**
 * 공개 서버 페이지(/notices·/notices/[id]·홈 wrapper)용 폴백 조회.
 * 미저장·조회 실패를 defaultNoticesConfig 로 접어 공개 화면이 절대 빈 목록으로 깨지지 않게 한다
 * (concerns 공개 GET 과 동일 계약 — 실패는 로그로만 드러낸다).
 */
export async function getNoticesConfigWithFallback(): Promise<NoticesConfig> {
  try {
    return (await getNoticesConfig()) ?? defaultNoticesConfig;
  } catch (error) {
    logServerError('[notices/repo] 조회 실패 — defaultNoticesConfig 로 폴백', error);
    return defaultNoticesConfig;
  }
}

/** 공지 config 를 통째로 upsert(id='default') 한다. 없으면 생성, 있으면 덮어쓴다. */
export async function saveNoticesConfig(value: NoticesConfig): Promise<void> {
  const { error } = await getSupabase()
    .from('notices_config')
    .upsert({ id: CONFIG_ROW_ID, value, updated_at: new Date().toISOString() });
  if (error) throw error;
}
