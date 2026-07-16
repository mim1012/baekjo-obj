'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FileText, CreditCard, Truck, RefreshCcw, Wallet } from 'lucide-react';
import { getAllOrders, updateOrderStatus } from '@/lib/storage';
import { useMounted } from '@/lib/useMounted';
import PageHeader from '@/components/admin-new/common/PageHeader';
import SummaryStrip from '@/components/admin-new/common/SummaryStrip';
import Pagination from '@/components/admin-new/common/Pagination';
import LoadingState from '@/components/admin-new/common/LoadingState';
import ErrorState from '@/components/admin-new/common/ErrorState';
import OrderFilters from './OrderFilters';
import OrderDataTable from './OrderDataTable';
import OrderMobileCard from './OrderMobileCard';
import type { Order } from '@/types';
import type { OrderInlineStatusUpdate } from './OrderInlineStatusControls';

export default function OrderListPage() {
  const mounted = useMounted();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [savingOrderIds, setSavingOrderIds] = useState<Set<string>>(new Set());

  const [searchTerm, setSearchTerm] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('전체');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('전체');
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState('전체');

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const loadOrders = useCallback(async () => {
    try {
      const list = await getAllOrders();
      setOrders(list);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await loadOrders();
    })();
  }, [loadOrders]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    loadOrders();
  }, [loadOrders]);
  const handleInlineStatusChange = useCallback(async (id: string, updates: OrderInlineStatusUpdate) => {
    const previousOrder = orders.find((order) => order.id === id);
    if (!previousOrder) return;

    setSavingOrderIds((prev) => new Set(prev).add(id));
    setOrders((prev) => prev.map((order) => (
      order.id === id ? { ...order, ...updates } : order
    )));

    try {
      await updateOrderStatus(id, updates);
      await loadOrders();
    } catch {
      setOrders((prev) => prev.map((order) => (
        order.id === id ? previousOrder : order
      )));
      alert('주문 상태 변경에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setSavingOrderIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [loadOrders, orders]);

  const filteredOrders = useMemo(() => {
    let result = [...orders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (o) =>
          o.id.toLowerCase().includes(term) ||
          o.customerName.toLowerCase().includes(term) ||
          o.phone.includes(term) ||
          o.items.some((item) => item.productName.toLowerCase().includes(term))
      );
    }

    if (orderStatusFilter !== '전체') {
      result = result.filter((o) => o.orderStatus === orderStatusFilter);
    }
    if (paymentStatusFilter !== '전체') {
      result = result.filter((o) => o.paymentStatus === paymentStatusFilter);
    }
    if (deliveryStatusFilter !== '전체') {
      result = result.filter((o) => o.deliveryStatus === deliveryStatusFilter);
    }

    return result;
  }, [orders, searchTerm, orderStatusFilter, paymentStatusFilter, deliveryStatusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ITEMS_PER_PAGE));
  const paginatedOrders = useMemo(() => {
    return filteredOrders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [filteredOrders, currentPage, ITEMS_PER_PAGE]);

  const handleSearchChange = useCallback((val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  }, []);

  const handleOrderStatusChange = useCallback((val: string) => {
    setOrderStatusFilter(val);
    setCurrentPage(1);
  }, []);

  const handlePaymentStatusChange = useCallback((val: string) => {
    setPaymentStatusFilter(val);
    setCurrentPage(1);
  }, []);

  const handleDeliveryStatusChange = useCallback((val: string) => {
    setDeliveryStatusFilter(val);
    setCurrentPage(1);
  }, []);

  if (!mounted) return null;

  if (loading && orders.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="주문 관리" description="고객 주문 내역을 조회하고 상태를 관리합니다." />
        <LoadingState message="주문 목록을 불러오는 중입니다..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="주문 관리" description="고객 주문 내역을 조회하고 상태를 관리합니다." />
        <ErrorState
          title="데이터를 불러오지 못했습니다"
          message={error.message || '알 수 없는 오류가 발생했습니다.'}
          onRetry={handleRetry}
        />
      </div>
    );
  }

  const totalCount = orders.length;
  const paymentCompletedCount = orders.filter((o) => o.paymentStatus === '결제완료').length;
  const depositPendingCount = orders.filter((o) => o.paymentStatus === '입금대기').length;
  const shippingCount = orders.filter((o) => o.deliveryStatus === '배송중').length;
  const canceledCount = orders.filter((o) => o.orderStatus === '취소완료' || o.orderStatus === '환불완료').length;

  const handleDepositPendingClick = () => {
    setPaymentStatusFilter('입금대기');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="주문 관리" 
        description="접수부터 결제, 배송, 취소까지 고객 주문의 전체 흐름을 관리합니다." 
      />

      <SummaryStrip
        items={[
          { label: '전체 주문', value: totalCount, icon: FileText },
          { label: '결제 완료', value: paymentCompletedCount, icon: CreditCard, highlight: true },
          { label: '입금 대기', value: depositPendingCount, icon: Wallet, highlight: true, onClick: handleDepositPendingClick },
          { label: '배송 중', value: shippingCount, icon: Truck },
          { label: '취소·환불', value: canceledCount, icon: RefreshCcw, highlight: true },
        ]}
      />

      <div className="space-y-4">
        <OrderFilters
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          orderStatus={orderStatusFilter}
          onOrderStatusChange={handleOrderStatusChange}
          paymentStatus={paymentStatusFilter}
          onPaymentStatusChange={handlePaymentStatusChange}
          deliveryStatus={deliveryStatusFilter}
          onDeliveryStatusChange={handleDeliveryStatusChange}
        />

        {/* PC Table View */}
        <div className="hidden md:block">
          <OrderDataTable
            orders={paginatedOrders}
            isLoading={loading}
            savingOrderIds={savingOrderIds}
            onStatusChange={handleInlineStatusChange}
          />
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {paginatedOrders.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-md p-8 text-center text-gray-500 text-[14px]">
              검색 결과가 없습니다.
            </div>
          ) : (
            paginatedOrders.map((order) => (
              <OrderMobileCard
                key={order.id}
                order={order}
                saving={savingOrderIds.has(order.id)}
                onStatusChange={handleInlineStatusChange}
              />
            ))
          )}
        </div>

        {filteredOrders.length > 0 && (
          <div className="pt-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
