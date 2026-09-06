'use client';

import { useEffect, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { getAdminOrderActionRequests, getPublicBrands } from '@/lib/storage';
import { formatDate, formatPrice } from '@/lib/format';
import type { OrderActionRequestRecord } from '@/lib/orders/actionRequests';
import type { Brand, Order } from '@/types';
import FormSection from '@/components/admin-new/common/FormSection';

export default function OrderActionRequestsPanel({ order }: { order: Order }) {
  const [requests, setRequests] = useState<OrderActionRequestRecord[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    void getAdminOrderActionRequests(order.id).then((rows) => { if (active) setRequests(rows); }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [order.id]);
  useEffect(() => {
    void getPublicBrands().then(setBrands).catch(() => setBrands([]));
  }, []);
  const brandLabel = (brandId: string) => brands.find((brand) => brand.id === brandId)?.name ?? brandId;
  const statusLabel = (status: OrderActionRequestRecord['status']) => ({
    REQUESTED: '접수', APPROVED: '승인', REJECTED: '반려', COMPLETED: '완료',
  }[status]);
  return (
    <FormSection title={<div className="flex items-center gap-2"><ClipboardList className="h-5 w-5" /> 브랜드별 취소·환불 요청</div>} description="고객이 요청한 브랜드와 상품을 확인한 뒤 전용 환불 처리에서 해당 수량을 실행하세요.">
      {error ? <p className="text-[13px] text-[#A65348]">요청 이력을 불러오지 못했습니다.</p> : requests.length === 0 ? <p className="text-[13px] text-gray-400">접수된 브랜드별 요청이 없습니다.</p> : (
        <div className="space-y-3">
          {requests.map((request) => (
            <div key={request.id} className="rounded-md border border-gray-200 bg-[#FBFAF7] px-4 py-3 text-[13px]">
              <div className="flex flex-wrap items-center justify-between gap-2"><strong>{request.requestType === 'CANCEL' ? '취소 요청' : '환불 요청'} · {brandLabel(request.brandId)}</strong><span className="text-gray-500">{formatDate(request.createdAt)}</span></div>
              <p className="mt-1 text-gray-600">{request.items.map((item) => `${item.productName} ${item.quantity}개`).join(', ')}</p>
              <div className="mt-2 flex justify-between gap-3 text-gray-600"><span>{request.reason}</span><span className="font-semibold text-[#17201B]">{formatPrice(request.requestedAmount)} · {statusLabel(request.status)}</span></div>
            </div>
          ))}
        </div>
      )}
    </FormSection>
  );
}
