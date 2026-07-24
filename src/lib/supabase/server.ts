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
    // 🚨 no-store 필수 (2026-07-23 desync 실버그의 서버측 근본 대책 — memory
    // wishlist-desync-repro-2026-07-23). Next 16은 "Request-time API(cookies 등) 이전에
    // 도달 가능한 fetch를 기본 캐시"한다(docs/01-app/02-guides/caching-without-cache-components.md:111).
    // supabase-js의 REST 호출은 전역 fetch를 쓰므로 코드 경로에 따라 DB 읽기가 데이터 캐시에
    // 고정될 수 있다 — 실측: 찜 해제/송장 등록 직후 회원측 GET이 배포 수명 동안 낡은 값 반환.
    // 모든 DB 호출을 이 한 지점에서 no-store로 강제해 어떤 라우트/호출 순서에서도 재발을 막는다.
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
    },
  });
  return cachedClient;
}
