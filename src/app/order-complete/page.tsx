'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { confirmTossPayment, getLastOrder } from '@/lib/storage';
import { clearCart } from '@/lib/cart';
import { formatPrice } from '@/lib/format';
import type { ConfirmedOrderSummary, Order } from '@/types';

// checkout PENDING_ORDER_KEY와 동기화 — 토스 위젯 진입 시 checkout이 심어두는 미완료 결제
// 표식. 리터럴 값을 그대로 맞춰야 승인 성공 후 정리가 실제로 지워진다(계약 파일 아님 — 값만 동기화).
const PENDING_TOSS_ORDER_KEY = 'baekjo_pending_toss_order';

/** 승인 성공(200) 확정 후에만 호출 — 장바구니와 checkout의 미완료 결제 표식을 정리한다.
 * 202/실패 경로에서는 정리하지 않는다(재시도·재확인에 필요한 상태이므로 지우면 안 된다).
 * 정리 누락 시 이후 무관한 /checkout?fail=1 방문이 stale 키를 소비해 거짓 취소 안내를 하거나
 * 결제 완료된 장바구니가 그대로 남는 문제가 생긴다. */
function clearPendingTossState(): void {
  clearCart();
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(PENDING_TOSS_ORDER_KEY);
  }
}

type ConfirmIssueKind = 'pending' | 'declined' | 'expired' | 'delayed' | 'failed' | 'invalid';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; order: Order | null }
  | { status: 'confirming' }
  | { status: 'confirmed'; order: Order | null; summary: ConfirmedOrderSummary }
  | { status: 'confirm-issue'; kind: ConfirmIssueKind };

const AUTO_RETRY_DELAY_MS = 4000;
const DELAYED_RETRY_DELAY_MS = 500;

const ISSUE_COPY: Record<ConfirmIssueKind, { title: string; desc: string; showRetry: boolean; showCheckoutLink: boolean }> = {
  pending: {
    title: '결제 확인 중입니다',
    desc: '결제 승인 처리가 진행 중입니다. 잠시 후 다시 확인해 주세요.',
    showRetry: true,
    showCheckoutLink: false,
  },
  declined: {
    title: '결제가 거절되었습니다',
    desc: '카드사 승인이 거절되었습니다. 다른 결제수단으로 다시 시도해 주세요.',
    showRetry: false,
    showCheckoutLink: true,
  },
  expired: {
    title: '주문이 만료되었거나 이미 처리되었습니다',
    desc: '주문 유효 시간이 지났거나 이미 처리된 주문입니다. 다시 주문해 주세요.',
    showRetry: false,
    showCheckoutLink: true,
  },
  delayed: {
    title: '결제 확인이 지연되고 있습니다',
    desc: '네트워크 지연으로 확인이 늦어지고 있습니다. 잠시 후 다시 시도해 주세요.',
    showRetry: true,
    showCheckoutLink: true,
  },
  failed: {
    title: '결제 확인에 실패했습니다',
    desc: '결제 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    showRetry: true,
    showCheckoutLink: true,
  },
  invalid: {
    title: '결제 확인 정보가 올바르지 않습니다',
    desc: '결제 확인에 필요한 정보가 일부 누락되었습니다. 주문을 다시 진행해 주세요.',
    showRetry: false,
    showCheckoutLink: true,
  },
};

/** /api/payments/confirm 실패 응답의 error 코드 → 화면 분기 카테고리. */
function classifyConfirmError(error: string): ConfirmIssueKind {
  switch (error) {
    case 'payment-confirming':
      return 'pending';
    case 'payment-declined':
      return 'declined';
    case 'reservation-expired':
    case 'payment-key-mismatch':
    case 'order-not-found':
    case 'amount-mismatch':
      return 'expired';
    case 'payment-unconfirmed':
    case 'network':
      return 'delayed';
    default:
      return 'failed';
  }
}

