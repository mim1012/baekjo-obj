import type { NextRequest } from 'next/server';

export type AuthRateLimitAction =
  | 'login'
  | 'signup'
  | 'password-reset'
  | 'email-check'
  | 'business-signup'
  | 'business-upload';

const WINDOWS: Record<AuthRateLimitAction, { windowMs: number; maxHits: number }> = {
  login: { windowMs: 15 * 60_000, maxHits: 10 },
  signup: { windowMs: 60 * 60_000, maxHits: 30 },
  'password-reset': { windowMs: 60 * 60_000, maxHits: 20 },
  // 이메일 중복 선체크는 사용자가 입력을 고치며 여러 번 치므로 넉넉하게 잡는다.
  'email-check': { windowMs: 60 * 60_000, maxHits: 60 },
  // 사업자 가입은 일반 가입과 동일한 창에서 조금 더 보수적으로 잡는다(승인 대기 row가 쌓이는 비용).
  'business-signup': { windowMs: 60 * 60_000, maxHits: 20 },
  // 업로드는 스토리지 쓰기 비용이 크므로 훨씬 낮게 — 가입 1건당 첨부서류 여러 개를 감안한 값.
  'business-upload': { windowMs: 60 * 60_000, maxHits: 15 },
};

const hits = new Map<string, { count: number; windowStart: number }>();
const PRUNE_INTERVAL_HITS = 200;
let hitsSincePrune = 0;

function pruneExpiredEntries(now: number): void {
  for (const [key, entry] of hits) {
    if (now - entry.windowStart > WINDOWS[key.split(':', 1)[0] as AuthRateLimitAction].windowMs) {
      hits.delete(key);
    }
  }
}

function keyFor(action: AuthRateLimitAction, key: string): string {
  return `${action}:${key}`;
}

export function checkAuthRateLimit(
  action: AuthRateLimitAction,
  key: string,
  now: number = Date.now(),
): boolean {
  const config = WINDOWS[action];
  hitsSincePrune += 1;
  if (hitsSincePrune >= PRUNE_INTERVAL_HITS) {
    hitsSincePrune = 0;
    pruneExpiredEntries(now);
  }
  const mapKey = keyFor(action, key);
  const entry = hits.get(mapKey);

  if (!entry || now - entry.windowStart >= config.windowMs) {
    hits.set(mapKey, { count: 1, windowStart: now });
    return true;
  }

  entry.count += 1;
  return entry.count <= config.maxHits;
}

export function resetAuthRateLimit(action: AuthRateLimitAction, key: string): void {
  hits.delete(keyFor(action, key));
}

export function requestRateLimitKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (forwarded) return `ip:${forwarded}`;
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return `ip:${realIp}`;
  return 'unknown';
}
