import type { NextRequest } from 'next/server';

// 증권 업로드 남용 완화용 베스트에포트 인메모리 레이트리밋 — orders/rateLimit.ts와 동일 패턴
// (Map + 슬라이딩 창). 게스트 허용 엔드포인트라 상한이 필수. ⚠️ 서버리스 다중 인스턴스에선
// 인스턴스별 카운터라 전역 정밀 제한이 아니다 — 목적은 익명 루프의 업로드 남용을 늦추는 댐핑이다.
export const INSURANCE_UPLOAD_RATE_LIMIT_WINDOW_MS = 60_000;
// 보수적으로 분당 5건 — 정상 신청 흐름(증권 1~2장)을 막지 않으면서 반복 업로드만 저지한다.
export const INSURANCE_UPLOAD_RATE_LIMIT_MAX = 5;

const rateLimitHits = new Map<string, { count: number; windowStart: number }>();

// 만료 엔트리 정리(prune) — orders/rateLimit.ts와 동일 선례. 매 호출마다 훑으면 낭비이므로
// 호출 N회마다 한 번만 스윕한다.
const PRUNE_INTERVAL_HITS = 200;
let hitsSincePrune = 0;

function pruneExpiredEntries(now: number): void {
  for (const [key, entry] of rateLimitHits) {
    if (now - entry.windowStart > INSURANCE_UPLOAD_RATE_LIMIT_WINDOW_MS) {
      rateLimitHits.delete(key);
    }
  }
}

/** true = 한도 이내(처리 허용), false = 한도 초과. now 주입 가능(순수 함수 테스트). */
export function checkInsuranceUploadRateLimit(key: string, now: number = Date.now()): boolean {
  hitsSincePrune += 1;
  if (hitsSincePrune >= PRUNE_INTERVAL_HITS) {
    hitsSincePrune = 0;
    pruneExpiredEntries(now);
  }

  const entry = rateLimitHits.get(key);
  if (!entry || now - entry.windowStart > INSURANCE_UPLOAD_RATE_LIMIT_WINDOW_MS) {
    rateLimitHits.set(key, { count: 1, windowStart: now });
    return true;
  }
  entry.count += 1;
  return entry.count <= INSURANCE_UPLOAD_RATE_LIMIT_MAX;
}

/**
 * 레이트리밋 키 — 클라이언트 IP(x-forwarded-for 첫 홉 또는 x-real-ip) 우선, 없으면 공용
 * 'unknown' 버킷(orders/rateLimit.ts의 orderRateLimitKey와 동일한 Vercel 첫 홉 신뢰 가정).
 */
export function insuranceUploadRateLimitKey(request: NextRequest): string {
  const firstHop = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (firstHop) return `ip:${firstHop}`;
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return `ip:${realIp}`;
  return 'unknown';
}
