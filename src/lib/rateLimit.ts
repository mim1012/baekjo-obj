// 공개·저빈도 쓰기 엔드포인트용 공용 인메모리 레이트리밋 팩토리.
//
// orders/rateLimit.ts, insurance/uploadRateLimit.ts가 같은 로직(Map + 슬라이딩 창 + 주기적 prune)을
// 각자 복사해 갖고 있다 — 신규 적용분은 이 팩토리 하나로 모은다. 기존 둘은 결제·업로드 경로라
// 이번 보안 묶음에서 건드리지 않고 남겨둔다(추후 통합 후보).
//
// ⚠️ 서버리스 다중 인스턴스에선 인스턴스별 카운터라 전역 정밀 제한이 아니다. 목적은 정밀 제어가
// 아니라 봇이 폼을 루프로 긁어 DB를 오염시키고 관리자 알림 메일을 폭주시키는 걸 늦추는 '댐핑'이다 —
// 정밀·영구 제한은 상위 계층(Vercel Firewall·WAF)에서 해야 한다.
import { NextResponse } from 'next/server';

export interface RateLimiter {
  /** true = 한도 이내(처리 허용), false = 한도 초과. now 주입 가능(순수 함수 테스트). */
  check(key: string, now?: number): boolean;
}

// 호출 N회마다 한 번만 만료 엔트리를 스윕한다 — 매 호출 훑기는 낭비, 안 훑으면 Map이 무한 증가한다.
const PRUNE_INTERVAL_HITS = 200;

export function createRateLimiter(windowMs: number, max: number): RateLimiter {
  const hits = new Map<string, { count: number; windowStart: number }>();
  let hitsSincePrune = 0;

  return {
    check(key: string, now: number = Date.now()): boolean {
      hitsSincePrune += 1;
      if (hitsSincePrune >= PRUNE_INTERVAL_HITS) {
        hitsSincePrune = 0;
        for (const [entryKey, entry] of hits) {
          if (now - entry.windowStart > windowMs) hits.delete(entryKey);
        }
      }

      const entry = hits.get(key);
      if (!entry || now - entry.windowStart > windowMs) {
        hits.set(key, { count: 1, windowStart: now });
        return true;
      }
      entry.count += 1;
      return entry.count <= max;
    },
  };
}

/**
 * 클라이언트 IP 기반 키 — x-forwarded-for 첫 홉 우선, 없으면 x-real-ip, 둘 다 없으면 'unknown' 버킷.
 * ⚠️ 첫 홉을 신뢰하는 근거는 배포 환경 가정이다: Vercel은 x-forwarded-for를 플랫폼 엣지에서
 * 덮어써(vercel.com/docs/headers/request-headers) 외부에서 위조해 붙인 값을 제거하므로 첫 홉이
 * 실제 클라이언트 IP다. 비-Vercel(직접 노출된 Node 등) 환경에선 이 가정이 깨진다
 * — orders/rateLimit.ts의 orderRateLimitKey와 동일한 전제.
 */
export function clientIpKey(request: { headers: Headers }): string {
  const firstHop = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (firstHop) return `ip:${firstHop}`;
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return `ip:${realIp}`;
  return 'unknown';
}

/** 한도 초과 응답 — 본문은 라우트별 세부를 노출하지 않는 공통 형태로 통일한다. */
export function tooManyRequests(): NextResponse {
  return NextResponse.json({ error: 'too-many-requests' }, { status: 429 });
}
