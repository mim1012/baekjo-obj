'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { getLastOrder, getPaymentStatus } from '@/lib/storage';
import { clearCart } from '@/lib/cart';
import { formatPrice } from '@/lib/format';
import type { Order } from '@/types';

// checkout PENDING_ORDER_KEY와 동기화 — 토스 위젯 진입 시 checkout이 심어두는 미완료 결제
// 표식. 리터럴 값을 그대로 맞춰야 승인 성공 후 정리가 실제로 지워진다(계약 파일 아님 — 값만 동기화).
const PENDING_TOSS_ORDER_KEY = 'baekjo_pending_toss_order';

/** 승인 성공(status=done) 확정 후에만 호출 — 장바구니와 checkout의 미완료 결제 표식을 정리한다.
 * pending/unconfirmed/declined/expired 에서는 호출하지 않는다(재시도·복구에 필요한 상태이므로
 * 지우면 안 된다). 정리 누락 시 이후 무관한 /checkout?fail=1 방문이 stale 키를 소비해 "이미
 * 결제완료된 주문"에 cancelReservation을 호출하고 거짓으로 "결제가 취소되었습니다"라고 안내하는
 * 사고가 난다(DB는 0024의 WHERE 결제대기 조건으로 안전하지만 UX가 거짓말을 하게 된다). */
function clearPendingTossState(): void {
  clearCart();
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(PENDING_TOSS_ORDER_KEY);
  }
}

type ConfirmIssueKind = 'pending' | 'declined' | 'expired' | 'unconfirmed' | 'invalid';

/** GET /api/payments/return(R4)이 붙이는 status 쿼리값 → 화면 안내 카테고리.
 *  승인 판정 자체는 서버(DB)가 유일한 권위 — 이 값은 렌더링할 문구를 고르는 용도일 뿐이다.
 *  (누군가 status 쿼리를 위조해 열어도 DB 상태는 바뀌지 않는다.) */
function classifyStatus(status: string | null): 'done' | 'no-query' | ConfirmIssueKind {
  switch (status) {
    case 'done':
    case 'pending':
    case 'declined':
    case 'expired':
    case 'unconfirmed':
    case 'invalid':
      return status;
    case null:
      return 'no-query';
    default:
      // 예상 밖 status 값 — 조용히 성공 화면으로 흘려보내지 않고 invalid로 안내한다.
      return 'invalid';
  }
}

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; order: Order | null }
  | { status: 'done'; order: Order | null; orderId: string | null };

const ISSUE_COPY: Record<ConfirmIssueKind, { title: string; desc: string; showCheckoutLink: boolean }> = {
  pending: {
    title: '결제 확인 중입니다',
    desc: '결제 승인 처리가 진행 중입니다. 잠시 후 마이페이지에서 주문 내역을 확인해 주세요.',
    showCheckoutLink: false,
  },
  unconfirmed: {
    title: '결제 확인이 지연되고 있습니다',
    desc: '결제 확인에 다소 시간이 걸리고 있습니다. 잠시 후 마이페이지에서 주문 내역을 확인해 주세요.',
    showCheckoutLink: false,
  },
  declined: {
    title: '결제가 거절되었습니다',
    desc: '카드사 승인이 거절되었습니다. 다른 결제수단으로 다시 시도해 주세요.',
    showCheckoutLink: true,
  },
  expired: {
    title: '주문이 만료되었거나 이미 처리되었습니다',
    desc: '주문 유효 시간이 지났거나 이미 처리된 주문입니다. 다시 주문해 주세요.',
    showCheckoutLink: true,
  },
  invalid: {
    title: '결제 확인 정보가 올바르지 않습니다',
    desc: '결제 확인에 필요한 정보가 일부 누락되었습니다. 주문을 다시 진행해 주세요.',
    showCheckoutLink: true,
  },
};

