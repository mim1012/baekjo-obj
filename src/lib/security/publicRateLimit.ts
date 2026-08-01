import { NextResponse } from 'next/server';

export interface PublicRateLimiter {
  check(key: string, now?: number): boolean;
  reset(): void;
}

const PRUNE_INTERVAL_HITS = 200;

export function createPublicRateLimiter(windowMs: number, maxHits: number): PublicRateLimiter {
  const hits = new Map<string, { count: number; windowStart: number }>();
  let hitsSincePrune = 0;

  return {
    check(key: string, now: number = Date.now()): boolean {
      hitsSincePrune += 1;
      if (hitsSincePrune >= PRUNE_INTERVAL_HITS) {
        hitsSincePrune = 0;
        for (const [entryKey, entry] of hits) {
          if (now - entry.windowStart >= windowMs) hits.delete(entryKey);
        }
      }

      const entry = hits.get(key);
      if (!entry || now - entry.windowStart >= windowMs) {
        hits.set(key, { count: 1, windowStart: now });
        return true;
      }

      entry.count += 1;
      return entry.count <= maxHits;
    },
    reset() {
      hits.clear();
      hitsSincePrune = 0;
    },
  };
}

export function requestClientIpKey(request: { headers: Headers }): string {
  const platformIp =
    request.headers.get('x-real-ip') ??
    request.headers.get('x-vercel-forwarded-for') ??
    request.headers.get('cf-connecting-ip');
  if (platformIp?.trim()) return `ip:${platformIp.trim()}`;

  const forwardedIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (forwardedIp) return `ip:${forwardedIp}`;

  return 'unknown';
}

export function tooManyRequests() {
  return NextResponse.json(
    { error: 'too-many-requests' },
    { status: 429, headers: { 'Retry-After': '60' } },
  );
}
