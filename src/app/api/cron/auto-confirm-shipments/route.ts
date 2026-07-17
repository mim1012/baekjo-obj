import { NextResponse, type NextRequest } from 'next/server';
import { autoConfirmDeliveredBefore } from '@/lib/shipments/repo';
import { autoConfirmCutoff } from '@/lib/shipments/derive';
import { logServerError } from '@/lib/logServerError';

// 자동 구매확정 임계일수 — D-2 결정(2026-07-17): 배송완료 후 7일이 지나면 자동으로 '구매확정' 전이
// (커머스 관례). 고객이 마이페이지 버튼으로 먼저 확정하면 그 행은 delivery_status가 '구매확정'이라
// 이 크론의 WHERE(배송완료)에 안 걸려 자연 제외된다 — 수동 확정과 병행하는 안전망이다.
const AUTO_CONFIRM_DAYS = 7;

/**
 * GET /api/cron/auto-confirm-shipments — Vercel Cron 전용(1일 주기, reclaim-stock과 동일한
 * fail-closed Bearer CRON_SECRET 패턴). 배송완료된 지 AUTO_CONFIRM_DAYS(7일)가 지난 송장을
 * 한 방(set-based UPDATE)으로 '구매확정'으로 전이시킨다. per-row 루프가 없으므로 배치 크기와
 * 무관하게 단일 쿼리로 끝난다.
 *
 * ★주문 단위 파생(deriveOrderDeliveryStatus)은 건드리지 않는다 — '구매확정'은 rank 4로 '배송완료'
 * (rank 3)보다 높아, 업체별 송장이 배송완료→구매확정으로 올라가도 주문 단위 파생값('배송완료')은
 * 그대로다(some≥배송완료/every≥배송완료 판정이 구매확정을 배송완료 이상으로 접어 계산한다).
 * 그래서 여기서 orders.delivery_status를 재계산·기록할 필요가 없다.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // 미설정을 401(정상 거부)로 흡수하면 "Bearer undefined"가 통과 문자열이 돼 인증 우회로 이어진다.
    // 조용히 막지 않고 500으로 시끄럽게 실패시켜 운영자가 크론 대시보드에서 바로 알아채게 한다.
    logServerError(
      '[GET /api/cron/auto-confirm-shipments] CRON_SECRET 미설정',
      new Error('CRON_SECRET missing'),
    );
    return NextResponse.json({ error: 'misconfigured' }, { status: 500 });
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const cutoffIso = autoConfirmCutoff(now, AUTO_CONFIRM_DAYS);

  let confirmed: number;
  try {
    confirmed = await autoConfirmDeliveredBefore(cutoffIso, now.toISOString());
  } catch (error) {
    logServerError('[GET /api/cron/auto-confirm-shipments] 자동 구매확정 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }

  if (confirmed > 0) {
    logServerError(
      `[GET /api/cron/auto-confirm-shipments] 자동 구매확정 완료 confirmed=${confirmed} cutoff=${cutoffIso}`,
      {},
    );
  }

  return NextResponse.json({ ok: true, confirmed });
}
