'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import {
  createAdminOrderRefund,
  getAdminOrderRefunds,
  type CreateAdminOrderRefundInput,
} from '@/lib/storage';
import { formatDate, formatPrice } from '@/lib/format';
import {
  allRemainingItemsSelected,
  remainingQuantity,
  refundStatusLabel,
  type OrderRefundRecord,
  type RefundItemInput,
} from '@/lib/orders/refund';
import type { Order } from '@/types';
import FormSection from '@/components/admin-new/common/FormSection';

interface OrderRefundPanelProps {
  order: Order;
  onUpdate: () => void | Promise<void>;
}

function refundErrorMessage(error: unknown): string {
  const code = error instanceof Error ? error.message : '';
  switch (code) {
    case 'refund-after-shipment-not-supported':
      return '배송이 시작된 주문은 이 화면에서 환불할 수 없습니다.';
    case 'refund-provider-not-supported':
      return '무통장입금 주문은 자동 환불을 지원하지 않습니다. 입금 환불 후 별도 기록이 필요합니다.';
    case 'refund-provider-unknown':
      return '결제사 처리 결과를 확인하지 못했습니다. 같은 요청을 반복하지 말고 환불 이력을 확인하세요.';
    case 'refund-finalize-failed':
      return '결제사 환불은 진행됐지만 주문 원장 반영이 지연됐습니다. 확인 필요 상태를 먼저 점검하세요.';
    case 'refund-provider-rejected':
      return '결제사가 환불 요청을 거절했습니다. 금액과 결제 상태를 확인하세요.';
    case 'refund-quantity-exceeds-remaining':
    case 'refund-request-rejected':
      return '이미 환불된 수량이 포함됐거나 환불 조건이 변경됐습니다. 주문을 새로고침하세요.';
    default:
      return '환불 요청을 처리하지 못했습니다. 잠시 후 다시 시도하세요.';
  }
}

function historyAmount(refund: OrderRefundRecord): number {
  return refund.approvedAmount ?? refund.requestedAmount;
}

