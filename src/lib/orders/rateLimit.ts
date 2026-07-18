import type { NextRequest } from 'next/server';

// 주문 생성 남용 완화용 베스트에포트 인메모리 레이트리밋 — payments/cancel 라우트와 동일 패턴
// (Map + 슬라이딩 창). ⚠️ 서버리스 다중 인스턴스에선 인스턴스별 카운터라 전역 정밀 제한이 아니다.
// 목적은 정밀 제어가 아니라 익명 루프가 재고를 순식간에 고갈시키는 걸 늦추는 '댐핑'이다 —
// 정밀·영구 제한은 상위 계층(WAF·API 게이트웨이)에서 해야 한다.
export const ORDER_RATE_LIMIT_WINDOW_MS = 60_000;
// 보수적으로 분당 5건 — 정상 게스트 결제 흐름을 막지 않으면서 루프성 남용만 저지한다.
export const ORDER_RATE_LIMIT_MAX = 5;

const rateLimitHits = new Map<string, { count: number; windowStart: number }>();

// 만료 엔트리 정리(prune) — payments/status 라우트와 동일 선례. 이 Map은 컨테이너가 살아있는
// 동안 서로 다른 키(정상 트래픽의 다양한 IP)가 계속 유입되면 무한정 증가한다. 매 호출마다 훑으면
// 낭비이므로 호출 N회마다 한 번만 스윕한다.
const PRUNE_INTERVAL_HITS = 200;
let hitsSincePrune = 0;

function pruneExpiredEntries(now: number): void {
  for (const [key, entry] of rateLimitHits) {
    if (now - entry.windowStart > ORDER_RATE_LIMIT_WINDOW_MS) {
      rateLimitHits.delete(key);
    }
  }
}

/** true = 한도 이내(처리 허용), false = 한도 초과. now 주입 가능(순수 함수 테스트). */
export function checkOrderRateLimit(key: string, now: number = Date.now()): boolean {
  hitsSincePrune += 1;
  if (hitsSincePrune >= PRUNE_INTERVAL_HITS) {
    hitsSincePrune = 0;
    pruneExpiredEntries(now);
  }

  const entry = rateLimitHits.get(key);
  if (!entry || now - entry.windowStart > ORDER_RATE_LIMIT_WINDOW_MS) {
    rateLimitHits.set(key, { count: 1, windowStart: now });
    return true;
  }
  entry.count += 1;
  return entry.count <= ORDER_RATE_LIMIT_MAX;
}

/**
 * 레이트리밋 키 — 클라이언트 IP(x-forwarded-for 첫 홉 또는 x-real-ip) 우선, 없으면 phone 폴백,
 * 둘 다 없으면 공용 'unknown' 버킷.
 * ⚠️ 첫 홉을 신뢰하는 근거는 배포 환경 가정이다: Vercel 은 x-forwarded-for 를 플랫폼 엣지에서
 * 덮어써(vercel.com/docs/headers/request-headers) 외부에서 위조해 붙인 값을 제거하므로 첫 홉이
 * 실제 클라이언트 IP 다. 비-Vercel(직접 노출된 Node 등) 환경에선 이 가정이 깨진다 — 그땐
 * 클라이언트가 x-forwarded-for 를 임의로 넣어 키를 회전시킬 수 있어 IP 키가 무력화되니, 신뢰
 * 경계(리버스 프록시)에서 헤더를 정규화해야 한다.
 */
export function orderRateLimitKey(request: NextRequest, phone?: string): string {
  const firstHop = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (firstHop) return `ip:${firstHop}`;
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return `ip:${realIp}`;
  if (phone) return `phone:${phone}`;
  return 'unknown';
}