function OrderDetailCard({ order }: { order: Order }) {
  return (
    <div className="mt-10 border border-[#D8D6CE] bg-[#FAF9F5]">
      <div className="flex items-center justify-between border-b border-[#D8D6CE] px-6 py-4">
        <span className="text-xs text-[#7B827C]">주문번호</span>
        <strong className="text-sm tabular-nums text-[#2F3B34]">{order.id}</strong>
      </div>
      <div className="space-y-4 p-6">
        {order.items.map((item) => (
          <div key={`${item.productId}-${item.optionName ?? ''}`} className="flex justify-between gap-5 text-sm">
            <div>
              <p className="font-medium text-[#303731]">{item.productName}</p>
              <p className="mt-1 text-xs text-[#8A918B]">{item.optionName || '기본 옵션'} · {item.quantity}개</p>
            </div>
            <strong className="shrink-0 tabular-nums text-[#2F3B34]">{formatPrice(item.price * item.quantity)}</strong>
          </div>
        ))}
      </div>
      <dl className="grid gap-3 border-t border-[#D8D6CE] bg-[#F0EEE8] p-6 text-sm">
        <div className="flex justify-between"><dt className="text-[#7B827C]">배송지</dt><dd className="max-w-[70%] text-right text-[#303731]">{order.address}</dd></div>
        <div className="flex justify-between"><dt className="text-[#7B827C]">배송 요청</dt><dd className="text-[#303731]">{order.deliveryMemo || '없음'}</dd></div>
        <div className="flex justify-between"><dt className="text-[#7B827C]">결제수단</dt><dd className="text-[#303731]">{order.paymentMethod}</dd></div>
        <div className="flex justify-between"><dt className="text-[#7B827C]">결제상태</dt><dd className="text-[#303731]">{order.paymentStatus}</dd></div>
        <div className="mt-2 flex justify-between border-t border-[#D8D6CE] pt-4"><dt className="font-semibold text-[#303731]">최종 결제금액</dt><dd className="text-lg font-semibold tabular-nums text-[#2F3B34]">{formatPrice(order.totalPrice + order.deliveryFee)}</dd></div>
      </dl>
    </div>
  );
}

function OrderIdOnlyCard({ orderId }: { orderId: string }) {
  return (
    <div className="mt-10 border border-[#D8D6CE] bg-[#FAF9F5] p-6 text-center">
      <span className="text-xs text-[#7B827C]">주문번호</span>
      <p className="mt-2 text-sm tabular-nums text-[#2F3B34]">{orderId}</p>
      <p className="mt-4 text-xs text-[#8A918B]">주문 상세는 마이페이지에서 확인할 수 있습니다.</p>
    </div>
  );
}