export default function OrderRefundPanel({ order, onUpdate }: OrderRefundPanelProps) {
  const [refunds, setRefunds] = useState<OrderRefundRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('고객 요청');
  const [includeDeliveryFee, setIncludeDeliveryFee] = useState(false);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const confirmDialogRef = useRef<HTMLDivElement>(null);
  const confirmCancelButtonRef = useRef<HTMLButtonElement>(null);

  const loadRefunds = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await getAdminOrderRefunds(order.id);
      setRefunds(rows);
      const activeRefund = rows.find((refund) => refund.status === 'PROCESSING' || refund.status === 'UNKNOWN');
      if (activeRefund) setIdempotencyKey(activeRefund.idempotencyKey);
      else if (idempotencyKey && rows.some((refund) => refund.idempotencyKey === idempotencyKey)) setIdempotencyKey(null);
      setError(null);
    } catch {
      setError('환불 이력을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [idempotencyKey, order.id]);

  useEffect(() => {
    if (!showConfirm) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = confirmDialogRef.current;
    confirmCancelButtonRef.current?.focus();

    const handleDialogKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowConfirm(false);
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleDialogKeyDown);
    return () => {
      document.removeEventListener('keydown', handleDialogKeyDown);
      previousFocus?.focus();
    };
  }, [showConfirm]);

  useEffect(() => {
    let active = true;
    void getAdminOrderRefunds(order.id)
      .then((rows) => {
        if (!active) return;
        setRefunds(rows);
        const activeRefund = rows.find((refund) => refund.status === 'PROCESSING' || refund.status === 'UNKNOWN');
        if (activeRefund) setIdempotencyKey(activeRefund.idempotencyKey);
        setError(null);
      })
      .catch(() => {
        if (active) setError('환불 이력을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [order.id]);

  const remaining = useMemo(
    () => order.items.map((item, lineIndex) => remainingQuantity(item, lineIndex, refunds)),
    [order.items, refunds],
  );
  const selectedItems = useMemo<RefundItemInput[]>(
    () =>
      order.items.flatMap((item, lineIndex) => {
        const quantity = Math.min(Math.max(quantities[lineIndex] ?? 0, 0), remaining[lineIndex]);
        return quantity > 0 ? [{ lineIndex, productId: item.productId, quantity }] : [];
      }),
    [order.items, quantities, remaining],
  );
  const selectedAmount = useMemo(
    () =>
      selectedItems.reduce(
        (sum, selected) => sum + order.items[selected.lineIndex].price * selected.quantity,
        0,
      ),
    [order.items, selectedItems],
  );
  const allSelected = allRemainingItemsSelected(order, selectedItems, refunds);
  const canIncludeDeliveryFee = allSelected && order.deliveryFee > 0;
  const requestAmount = selectedAmount + (includeDeliveryFee && canIncludeDeliveryFee ? order.deliveryFee : 0);
  const canSubmit =
    order.paymentStatus === '결제완료' &&
    Boolean(order.paymentKey) &&
    order.deliveryStatus !== '배송중' &&
    order.deliveryStatus !== '배송완료' &&
    (selectedItems.length > 0 || (includeDeliveryFee && canIncludeDeliveryFee)) &&
    requestAmount > 0 &&
    reason.trim().length > 0 &&
    (!includeDeliveryFee || canIncludeDeliveryFee);

  const handleQuantityChange = (lineIndex: number, value: string) => {
    const parsed = Number.parseInt(value, 10);
    const next = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), remaining[lineIndex]) : 0;
    setQuantities((current) => ({ ...current, [lineIndex]: next }));
    if (includeDeliveryFee) setIncludeDeliveryFee(false);
  };

  const selectAllRemaining = () => {
    setQuantities(Object.fromEntries(remaining.map((quantity, lineIndex) => [lineIndex, quantity])));
    setIncludeDeliveryFee(order.deliveryFee > 0);
  };

  const handleSubmit = () => {
    if (!canSubmit || isSubmitting) return;
    setShowConfirm(true);
  };

  const executeRefund = async () => {
    if (!canSubmit || isSubmitting) return;
    const input: CreateAdminOrderRefundInput = {
      idempotencyKey: idempotencyKey ?? globalThis.crypto.randomUUID(),
      reason: reason.trim(),
      includeDeliveryFee: includeDeliveryFee && canIncludeDeliveryFee,
      items: selectedItems,
    };
    try {
      setShowConfirm(false);
      setIsSubmitting(true);
      setError(null);
      await createAdminOrderRefund(order.id, input);
      setIdempotencyKey(null);
      setQuantities({});
      setIncludeDeliveryFee(false);
      await loadRefunds();
      await onUpdate();
    } catch (submitError) {
      const message = refundErrorMessage(submitError);
      setError(message);
      await loadRefunds();
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <FormSection
      title={
        <div className="flex items-center gap-2">
          <RotateCcw className="h-5 w-5" /> 상품별 환불 처리
        </div>
      }
      description="환불 수량과 결제사 잔액을 대조한 뒤 선택 상품의 재고를 함께 복원합니다."
    >
      {error && (
        <div role="alert" className="rounded-md border border-[#A65348] bg-[#FBFAF7] px-4 py-3 text-[13px] leading-relaxed text-[#A65348]">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-[13px] text-gray-400">환불 이력을 불러오는 중입니다...</p>
      ) : (
        <>
          {order.paymentStatus !== '결제완료' ? (
            <p className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-[13px] text-gray-500">
              현재 결제 상태에서는 추가 환불을 실행할 수 없습니다.
            </p>
          ) : !order.paymentKey ? (
            <p className="rounded-md border border-[#DED8CC] bg-[#FBFAF7] px-4 py-3 text-[13px] leading-relaxed text-gray-600">
              무통장입금 주문은 자동 환불을 지원하지 않습니다. 실제 환불을 별도로 처리한 뒤 이 화면에는 상태를 직접 기록하지 마세요.
            </p>
          ) : order.deliveryStatus === '배송중' || order.deliveryStatus === '배송완료' ? (
            <p className="rounded-md border border-[#DED8CC] bg-[#FBFAF7] px-4 py-3 text-[13px] leading-relaxed text-gray-600">
              배송이 시작된 주문은 상품 회수 확인 후 별도 환불 절차로 처리해야 합니다.
            </p>
          ) : (
            <div className="space-y-5">
              <div className="overflow-hidden rounded-md border border-gray-200">
                <div className="hidden grid-cols-[minmax(0,1fr)_auto_auto] gap-3 bg-gray-50 px-4 py-3 text-[12px] font-semibold text-gray-500 sm:grid">
                  <span>상품</span>
                  <span>잔여 수량</span>
                  <span className="text-right">환불 수량</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {order.items.map((item, lineIndex) => (
                    <div key={`${item.productId}-${lineIndex}`} className="grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
                      <div className="min-w-0">
                        <p className="break-words text-[13px] font-medium text-[#17201B]">{item.productName}</p>
                        <p className="mt-1 text-[12px] text-gray-500">
                          {item.optionName ? `${item.optionName} · ` : ''}{formatPrice(item.price)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-3 sm:contents">
                        <span className="text-[13px] text-gray-600">
                          <span className="sm:hidden">잔여 수량 </span>{remaining[lineIndex]}개
                        </span>
                        <label className="flex items-center gap-2 text-[12px] text-gray-500 sm:block">
                          <span className="sm:sr-only">환불 수량</span>
                          <input
                            aria-label={`${item.productName} 환불 수량`}
                            type="number"
                            min={0}
                            max={remaining[lineIndex]}
                            value={quantities[lineIndex] ?? 0}
                            onChange={(event) => handleQuantityChange(lineIndex, event.target.value)}
                            disabled={remaining[lineIndex] === 0}
                            className="min-h-11 w-24 rounded-md border border-gray-300 px-2 py-2 text-right text-[13px] disabled:bg-gray-100 disabled:text-gray-400"
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={selectAllRemaining}
                  className="min-h-11 rounded-md border border-[#C9C8C0] bg-white px-3 py-2 text-[12px] font-medium text-[#2F3B34] hover:bg-[#F4F2EC]"
                >
                  잔여 상품 전체 선택
                </button>
                <span className="text-[13px] text-gray-500">상품 환불액 {formatPrice(selectedAmount)}</span>
              </div>

              <label className="flex min-h-11 items-start gap-3 rounded-md border border-gray-200 bg-[#FBFAF7] px-4 py-3 text-[13px]">
                <input
                  type="checkbox"
                  checked={includeDeliveryFee}
                  onChange={(event) => setIncludeDeliveryFee(event.target.checked)}
                  disabled={!canIncludeDeliveryFee}
                  className="mt-0.5 h-4 w-4 accent-[#2F3B34]"
                />
                <span>
                  <span className="block font-medium text-[#17201B]">배송비 {formatPrice(order.deliveryFee)} 포함</span>
                  <span className="mt-1 block text-[12px] text-gray-500">
                    잔여 상품을 모두 환불할 때만 배송비를 한 번 환불할 수 있습니다.
                  </span>
                </span>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold text-gray-600">환불 사유</span>
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  maxLength={200}
                  rows={2}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-[13px] focus:border-[#2F3B34] focus:outline-none focus:ring-1 focus:ring-[#2F3B34]"
                />
              </label>

              <div className="flex items-center justify-between gap-3 border-t border-gray-200 pt-4">
                <div>
                  <span className="block text-[12px] text-gray-500">이번 환불 예정 금액</span>
                  <strong className="mt-1 block text-[18px] text-[#17201B]">{formatPrice(requestAmount)}</strong>
                </div>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit || isSubmitting}
                  className="min-h-11 rounded-md bg-[#2F3B34] px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#17201B] disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {isSubmitting ? '환불 처리 중...' : allSelected ? '잔여 금액 전액 환불' : '선택 상품 환불'}
                </button>
              </div>
            </div>
          )}

          <div className="border-t border-gray-200 pt-5">
            <h4 className="text-[13px] font-semibold text-[#17201B]">환불 처리 이력</h4>
            {refunds.length === 0 ? (
              <p className="mt-3 text-[13px] text-gray-400">아직 처리된 환불이 없습니다.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {refunds.map((refund) => (
                  <div key={refund.id} className="rounded-md border border-gray-200 px-3 py-3 text-[12px]">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-[#17201B]">{refundStatusLabel(refund.status)}</span>
                      <span className="text-gray-500">{formatDate(refund.createdAt)}</span>
                    </div>
                    <div className="mt-2 flex items-start justify-between gap-3 text-gray-600">
                      <span className="min-w-0 break-words">{refund.reason}</span>
                      <span className="shrink-0 font-semibold text-[#17201B]">{formatPrice(historyAmount(refund))}</span>
                    </div>
                    {refund.errorMessage && (
                      <p className="mt-2 leading-relaxed text-[#A65348]">{refund.errorMessage}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
      </FormSection>
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17201B]/40 p-4" role="presentation">
          <div
            ref={confirmDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="refund-confirm-title"
            aria-describedby="refund-confirm-description"
            className="w-full max-w-md rounded-md border border-[#DED8CC] bg-[#FBFAF7] p-5 shadow-xl"
          >
            <h3 id="refund-confirm-title" className="text-[16px] font-semibold text-[#17201B]">
              환불 내용을 확인하세요
            </h3>
            <p id="refund-confirm-description" className="mt-2 text-[13px] leading-relaxed text-gray-600">
              선택한 수량만 환불되고 해당 상품 재고가 복원됩니다. 이 작업은 결제사에 실제 환불 요청을 보냅니다.
            </p>
            <div className="mt-4 space-y-2 rounded-md border border-[#DED8CC] bg-white px-3 py-3 text-[13px]">
              {selectedItems.length === 0 ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-600">배송비</span>
                  <span className="font-medium text-[#17201B]">{formatPrice(order.deliveryFee)}</span>
                </div>
              ) : (
                selectedItems.map((selected) => (
                  <div key={selected.lineIndex} className="flex items-center justify-between gap-3">
                    <span className="min-w-0 break-words text-gray-600">
                      {order.items[selected.lineIndex].productName} × {selected.quantity}
                    </span>
                    <span className="shrink-0 font-medium text-[#17201B]">
                      {formatPrice(order.items[selected.lineIndex].price * selected.quantity)}
                    </span>
                  </div>
                ))
              )}
              {includeDeliveryFee && canIncludeDeliveryFee && (
                <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-2">
                  <span className="text-gray-600">배송비</span>
                  <span className="font-medium text-[#17201B]">{formatPrice(order.deliveryFee)}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-3 border-t border-gray-200 pt-3">
                <span className="font-semibold text-[#17201B]">환불 예정 금액</span>
                <span className="text-[16px] font-bold text-[#17201B]">{formatPrice(requestAmount)}</span>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={isSubmitting}
                ref={confirmCancelButtonRef}
                className="min-h-11 rounded-md border border-[#C9C8C0] bg-white px-4 py-2 text-[13px] font-medium text-[#17201B] hover:bg-[#F4F2EC] disabled:cursor-not-allowed disabled:text-gray-400"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void executeRefund()}
                disabled={isSubmitting}
                className="min-h-11 rounded-md bg-[#2F3B34] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#17201B] disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {isSubmitting ? '환불 처리 중...' : '환불 실행'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
