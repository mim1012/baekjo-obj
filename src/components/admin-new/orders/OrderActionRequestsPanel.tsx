'use client';

import { useCallback, useEffect, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import {
  AdminActionRequestConflictError,
  getAdminOrderActionRequests,
  getPublicBrands,
  transitionAdminOrderActionRequest,
} from '@/lib/storage';
import { formatDate, formatPrice } from '@/lib/format';
import type { OrderActionRequestItemStatus, OrderActionRequestRecord } from '@/lib/orders/actionRequests';
import type { Brand, Order } from '@/types';
import FormSection from '@/components/admin-new/common/FormSection';

interface OrderActionRequestsPanelProps {
  order: Order;
  onUpdate?: () => void | Promise<void>;
}

type ActionRequestAction = 'approve' | 'reject' | 'complete';

const REQUEST_STATUS_LABEL: Record<OrderActionRequestRecord['status'], string> = {
  REQUESTED: '접수', APPROVED: '승인', REJECTED: '반려', COMPLETED: '완료',
};

// 아이템(라인) 상태 배지 — 요청 레벨 라벨과 값 집합은 같지만 뱃지는 상태별로 색을 구분한다.
const ITEM_STATUS_LABEL: Record<OrderActionRequestItemStatus, string> = REQUEST_STATUS_LABEL;
const ITEM_STATUS_BADGE_STYLE: Record<OrderActionRequestItemStatus, string> = {
  REQUESTED: 'bg-[#F2EEE5] text-[#68716C]',
  APPROVED: 'bg-[#E4ECE6] text-[#2F3B34]',
  REJECTED: 'bg-[#F7E3DF] text-[#A65348]',
  COMPLETED: 'bg-[#2F3B34] text-white',
};

// 미결제(결제대기·입금대기) 주문은 부분완료가 SQL에서 거부된다(ACTION_UNPAID_PARTIAL_NOT_SUPPORTED,
// 0170 complete_action_request_and_restore) — 서버 message에 이 문구를 덧붙여 왜 막혔는지
// 관리자가 곧바로 이해하게 한다.
const UNPAID_PARTIAL_HINT = '결제 전 주문은 전량 취소만 완료할 수 있습니다';

export default function OrderActionRequestsPanel({ order, onUpdate }: OrderActionRequestsPanelProps) {
  const [requests, setRequests] = useState<OrderActionRequestRecord[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState<{ requestId: string; message: string } | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getAdminOrderActionRequests(order.id)
      .then((rows) => {
        if (!active) return;
        setRequests(rows);
        setLoadError(false);
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, [order.id]);

  useEffect(() => {
    void getPublicBrands().then(setBrands).catch(() => setBrands([]));
  }, []);

  const brandLabel = (brandId: string) => brands.find((brand) => brand.id === brandId)?.name ?? brandId;

  const runAction = useCallback(
    async (requestId: string, action: ActionRequestAction) => {
      // 취소완료는 재고 복원/환불 정산을 동반하는 되돌리기 어려운 처리라 한 번 더 확인한다
      // (OrderStatusPanel의 취소완료 확인창과 같은 톤).
      if (
        action === 'complete' &&
        !window.confirm('완료로 처리하면 재고 복원/환불 정산이 실행되며 되돌릴 수 없습니다. 계속하시겠습니까?')
      ) {
        return;
      }
      setPendingId(requestId);
      setActionError(null);
      try {
        const updated = await transitionAdminOrderActionRequest(order.id, requestId, action);
        setRequests(updated);
        await onUpdate?.();
      } catch (error) {
        if (error instanceof AdminActionRequestConflictError) {
          const hint = error.code === 'ACTION_UNPAID_PARTIAL_NOT_SUPPORTED' ? ` ${UNPAID_PARTIAL_HINT}` : '';
          setActionError({ requestId, message: `${error.message}${hint}` });
        } else {
          setActionError({ requestId, message: '요청 처리에 실패했습니다. 잠시 후 다시 시도하세요.' });
        }
      } finally {
        setPendingId(null);
      }
    },
    [order.id, onUpdate],
  );

  return (
    <FormSection
      title={<div className="flex items-center gap-2"><ClipboardList className="h-5 w-5" /> 브랜드별 취소·환불 요청</div>}
      description="상품·수량 단위로 접수된 요청을 승인·반려하고, 승인된 요청을 완료 처리하세요."
    >
      {loadError ? (
        <p className="text-[13px] text-[#A65348]">요청 이력을 불러오지 못했습니다.</p>
      ) : requests.length === 0 ? (
        <p className="text-[13px] text-gray-400">접수된 브랜드별 요청이 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => {
            const isPending = pendingId === request.id;
            return (
              <div key={request.id} className="rounded-md border border-gray-200 bg-[#FBFAF7] px-4 py-3 text-[13px]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong>{request.requestType === 'CANCEL' ? '취소 요청' : '환불 요청'} · {brandLabel(request.brandId)}</strong>
                  <span className="text-gray-500">{formatDate(request.createdAt)}</span>
                </div>
                <div className="mt-2 space-y-1">
                  {request.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 text-gray-600">
                      <span className="min-w-0 truncate">
                        {item.productName}
                        {item.optionName ? ` (${item.optionName})` : ''} × {item.quantity}개
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${ITEM_STATUS_BADGE_STYLE[item.status]}`}
                      >
                        {ITEM_STATUS_LABEL[item.status]}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex justify-between gap-3 text-gray-600">
                  <span>{request.reason}</span>
                  <span className="font-semibold text-[#17201B]">
                    {formatPrice(request.requestedAmount)} · {REQUEST_STATUS_LABEL[request.status]}
                  </span>
                </div>
                {actionError && actionError.requestId === request.id && (
                  <p
                    role="alert"
                    className="mt-2 rounded-md border border-[#A65348]/30 bg-[#FBEFEC] px-3 py-2 text-[12px] leading-relaxed text-[#A65348]"
                  >
                    {actionError.message}
                  </p>
                )}
                {(request.status === 'REQUESTED' || request.status === 'APPROVED') && (
                  <div className="mt-3 flex justify-end gap-2">
                    {request.status === 'REQUESTED' && (
                      <>
                        <button
                          type="button"
                          onClick={() => void runAction(request.id, 'approve')}
                          disabled={isPending}
                          className="min-h-9 rounded-md bg-[#2F3B34] px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-[#17201B] disabled:cursor-not-allowed disabled:bg-gray-300"
                        >
                          {isPending ? '처리 중...' : '승인'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void runAction(request.id, 'reject')}
                          disabled={isPending}
                          className="min-h-9 rounded-md border border-[#C9C8C0] bg-white px-3 py-1.5 text-[12px] font-medium text-[#17201B] transition-colors hover:bg-[#F4F2EC] disabled:cursor-not-allowed disabled:text-gray-400"
                        >
                          {isPending ? '처리 중...' : '반려'}
                        </button>
                      </>
                    )}
                    {request.status === 'APPROVED' && (
                      <button
                        type="button"
                        onClick={() => void runAction(request.id, 'complete')}
                        disabled={isPending}
                        className="min-h-9 rounded-md bg-[#2F3B34] px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-[#17201B] disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        {isPending ? '처리 중...' : '완료'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </FormSection>
  );
}
