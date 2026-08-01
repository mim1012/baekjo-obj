import type { NextRequest } from 'next/server';

export type AuthRateLimitAction = 'login' | 'signup' | 'password-reset';

const WINDOWS: Record<AuthRateLimitAction, { windowMs: number; maxHits: number }> = {
  login: { windowMs: 15 * 60_000, maxHits: 10 },
  signup: { windowMs: 60 * 60_000, maxHits: 30 },
  'password-reset': { windowMs: 60 * 60_000, maxHits: 20 },
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
