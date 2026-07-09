// 서버 전용 Supabase 클라이언트 — secret key를 들고 있으므로 클라이언트 번들에 절대 섞이면 안 된다.
// 'server-only'를 import하면 클라이언트 컴포넌트에서 이 파일을 불러오는 순간 빌드가 실패한다
// (컴파일타임 가드). 런타임 가드(window 체크)는 실행 시점 안전망으로 그대로 남겨둔다.
import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;

/** 서버 컨텍스트에서만 호출 가능한 Supabase 클라이언트를 지연 생성해 반환한다. */
export function getSupabase(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('getSupabase()는 서버에서만 호출할 수 있습니다.');
  }
  if (cachedClient) return cachedClient;

  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new Error('SUPABASE_URL / SUPABASE_SECRET_KEY 환경변수가 설정되지 않았습니다.');
  }

  cachedClient = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}
