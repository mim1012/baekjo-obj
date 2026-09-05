import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import {
  completeOrderRefund,
  createOrderRefundRequest,
  getOrderById,
  listOrderRefunds,
  updateOrderRefundException,
} from '@/lib/orders/repo';
import {
  normalizeRefundPayload,
  assertRefundableOrder,
  RefundValidationError,
  type NormalizedRefundRequest,
  type OrderRefundRecord,
} from '@/lib/orders/refund';
import {
  cancelTossPaymentPartial,
  isTossClientRejection,
  queryTossPayment,
  TossConfirmError,
  type TossConfirmResult,
} from '@/lib/payments/toss';
import { logServerError } from '@/lib/logServerError';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function sameRefundRequest(refund: OrderRefundRecord, request: NormalizedRefundRequest): boolean {
  if (refund.requestedAmount !== request.requestedAmount || refund.includeDeliveryFee !== request.includeDeliveryFee) {
    return false;
  }
  if (refund.items.length !== request.items.length) return false;
  return request.items.every((item) => {
    const stored = refund.items.find((candidate) => candidate.lineIndex === item.lineIndex);
    return Boolean(
      stored &&
        stored.productId === item.productId &&
        stored.quantity === item.quantity &&
        stored.amount === item.amount,
    );
  });
}

function validateProviderSnapshot(result: TossConfirmResult, order: { id: string; paymentKey?: string; totalPrice: number; deliveryFee: number }) {
  if (
    result.paymentKey !== order.paymentKey ||
    result.orderId !== order.id ||
    result.totalAmount !== order.totalPrice + order.deliveryFee ||
    result.balanceAmount === null ||
    result.balanceAmount < 0 ||
    result.balanceAmount > result.totalAmount ||
    !['DONE', 'PARTIAL_CANCELED', 'CANCELED'].includes(result.status)
  ) {
    throw new Error('refund-provider-state-mismatch');
  }
  return result.balanceAmount;
}

function lastTransactionKey(result: TossConfirmResult): string | null {
  return result.cancels.length > 0 ? result.cancels[result.cancels.length - 1].transactionKey : null;
}

function hasNewProviderCancel(
  before: TossConfirmResult,
  after: TossConfirmResult,
  amount: number,
): boolean {
  const knownTransactions = new Set(before.cancels.map((cancel) => cancel.transactionKey));
  return after.cancels.some(
    (cancel) => !knownTransactions.has(cancel.transactionKey) && cancel.cancelAmount === amount,
  );
}

function successfulRefundAmount(refunds: OrderRefundRecord[]): number {
  return refunds.reduce((sum, refund) => sum + (refund.status === 'SUCCEEDED' ? refund.approvedAmount ?? 0 : 0), 0);
}

