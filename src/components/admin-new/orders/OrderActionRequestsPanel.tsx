'use client';

import { useCallback, useEffect, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { getAdminOrderActionRequests, getPublicBrands, updateAdminOrderActionRequest } from '@/lib/storage';
import { formatDate, formatPrice } from '@/lib/format';
import type { OrderActionRequestItemStatus, OrderActionRequestRecord } from '@/lib/orders/actionRequests';
import type { Brand, Order } from '@/types';
import FormSection from '@/components/admin-new/common/FormSection';

interface OrderActionRequestsPanelProps {
  order: Order;
  onUpdate: () => void | Promise<void>;
}

type ActionRequestAction = 'approve' | 'reject' | 'complete';

const REQUEST_STATUS_LABEL: Record<OrderActionRequestRecord['status'], string> = {
  REQUESTED: '취소요청', APPROVED: '취소승인', REJECTED: '취소반려', COMPLETED: '취소완료',
};

const ITEM_STATUS_LABEL: Record<OrderActionRequestItemStatus, string> = {
  REQUESTED: '취소요청', APPROVED: '취소승인', REJECTED: '취소반려', COMPLETED: '취소완료',
};

function actionErrorMessage(error: unknown): string {
  const code = error instanceof Error ? error.message : '';
  switch (code) {
    case 'action-request-manual-refund-required':
      return '무통장입금 주문은 자동 취소완료할 수 없습니다. 실제 환불을 처리한 뒤 진행하세요.';
    case 'action-request-refund-not-settled':
      return '해당 수량의 환불이 아직 완료되지 않았습니다. 먼저 상품별 환불 처리에서 환불을 완료하세요.';
    case 'action-request-invalid-transition':
      return '현재 상태에서는 처리할 수 없습니다. 새로고침 후 다시 시도하세요.';
    default:
      return '요청 처리에 실패했습니다. 잠시 후 다시 시도하세요.';
  }
}

export default function OrderActionRequestsPanel({ order, onUpdate }: OrderActionRequestsPanelProps) {
  const [requests, setRequests] = useState<OrderActionRequestRecord[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    try {
      const rows = await getAdminOrderActionRequests(order.id);
      setRequests(rows);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, [order.id]);

  // setState를 effect 본문에서 동기 호출하지 않도록(react-hooks/set-state-in-effect) 마운트 로드는
  // active 가드가 붙은 인라인 fetch로 처리한다. loadRequests(useCallback)는 액션 후 재조회 전용.
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

  const runAction = async (requestId: string, action: ActionRequestAction) => {
    if (action === 'complete' && !window.confirm('취소완료로 처리하면 재고 복원/환불 정산이 실행되며 되돌릴 수 없습니다. 계속하시겠습니까?')) {
      return;
    }
    setPendingId(requestId);
    setError(null);
    try {
      await updateAdminOrderActionRequest(order.id, requestId, action);
      await loadRequests();
      await onUpdate();
    } catch (submitError) {
      setError(actionErrorMessage(submitError));
    } finally {
      setPendingId(null);
    }
  };

  return (
    <FormSection
      title={<div className="flex items-center gap-2"><ClipboardList className="h-5 w-5" /> 브랜드별 취소·환불 요청</div>}
      description="상품/수량 단위로 접수된 요청을 승인·반려하고, 승인된 요청을 취소완료로 처리하세요."
    >
      {error && (
        <div role="alert" className="rounded-md border border-[#A65348] bg-[#FBFAF7] px-4 py-3 text-[13px] leading-relaxed text-[#A65348]">
          {error}
        </div>
      )}
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
                      <span className="min-w-0 truncate">{item.productName} × {item.quantity}개</span>
                      <span className="shrink-0 font-medium text-[#17201B]">{ITEM_STATUS_LABEL[item.status]}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex justify-between gap-3 text-gray-600">
                  <span>{request.reason}</span>
                  <span className="font-semibold text-[#17201B]">{formatPrice(request.requestedAmount)} · {REQUEST_STATUS_LABEL[request.status]}</span>
                </div>
                {(request.status === 'REQUESTED' || request.status === 'APPROVED') && (
                  <div className="mt-3 flex justify-end gap-2">
                    {request.status === 'REQUESTED' && (
                      <button
                        type="button"
                        onClick={() => void runAction(request.id, 'approve')}
                        disabled={isPending}
                        className="min-h-9 rounded-md bg-[#2F3B34] px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-[#17201B] disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        {isPending ? '처리 중...' : '승인'}
                      </button>
                    )}
                    {request.status === 'APPROVED' && (
                      <button
                        type="button"
                        onClick={() => void runAction(request.id, 'complete')}
                        disabled={isPending}
                        className="min-h-9 rounded-md bg-[#2F3B34] px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-[#17201B] disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        {isPending ? '처리 중...' : '취소완료'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void runAction(request.id, 'reject')}
                      disabled={isPending}
                      className="min-h-9 rounded-md border border-[#C9C8C0] bg-white px-3 py-1.5 text-[12px] font-medium text-[#17201B] transition-colors hover:bg-[#F4F2EC] disabled:cursor-not-allowed disabled:text-gray-400"
                    >
                      {isPending ? '처리 중...' : '반려'}
                    </button>
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