function ConfirmIssueBlock({ kind }: { kind: ConfirmIssueKind }) {
  const copy = ISSUE_COPY[kind];
  return (
    <div className="text-center">
      <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full border border-[#D8D6CE] bg-[#FAF9F5] text-[#8A5A44]">
        <XCircle className="size-10" />
      </div>
      <h1 className="text-3xl font-normal text-[#202521]">{copy.title}</h1>
      <p className="mt-4 text-sm leading-7 text-[#747B75]">{copy.desc}</p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 sm:justify-center">
        <Link href="/mypage" className="flex min-h-12 items-center justify-center bg-[#2F3B34] px-6 text-sm font-semibold text-white">
          마이페이지 주문내역
        </Link>
        {copy.showCheckoutLink && (
          <Link href="/checkout" className="flex min-h-12 items-center justify-center border border-[#AEB3AE] bg-[#FAF9F5] px-6 text-sm font-semibold text-[#3E4841]">
            주문 다시 하기
          </Link>
        )}
      </div>
    </div>
  );
}

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 10; // 3초 × 10회 = 최대 30초

/**
 * pending/unconfirmed 화면 전용 — GET /api/payments/status(읽기 전용, R4 라운드2)를 최대 30초간
 * 폴링해 서버(webhook·reconcile·return 재조회)가 DB를 '결제완료'로 맞춰주면 화면을 전환한다.
 * ★승인을 재시도하는 게 아니다 — 상태를 읽기만 한다. confirm/claim/취소 등 어떤 변이 API도
 * 호출하지 않는다(구 클라이언트 오케스트레이션과의 차이). 소진되면 정적 안내 + 수동 재확인
 * 버튼(같은 읽기 전용 조회 1회)으로 전환한다.
 */
function PendingIssueBlock({ kind, orderId }: { kind: 'pending' | 'unconfirmed'; orderId: string | null }) {
  const [phase, setPhase] = useState<'polling' | 'exhausted' | 'confirmed' | 'rate-limited'>(
    orderId ? 'polling' : 'exhausted',
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!orderId || phase !== 'polling') return;

    let cancelled = false;
    const timer = setTimeout(() => {
      getPaymentStatus(orderId).then((result) => {
        if (cancelled) return;
        if (result.kind === 'rate-limited') {
          // ★조용한 실패 금지(opus 최종 재검증 LOW) — 예전엔 429를 null로 흡수해서 화면이
          // 아무 말 없이 "확인 중"만 보여줬다. 사용자에게 상황을 알리고 재시도 수단을 준다.
          setPhase('rate-limited');
          return;
        }
        if (result.kind === 'ok' && result.paymentStatus === '결제완료') {
          // status=done 경로와 동일하게 정리한다 — 폴링으로 확인한 성공도 "서버가 승인을
          // 확정했다는 신호"라는 점은 같다. 여기서 빠뜨리면 이 사용자만 장바구니가 안 비워지고
          // stale pending 키가 남아 다음 checkout에서 거짓 취소 안내가 뜨는 사고가 재발한다.
          clearPendingTossState();
          setPhase('confirmed');
          return;
        }
        setAttempt((prev) => {
          const next = prev + 1;
          if (next >= MAX_POLL_ATTEMPTS) setPhase('exhausted');
          return next;
        });
      });
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [orderId, phase, attempt]);

  const handleManualRecheck = () => {
    setAttempt(0);
    setPhase('polling');
  };

  if (phase === 'confirmed') {
    return (
      <div className="text-center">
        <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full border border-[#D8D6CE] bg-[#FAF9F5] text-[#51705B]">
          <CheckCircle2 className="size-10" />
        </div>
        <h1 className="text-3xl font-normal text-[#202521]">결제가 확인되었습니다</h1>
        <p className="mt-4 text-sm leading-7 text-[#747B75]">주문 내역은 마이페이지에서 확인할 수 있습니다.</p>
        <div className="mt-8">
          <Link href="/mypage" className="inline-flex min-h-12 items-center justify-center bg-[#2F3B34] px-6 text-sm font-semibold text-white">
            마이페이지 주문내역
          </Link>
        </div>
      </div>
    );
  }

  if (phase === 'rate-limited') {
    return (
      <div className="text-center">
        <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full border border-[#D8D6CE] bg-[#FAF9F5] text-[#8A5A44]">
          <XCircle className="size-10" />
        </div>
        <h1 className="text-3xl font-normal text-[#202521]">확인 요청이 많습니다</h1>
        <p className="mt-4 text-sm leading-7 text-[#747B75]">잠시 후 다시 시도해 주세요.</p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 sm:justify-center">
          <Link href="/mypage" className="flex min-h-12 items-center justify-center bg-[#2F3B34] px-6 text-sm font-semibold text-white">
            마이페이지 주문내역
          </Link>
          <button
            type="button"
            onClick={handleManualRecheck}
            className="flex min-h-12 items-center justify-center border border-[#AEB3AE] bg-[#FAF9F5] px-6 text-sm font-semibold text-[#3E4841]"
          >
            다시 확인
          </button>
        </div>
      </div>
    );
  }

  const copy = ISSUE_COPY[kind];
  return (
    <div className="text-center">
      <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full border border-[#D8D6CE] bg-[#FAF9F5] text-[#8A5A44]">
        {phase === 'polling' ? <Clock className="size-10 animate-pulse" /> : <XCircle className="size-10" />}
      </div>
      <h1 className="text-3xl font-normal text-[#202521]">{copy.title}</h1>
      <p className="mt-4 text-sm leading-7 text-[#747B75]">{copy.desc}</p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 sm:justify-center">
        <Link href="/mypage" className="flex min-h-12 items-center justify-center bg-[#2F3B34] px-6 text-sm font-semibold text-white">
          마이페이지 주문내역
        </Link>
        {phase === 'exhausted' && (
          <button
            type="button"
            onClick={handleManualRecheck}
            className="flex min-h-12 items-center justify-center border border-[#AEB3AE] bg-[#FAF9F5] px-6 text-sm font-semibold text-[#3E4841]"
          >
            다시 확인
          </button>
        )}
      </div>
    </div>
  );
}

/** classifyStatus 결과 중 "화면이 문제 안내를 보여줘야 하는" 다섯 가지만 좁힌 타입 —
 *  URL 쿼리만으로 순수하게 정해지므로 effect·state 없이 렌더 중에 바로 파생한다. */
function toIssueKind(classified: ReturnType<typeof classifyStatus>): ConfirmIssueKind | null {
  return classified === 'no-query' || classified === 'done' ? null : classified;
}

function OrderCompleteInner() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  const statusRaw = searchParams.get('status');
  const orderIdRaw = searchParams.get('orderId');
  const classified = classifyStatus(statusRaw);
  const issueKind = toIssueKind(classified);

  useEffect(() => {
    if (issueKind) return; // 렌더가 직접 처리 — 비동기 조회 불필요.

    let cancelled = false;

    // classified === 'done' | 'no-query' — 둘 다 sessionStorage 스냅샷(주문 생성 시 저장됨)이
    // 필요하다. 'done'은 서버가 방금 승인을 확정했다는 신호만 갖고 있고 상세(품목·배송지 등)는
    // 클라이언트가 재확인 API를 부르지 않으므로, 같은 브라우저 세션의 스냅샷과 orderId를
    // 대조해서만 상세를 보여준다(다른 브라우저·세션 만료면 주문번호만 표시).
    getLastOrder().then((snapshot) => {
      if (cancelled) return;
      if (classified === 'done') {
        // 서버가 승인을 확정했다는 신호를 받은 시점 — 스냅샷 일치 여부와 무관하게 정리한다
        // (이 브라우저에 스냅샷이 없어도 pending 표식은 지워야 다음 방문이 거짓 취소를 안 만든다).
        clearPendingTossState();
        const matches = snapshot && orderIdRaw && snapshot.id === orderIdRaw;
        // 화면 표시용 낙관적 갱신 — DB의 실제 확정 상태를 대체하지 않는다(§ 서버가 유일한 권위).
        const order = matches ? { ...snapshot, paymentStatus: '결제완료' } : null;
        setState({ status: 'done', order, orderId: orderIdRaw });
        return;
      }
      setState({ status: 'ready', order: snapshot });
    });

    return () => {
      cancelled = true;
    };
  }, [classified, orderIdRaw, issueKind]);

  if (issueKind) {
    return (
      <div className="min-h-dvh bg-[#F4F2EC] py-20">
        <div className="mx-auto max-w-2xl px-5">
          {issueKind === 'pending' || issueKind === 'unconfirmed' ? (
            <PendingIssueBlock kind={issueKind} orderId={orderIdRaw} />
          ) : (
            <ConfirmIssueBlock kind={issueKind} />
          )}
        </div>
      </div>
    );
  }

  if (state.status === 'loading') return null;

  const order = state.status === 'ready' ? state.order : state.status === 'done' ? state.order : null;
  const fallbackOrderId = state.status === 'done' ? state.orderId : null;

  return (
    <div className="min-h-dvh bg-[#F4F2EC] py-20">
      <div className="mx-auto max-w-2xl px-5">
        <div className="text-center">
          <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full border border-[#D8D6CE] bg-[#FAF9F5] text-[#51705B]">
            <CheckCircle2 className="size-10" />
          </div>
          <h1 className="text-3xl font-normal text-[#202521]">주문이 완료되었습니다</h1>
          <p className="mt-4 text-sm leading-7 text-[#747B75]">
            주문 내역과 배송 진행 상황은 마이페이지에서 확인할 수 있습니다.
          </p>
        </div>

        {order ? (
          <OrderDetailCard order={order} />
        ) : fallbackOrderId ? (
          <OrderIdOnlyCard orderId={fallbackOrderId} />
        ) : (
          <div className="mt-10 border border-dashed border-[#C9C8C0] bg-[#FAF9F5] p-8 text-center text-sm text-[#747B75]">
            저장된 최근 주문 정보가 없습니다.
          </div>
        )}

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link href="/shop" className="flex min-h-12 items-center justify-center border border-[#AEB3AE] bg-[#FAF9F5] px-6 text-sm font-semibold text-[#3E4841]">
            쇼핑 계속하기
          </Link>
          <Link href="/mypage" className="flex min-h-12 items-center justify-center bg-[#2F3B34] px-6 text-sm font-semibold text-white">
            마이페이지 이동
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function OrderCompletePage() {
  return (
    <Suspense fallback={null}>
      <OrderCompleteInner />
    </Suspense>
  );
}