async function markRefundException(
  refundId: string,
  status: 'FAILED' | 'UNKNOWN',
  message: string,
): Promise<void> {
  try {
    await updateOrderRefundException(refundId, status, message);
  } catch (error) {
    logServerError('[POST /api/admin/orders/[id]/refunds] 환불 예외 기록 실패', error);
  }
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'not-found' }, { status: 404 });

  try {
    const order = await getOrderById(id);
    if (!order) return NextResponse.json({ error: 'not-found' }, { status: 404 });
    const refunds = await listOrderRefunds(id);
    return NextResponse.json({ refunds }, { status: 200 });
  } catch (error) {
    logServerError('[GET /api/admin/orders/[id]/refunds] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'not-found' }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-refund-input' }, { status: 422 });
  }

  try {
    const order = await getOrderById(id);
    if (!order) return NextResponse.json({ error: 'not-found' }, { status: 404 });
    const normalized = normalizeRefundPayload(order, body);
    if (!order.paymentKey) {
      return NextResponse.json({ error: 'refund-provider-not-supported' }, { status: 422 });
    }

    const refunds = await listOrderRefunds(id);
    const existing = refunds.find((refund) => refund.idempotencyKey === normalized.idempotencyKey);
    if (existing && !sameRefundRequest(existing, normalized)) {
      return NextResponse.json({ error: 'refund-idempotency-key-conflict' }, { status: 409 });
    }
    if (existing?.status === 'SUCCEEDED') {
      return NextResponse.json({ refund: existing }, { status: 200 });
    }
    if (existing?.status === 'FAILED') {
      return NextResponse.json({ error: 'refund-request-failed', refund: existing }, { status: 409 });
    }

    assertRefundableOrder(order);
    const providerSnapshot = await queryTossPayment(order.paymentKey);
    const providerBalance = validateProviderSnapshot(providerSnapshot, order);
    const expectedBalance = order.totalPrice + order.deliveryFee - successfulRefundAmount(refunds);
    const activeRefund = existing && (existing.status === 'PROCESSING' || existing.status === 'UNKNOWN') ? existing : null;
    if (providerBalance !== expectedBalance && providerBalance !== expectedBalance - normalized.requestedAmount) {
      return NextResponse.json({ error: 'refund-provider-state-mismatch' }, { status: 409 });
    }

    const refund = activeRefund ?? (await createOrderRefundRequest(
      id,
      normalized,
      providerBalance,
      admin.requester.id,
    ));
    if (refund.status === 'SUCCEEDED') return NextResponse.json({ refund }, { status: 200 });
    if (refund.status === 'FAILED') {
      return NextResponse.json({ error: 'refund-request-failed', refund }, { status: 409 });
    }

    const balanceBefore = refund.providerBalanceBefore ?? providerBalance;
    if (providerBalance === balanceBefore - refund.requestedAmount) {
      try {
        const completed = await completeOrderRefund(
          refund.id,
          refund.requestedAmount,
          providerBalance,
          providerSnapshot.status,
          lastTransactionKey(providerSnapshot),
        );
        return NextResponse.json({ refund: completed }, { status: 200 });
      } catch (error) {
        await markRefundException(refund.id, 'UNKNOWN', errorMessage(error));
        return NextResponse.json({ error: 'refund-finalize-failed' }, { status: 502 });
      }
    }
    if (providerBalance !== balanceBefore) {
      await markRefundException(refund.id, 'UNKNOWN', 'refund-provider-amount-mismatch');
      return NextResponse.json({ error: 'refund-provider-state-mismatch' }, { status: 409 });
    }

    let cancelled: TossConfirmResult;
    try {
      cancelled = await cancelTossPaymentPartial(
        order.paymentKey,
        normalized.reason,
        refund.requestedAmount,
        refund.idempotencyKey,
      );
      const cancelledBalance = validateProviderSnapshot(cancelled, order);
      if (
        cancelledBalance !== balanceBefore - refund.requestedAmount ||
        !hasNewProviderCancel(providerSnapshot, cancelled, refund.requestedAmount)
      ) {
        throw new Error('refund-provider-amount-mismatch');
      }
    } catch (error) {
      const tossError = error instanceof TossConfirmError ? error : null;
      let reconciled: TossConfirmResult | null = null;
      try {
        const result = await queryTossPayment(order.paymentKey);
        validateProviderSnapshot(result, order);
        reconciled = result;
      } catch {
        reconciled = null;
      }
      if (
        reconciled &&
        reconciled.balanceAmount === balanceBefore - refund.requestedAmount &&
        hasNewProviderCancel(providerSnapshot, reconciled, refund.requestedAmount)
      ) {
        try {
          const completed = await completeOrderRefund(
            refund.id,
            refund.requestedAmount,
            reconciled.balanceAmount,
            reconciled.status,
            lastTransactionKey(reconciled),
          );
          return NextResponse.json({ refund: completed }, { status: 200 });
        } catch (finalizeError) {
          await markRefundException(refund.id, 'UNKNOWN', errorMessage(finalizeError));
          return NextResponse.json({ error: 'refund-finalize-failed' }, { status: 502 });
        }
      }

      const exceptionStatus = tossError && isTossClientRejection(tossError.httpStatus) ? 'FAILED' : 'UNKNOWN';
      await markRefundException(refund.id, exceptionStatus, errorMessage(error));
      return NextResponse.json(
        { error: exceptionStatus === 'FAILED' ? 'refund-provider-rejected' : 'refund-provider-unknown' },
        { status: exceptionStatus === 'FAILED' ? 409 : 502 },
      );
    }

    try {
      const completed = await completeOrderRefund(
        refund.id,
        refund.requestedAmount,
        cancelled.balanceAmount as number,
        cancelled.status,
        lastTransactionKey(cancelled),
      );
      return NextResponse.json({ refund: completed }, { status: 200 });
    } catch (error) {
      await markRefundException(refund.id, 'UNKNOWN', errorMessage(error));
      return NextResponse.json({ error: 'refund-finalize-failed' }, { status: 502 });
    }
  } catch (error) {
    if (error instanceof RefundValidationError) {
      return NextResponse.json({ error: error.code }, { status: 422 });
    }
    if (error instanceof TossConfirmError) {
      const status = isTossClientRejection(error.httpStatus) ? 409 : 502;
      return NextResponse.json(
        { error: isTossClientRejection(error.httpStatus) ? 'refund-provider-rejected' : 'refund-provider-unknown' },
        { status },
      );
    }
    if (errorMessage(error).startsWith('REFUND_')) {
      return NextResponse.json({ error: 'refund-request-rejected' }, { status: 409 });
    }
    if (errorMessage(error) === 'refund-provider-state-mismatch') {
      return NextResponse.json({ error: 'refund-provider-state-mismatch' }, { status: 409 });
    }
    logServerError('[POST /api/admin/orders/[id]/refunds] 처리 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}

