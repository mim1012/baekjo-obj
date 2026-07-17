'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, MapPin, Package, CreditCard } from 'lucide-react';
import { getOrderById } from '@/lib/storage';
import { useMounted } from '@/lib/useMounted';
import { formatDate, formatPrice } from '@/lib/format';
import type { Order } from '@/types';
import PageHeader from '@/components/admin-new/common/PageHeader';
import LoadingState from '@/components/admin-new/common/LoadingState';
import ErrorState from '@/components/admin-new/common/ErrorState';
import FormSection from '@/components/admin-new/common/FormSection';
import OrderStatusPanel from './OrderStatusPanel';
import OrderShipmentsPanel from './OrderShipmentsPanel';

interface OrderDetailPageProps {
  id: string;
}

export default function OrderDetailPage({ id }: OrderDetailPageProps) {
  const router = useRouter();
  const mounted = useMounted();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadOrder = useCallback(async () => {
    try {
      // getOrderById handles fetching the order (via API or mock)
      const data = await getOrderById(id);
      if (!data) throw new Error('주문 정보를 찾을 수 없습니다.');
      setOrder(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    (async () => {
      await loadOrder();
    })();
  }, [loadOrder]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    loadOrder();
  }, [loadOrder]);

  if (!mounted) return null;

  if (loading && !order) {
    return <LoadingState message="주문 상세 정보를 불러오는 중입니다..." />;
  }

  if (error || !order) {
    return (
      <ErrorState
        title="주문을 불러오지 못했습니다"
        message={error?.message || '주문 정보가 존재하지 않습니다.'}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-4 mb-2">
        <button
          onClick={() => router.push('/admin/orders')}
          className="p-2 -ml-2 text-gray-500 hover:text-gray-900 transition-colors"
          title="목록으로 돌아가기"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <PageHeader 
          title={`주문 상세: ${order.id}`}
          description={`주문일: ${formatDate(order.createdAt)}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <FormSection
            title={<div className="flex items-center gap-2"><Package className="w-5 h-5" /> 주문 상품 정보</div>}
            description="주문한 상품 및 수량 내역"
          >
            <div className="border border-gray-200 rounded-md overflow-hidden">
              <table className="w-full text-left text-[14px]">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-medium">
                  <tr>
                    <th className="px-4 py-3">상품명</th>
                    <th className="px-4 py-3">옵션</th>
                    <th className="px-4 py-3 text-right">수량</th>
                    <th className="px-4 py-3 text-right">결제금액</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {order.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3 font-medium text-[#17201B]">{item.productName}</td>
                      <td className="px-4 py-3 text-gray-500">{item.optionName || '-'}</td>
                      <td className="px-4 py-3 text-right">{item.quantity}개</td>
                      <td className="px-4 py-3 text-right font-medium">{formatPrice(item.price * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FormSection>

          <FormSection
            title={<div className="flex items-center gap-2"><User className="w-5 h-5" /> 주문자 정보</div>}
            description="주문자 상세 정보"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[14px]">
              <div>
                <span className="block text-gray-500 mb-1">이름</span>
                <span className="font-medium text-[#17201B]">{order.customerName}</span>
              </div>
              <div>
                <span className="block text-gray-500 mb-1">연락처</span>
                <span className="font-medium text-[#17201B]">{order.phone}</span>
              </div>
            </div>
          </FormSection>

          <FormSection
            title={<div className="flex items-center gap-2"><MapPin className="w-5 h-5" /> 배송지 정보</div>}
            description="상품 수령인 및 배송지 상세"
          >
            <div className="space-y-4 text-[14px]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="block text-gray-500 mb-1">수령인 (연락처 동일)</span>
                  <span className="font-medium text-[#17201B]">{order.customerName}</span>
                </div>
              </div>
              <div>
                <span className="block text-gray-500 mb-1">주소</span>
                <span className="font-medium text-[#17201B] leading-relaxed block bg-gray-50 p-3 rounded-md border border-gray-100">
                  {order.address}
                </span>
              </div>
            </div>
          </FormSection>

          <OrderShipmentsPanel order={order} onUpdate={loadOrder} />
        </div>

        <div className="space-y-6">
          <FormSection
            title={<div className="flex items-center gap-2"><CreditCard className="w-5 h-5" /> 결제 정보</div>}
          >
            <div className="space-y-3 text-[14px]">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-gray-500">결제 수단</span>
                <span className="font-medium text-[#17201B]">{order.paymentMethod}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-gray-500">상품 금액</span>
                <span className="font-medium text-[#17201B]">{formatPrice(order.totalPrice)}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-gray-500">배송비</span>
                <span className="font-medium text-[#17201B]">{formatPrice(order.deliveryFee)}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="font-semibold text-gray-900">총 결제 금액</span>
                <span className="font-bold text-lg text-[#2F3B34]">
                  {formatPrice(order.totalPrice + order.deliveryFee)}
                </span>
              </div>
            </div>
          </FormSection>

          <OrderStatusPanel order={order} onUpdate={loadOrder} />
        </div>
      </div>
    </div>
  );
}