/** 승인 결과(PII 없는 요약)를 sessionStorage 스냅샷과 합쳐 화면 표시용 상세를 만든다.
 * 스냅샷이 없거나 다른 주문이면(다른 브라우저·세션 만료 등) null — 요약만으로 최소 렌더. */
function mergeConfirmedOrder(snapshot: Order | null, summary: ConfirmedOrderSummary): Order | null {
  if (!snapshot || snapshot.id !== summary.id) return null;
  return {
    ...snapshot,
    orderStatus: summary.orderStatus,
    paymentStatus: summary.paymentStatus,
    totalPrice: summary.totalPrice,
    deliveryFee: summary.deliveryFee,
    paidAt: summary.paidAt,
  };
}

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

function SummaryOnlyCard({ summary }: { summary: ConfirmedOrderSummary }) {
  return (
    <div className="mt-10 border border-[#D8D6CE] bg-[#FAF9F5]">
      <div className="flex items-center justify-between border-b border-[#D8D6CE] px-6 py-4">
        <span className="text-xs text-[#7B827C]">주문번호</span>
        <strong className="text-sm tabular-nums text-[#2F3B34]">{summary.id}</strong>
      </div>
      <dl className="grid gap-3 p-6 text-sm">
        <div className="flex justify-between"><dt className="text-[#7B827C]">결제상태</dt><dd className="text-[#303731]">{summary.paymentStatus}</dd></div>
        <div className="mt-2 flex justify-between border-t border-[#D8D6CE] pt-4"><dt className="font-semibold text-[#303731]">최종 결제금액</dt><dd className="text-lg font-semibold tabular-nums text-[#2F3B34]">{formatPrice(summary.totalPrice + summary.deliveryFee)}</dd></div>
      </dl>
    </div>
  );
}

function ConfirmingBlock() {
  return (
    <div className="text-center">
      <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full border border-[#D8D6CE] bg-[#FAF9F5] text-[#51705B]">
        <Clock className="size-10 animate-pulse" />
      </div>
      <h1 className="text-3xl font-normal text-[#202521]">결제를 확인하고 있습니다</h1>
      <p className="mt-4 text-sm leading-7 text-[#747B75]">잠시만 기다려 주세요.</p>
    </div>
  );
}

function ConfirmIssueBlock({
  kind,
  onRetry,
  retryDisabled,
}: {
  kind: ConfirmIssueKind;
  onRetry: () => void;
  retryDisabled: boolean;
}) {
  const copy = ISSUE_COPY[kind];
  return (
    <div className="text-center">
      <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full border border-[#D8D6CE] bg-[#FAF9F5] text-[#8A5A44]">
        <XCircle className="size-10" />
      </div>
      <h1 className="text-3xl font-normal text-[#202521]">{copy.title}</h1>
      <p className="mt-4 text-sm leading-7 text-[#747B75]">{copy.desc}</p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 sm:justify-center">
        {copy.showRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={retryDisabled}
            className="flex min-h-12 items-center justify-center bg-[#2F3B34] px-6 text-sm font-semibold text-white disabled:opacity-50"
          >
            재확인
          </button>
        )}
        {copy.showCheckoutLink && (
          <Link href="/checkout" className="flex min-h-12 items-center justify-center border border-[#AEB3AE] bg-[#FAF9F5] px-6 text-sm font-semibold text-[#3E4841]">
            주문 다시 하기
          </Link>
        )}
      </div>
    </div>
  );
}

/** performConfirm이 갱신하는 실행 상태 — 컴포넌트 리렌더와 무관하게 값을 들고 있어야 하는
 * 것들이라 훅이 아니라 일반 ref 객체(useRef가 반환하는 {current} 모양과 구조적으로 호환)로
 * 전달받는다. 모듈 최상위 함수라 React Compiler의 메모이제이션 분석 대상이 아니다.
 * 진입 락(inFlightRef)은 두지 않는다 — attemptId(세대 카운터)만으로 통제한다(아래 설명). */
interface ConfirmRefs {
  isMountedRef: { current: boolean };
  attemptRef: { current: number };
  autoRetriedRef: { current: boolean };
  autoRetryTimerRef: { current: ReturnType<typeof setTimeout> | null };
}

/** 승인 확정의 단일 진입점 — 최초 자동 시도·자동 재시도(202/지연)·수동 재시도가 전부 이 함수를
 * 거친다. attemptId(세대 카운터)로 가장 최근 시도만 상태를 갱신하게 한다: 새 호출이 시작되는
 * 순간 attemptRef가 증가하고, 이전 세대의 모든 await-뒤 가드(`attemptId !== refs.attemptRef.current`)
 * 가 자동으로 무효화된다. 서버 confirm은 멱등이라 동시 호출 2건이 겹쳐도 안전 — 그래서 진입 락
 * (inFlightRef)을 두지 않는다. 예전에 진입 락을 뒀을 때는 두 가지 결함이 있었다:
 *  ① delayed(502/네트워크) 자동재시도가 바깥 performConfirm의 락이 풀리기 전에 동기 재귀
 *     호출돼 즉시 no-op되고 autoRetriedRef만 소진됐다(재시도가 죽어 있었다).
 *  ② 쿼리 변경 시 새 호출이 락에 막히면 구세대 attemptRef가 무효화되지 않아 stale 응답이
 *     화면·정리(clearPendingTossState)를 커밋할 수 있었다.
 * 이제 동시 클릭 방지는 진입 락이 아니라 UI(재확인 버튼 disabled, 아래 컴포넌트)로 처리한다.
 * params는 호출 시점에 캡처한 값을 재시도에도 그대로 재사용한다 — 재시도는 "같은 요청을 다시
 * 확인"하는 것이지 쿼리를 다시 읽는 게 아니다. */
async function performConfirm(
  params: { paymentKey: string | null; orderId: string | null; amount: number },
  refs: ConfirmRefs,
  setState: (state: LoadState) => void,
): Promise<void> {
  const { paymentKey, orderId, amount } = params;
  if (!paymentKey || !orderId || !Number.isFinite(amount) || amount <= 0) {
    if (refs.isMountedRef.current) setState({ status: 'confirm-issue', kind: 'invalid' });
    return;
  }

  // 새 시도가 시작되면 예약돼 있던 이전 자동 재시도 타이머는 취소한다(안 하면 그 타이머가
  // 나중에 발사돼 이 새 시도와 경합할 수 있다).
  if (refs.autoRetryTimerRef.current) {
    clearTimeout(refs.autoRetryTimerRef.current);
    refs.autoRetryTimerRef.current = null;
  }

  const attemptId = ++refs.attemptRef.current;
  if (refs.isMountedRef.current) setState({ status: 'confirming' });

  const result = await confirmTossPayment({ paymentKey, orderId, amount });
  // 이 응답이 도착한 사이 더 최근 시도(수동 재시도·쿼리 변경 등)가 이미 시작됐으면 화면을
  // 덮어쓰지 않는다 — 진입 락이 아니라 세대 번호로 stale 응답을 걸러낸다.
  if (!refs.isMountedRef.current || attemptId !== refs.attemptRef.current) return;

  if (result.ok) {
    clearPendingTossState();
    const snapshot = await getLastOrder();
    if (!refs.isMountedRef.current || attemptId !== refs.attemptRef.current) return;
    setState({ status: 'confirmed', order: mergeConfirmedOrder(snapshot, result.order), summary: result.order });
    return;
  }

  const kind = classifyConfirmError(result.error);
  setState({ status: 'confirm-issue', kind });

  // 자동 재시도는 페이지당 최초 1회만. 202(확인중)는 4초 후, 502/네트워크성(지연)은 0.5초 후 —
  // 둘 다 반드시 타이머를 거친다(동기 재귀 금지). 타이머 콜백은 현재 실행 스택이 끝난 뒤
  // 실행되므로 예전의 진입 락 문제 자체가 없다. 소진(autoRetriedRef=true)은 "예약 시점"이 아니라
  // "타이머가 실제로 발사되는 시점"에 기록한다 — 예약만 해놓고 못 쏘는 일이 없게 하기 위함이다.
  if (!refs.autoRetriedRef.current && (kind === 'pending' || kind === 'delayed')) {
    const delay = kind === 'pending' ? AUTO_RETRY_DELAY_MS : DELAYED_RETRY_DELAY_MS;
    refs.autoRetryTimerRef.current = setTimeout(() => {
      refs.autoRetryTimerRef.current = null;
      if (refs.isMountedRef.current && attemptId === refs.attemptRef.current) {
        refs.autoRetriedRef.current = true;
        void performConfirm(params, refs, setState);
      }
    }, delay);
  }
}

function OrderCompleteInner() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const isMountedRef = useRef(true);
  // 가장 최근에 시작한 승인 시도의 세대 번호(performConfirm이 증가시킨다).
  const attemptRef = useRef(0);
  // 페이지당 자동 재시도는 최초 1회만(수동 재시도는 이 예산과 무관하게 항상 허용).
  const autoRetriedRef = useRef(false);
  // 예약된 자동 재시도(202 몇 초 후)의 setTimeout 핸들 — 수동 재시도나 언마운트 시 취소한다.
  const autoRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 같은 쿼리 조합에 대해 확정 로직을 중복 시작하지 않기 위한 마지막 처리 키(StrictMode 이중
  // 마운트 방어 겸용). confirmKey가 실제로 바뀌면(다른 쿼리로 재진입) 새로 시작한다.
  const lastKeyRef = useRef<string | null>(null);

  const paymentKeyRaw = searchParams.get('paymentKey');
  const orderIdRaw = searchParams.get('orderId');
  const amountRaw = searchParams.get('amount');
  // JSON.stringify로 조합 — 원시 구분자('|')로 이어붙이면 파라미터 값 자체에 그 구분자가
  // 섞여 들어올 때(이론상 URL 인코딩된 리터럴 파이프 등) 서로 다른 조합이 같은 키로 충돌할 수
  // 있다(LOW). 배열 JSON 인코딩은 각 요소 경계가 명확해 그 충돌이 없다.
  const confirmKey = JSON.stringify([paymentKeyRaw, orderIdRaw, amountRaw]);

  // 토스 파라미터가 "하나라도" 있으면 결제 리다이렉트로 간주한다 — 셋 다 있어야만 승인 경로로
  // 들어가던 이전 로직은, 파라미터 일부가 누락되거나 빈 문자열인 부분 쿼리를 "쿼리 없음"으로
  // 오인해 무통장 스냅샷(=정상 완료 화면)으로 조용히 흘려보내는 우회 경로가 있었다(HIGH).
  const hasAnyTossParam = paymentKeyRaw !== null || orderIdRaw !== null || amountRaw !== null;
  const parsedAmount = amountRaw ? Number(amountRaw) : NaN;
  const hasValidConfirmQuery = Boolean(
    paymentKeyRaw && orderIdRaw && amountRaw && Number.isFinite(parsedAmount) && parsedAmount > 0,
  );
  // 파라미터가 있긴 하지만 일부 누락·빈 문자열 — confirmTossPayment를 호출하지 않고 렌더에서
  // 곧바로 에러 화면을 보여준다(effect의 setState 왕복 없이 순수 파생값으로 처리).
  const showInvalidQuery = hasAnyTossParam && !hasValidConfirmQuery;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // confirmKey(쿼리 조합) 단위 1회 가드 — 같은 키로는 StrictMode 이중 마운트를 포함해 재진입하지
    // 않고, 키가 실제로 바뀌면(다른 orderId/paymentKey로 재방문) 상태를 리셋하고 새로 시작한다.
    if (lastKeyRef.current === confirmKey) return;
    lastKeyRef.current = confirmKey;
    autoRetriedRef.current = false;
    if (autoRetryTimerRef.current) {
      clearTimeout(autoRetryTimerRef.current);
      autoRetryTimerRef.current = null;
    }
    // 새 키가 수락되는 순간 어떤 분기로 가든(유효 쿼리/invalid/무쿼리) 이전 세대를 무조건
    // 무효화한다. 이걸 유효 쿼리 분기(performConfirm 호출) 안에서만 증가시키면, invalid나
    // 무쿼리로 빠지는 분기는 attemptRef를 안 건드리므로 진행 중이던 이전 유효 쿼리의 confirm이
    // "attemptId === attemptRef.current" 세대 가드를 그대로 통과해 화면 갱신·clearPendingTossState
    // (카트·세션 마커 정리)를 실행할 수 있었다(HIGH). 유효 경로에서는 performConfirm이 곧이어
    // 또 증가시키지만 단조 증가라 가드 의미는 그대로라 무해하다.
    attemptRef.current += 1;

    if (showInvalidQuery) return; // 렌더가 직접 처리 — 비동기 작업 불필요.

    if (!hasAnyTossParam) {
      getLastOrder().then((order) => {
        if (isMountedRef.current) setState({ status: 'ready', order });
      });
      return;
    }

    const refs: ConfirmRefs = { isMountedRef, attemptRef, autoRetriedRef, autoRetryTimerRef };
    void performConfirm({ paymentKey: paymentKeyRaw, orderId: orderIdRaw, amount: parsedAmount }, refs, setState);

    return () => {
      if (autoRetryTimerRef.current) {
        clearTimeout(autoRetryTimerRef.current);
        autoRetryTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmKey]);

  // 이중 클릭 방지는 진입 락이 아니라 UI로 — 재확인 버튼은 'confirming' 동안 disabled.
  // ('confirm-issue' 상태에서만 이 블록이 렌더되므로 구조적으로도 이미 대부분 커버되지만,
  // 재확인 버튼 자체에도 명시적으로 disabled를 걸어 같은 틱의 연속 클릭까지 막는다.)
  const isConfirmActionPending: boolean = state.status === 'confirming';

  const handleManualRetry = () => {
    if (state.status !== 'confirm-issue') return;
    const refs: ConfirmRefs = { isMountedRef, attemptRef, autoRetriedRef, autoRetryTimerRef };
    void performConfirm({ paymentKey: paymentKeyRaw, orderId: orderIdRaw, amount: parsedAmount }, refs, setState);
  };

  if (showInvalidQuery) {
    return (
      <div className="min-h-dvh bg-[#F4F2EC] py-20">
        <div className="mx-auto max-w-2xl px-5">
          <ConfirmIssueBlock kind="invalid" onRetry={handleManualRetry} retryDisabled={isConfirmActionPending} />
        </div>
      </div>
    );
  }

  if (state.status === 'loading') return null;

  if (state.status === 'confirming') {
    return (
      <div className="min-h-dvh bg-[#F4F2EC] py-20">
        <div className="mx-auto max-w-2xl px-5">
          <ConfirmingBlock />
        </div>
      </div>
    );
  }

  if (state.status === 'confirm-issue') {
    return (
      <div className="min-h-dvh bg-[#F4F2EC] py-20">
        <div className="mx-auto max-w-2xl px-5">
          <ConfirmIssueBlock kind={state.kind} onRetry={handleManualRetry} retryDisabled={isConfirmActionPending} />
        </div>
      </div>
    );
  }

  const order = state.status === 'ready' ? state.order : state.status === 'confirmed' ? state.order : null;
  const confirmedSummary = state.status === 'confirmed' ? state.summary : null;

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
        ) : confirmedSummary ? (
          <SummaryOnlyCard summary={confirmedSummary} />
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
