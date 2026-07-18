'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FileText, CreditCard, Truck, RefreshCcw, Wallet, X } from 'lucide-react';
import { getAllOrders, updateOrderStatus, getAdminBrands } from '@/lib/storage';
import { useMounted } from '@/lib/useMounted';
import PageHeader from '@/components/admin-new/common/PageHeader';
import SummaryStrip from '@/components/admin-new/common/SummaryStrip';
import Pagination from '@/components/admin-new/common/Pagination';
import LoadingState from '@/components/admin-new/common/LoadingState';
import ErrorState from '@/components/admin-new/common/ErrorState';
import OrderFilters from './OrderFilters';
import OrderFunnelTabs, { type FunnelTab } from './OrderFunnelTabs';
import OrderDataTable from './OrderDataTable';
import OrderMobileCard from './OrderMobileCard';
import { deriveFunnelStage, stageCounts } from './orderFunnel';
import { DEPOSIT_CONFIRM_UPDATE, type OrderStatusUpdate } from './DepositConfirmButton';
import { orderUpdateErrorMessage, summarizeBulkFailures } from './orderUpdateErrorMessage';
import { matchesOrderSearch } from './orderSearch';
import type { Brand, Order } from '@/types';

export default function OrderListPage() {
  const mounted = useMounted();
  const [orders, setOrders] = useState<Order[]>([]);
  const [brandMap, setBrandMap] = useState<Record<string, Brand>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [savingOrderIds, setSavingOrderIds] = useState<Set<string>>(new Set());

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<FunnelTab>('전체');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkRunning, setBulkRunning] = useState(false);

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
      // 브랜드 맵은 발송처리 팝오버의 기본 택배사·업체명 프리필용 — 실패해도 목록은 뜬다.
      const [, brands] = await Promise.all([
        loadOrders(),
        getAdminBrands().catch(() => [] as Brand[]),
      ]);
      setBrandMap(Object.fromEntries(brands.map((b) => [b.id, b])));
    })();
  }, [loadOrders]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    loadOrders();
  }, [loadOrders]);

  // 입금확인(단건) — 결제상태만 '결제완료'로 낙관적 전이 후 서버 반영, 실패 시 롤백.
  const handleDepositConfirm = useCallback(async (id: string, updates: OrderStatusUpdate) => {
    const previousOrder = orders.find((order) => order.id === id);
    if (!previousOrder) return;

    setSavingOrderIds((prev) => new Set(prev).add(id));
    setOrders((prev) => prev.map((order) => (order.id === id ? { ...order, ...updates } : order)));

    try {
      await updateOrderStatus(id, updates);
      await loadOrders();
    } catch (error) {
      // 재조회하지 않는다 — getAllOrders()는 네트워크/HTTP 실패를 삼키고 []를 반환하므로,
      // PATCH와 재조회가 함께 실패하면 롤백해 둔 목록이 빈 화면으로 덮인다. 롤백 + alert만 한다.
      setOrders((prev) => prev.map((order) => (order.id === id ? previousOrder : order)));
      alert(orderUpdateErrorMessage(error));
    } finally {
      setSavingOrderIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [loadOrders, orders]);

  // 검색만 먼저 적용(탭 카운트는 검색 범위 기준으로 센다).
  const searchedOrders = useMemo(() => {
    let result = [...orders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((o) => matchesOrderSearch(o, term));
    }
    return result;
  }, [orders, searchTerm]);

  const counts = useMemo(() => stageCounts(searchedOrders), [searchedOrders]);

  // 탭(진행 단계)이 1차 필터.
  const filteredOrders = useMemo(() => {
    if (activeTab === '전체') return searchedOrders;
    return searchedOrders.filter((o) => deriveFunnelStage(o) === activeTab);
  }, [searchedOrders, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ITEMS_PER_PAGE));
  const paginatedOrders = useMemo(() => {
    return filteredOrders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [filteredOrders, currentPage, ITEMS_PER_PAGE]);

  // 일괄 입금확인은 입금대기 탭에서만 제공한다(발송대기는 송장이 주문별 입력이라 일괄 불가 → 선택 자체를 끈다).
  const selectable = activeTab === '입금대기';

  const resetSelectionAndPage = useCallback(() => {
    setSelectedIds([]);
    setCurrentPage(1);
  }, []);

  const handleSearchChange = useCallback((val: string) => {
    setSearchTerm(val);
    resetSelectionAndPage();
  }, [resetSelectionAndPage]);

  const handleTabChange = useCallback((tab: FunnelTab) => {
    setActiveTab(tab);
    resetSelectionAndPage();
  }, [resetSelectionAndPage]);

  // 페이지 이동 시 선택을 초기화한다. 선택이 페이지를 넘어 유지되면 화면에 없는 행을 일괄
  // 입금확인하게 되고(운영 무결성), DataTable 헤더 체크박스 표시도 어긋난다 — 탭/검색 변경과 동일하게 초기화.
  const handlePageChange = useCallback((page: number) => {
    setSelectedIds([]);
    setCurrentPage(page);
  }, []);

  const handleSelect = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  }, []);

  // 전체선택 범위는 현재 페이지(DataTable 헤더 체크박스 상태와 일치시키기 위함).
  const handleSelectAll = useCallback((checked: boolean) => {
    setSelectedIds(checked ? paginatedOrders.map((o) => o.id) : []);
  }, [paginatedOrders]);

  // 일괄 입금확인 — 같은 입금확인 경로를 순차 호출하고 성공/실패를 집계해 요약을 보여준다.
  const handleBulkDepositConfirm = useCallback(async () => {
    if (selectedIds.length === 0) return;
    const confirmed = window.confirm(
      `선택한 ${selectedIds.length}건의 입금을 확인 처리하시겠습니까?\n\n` +
        `· 각 주문의 결제상태가 '결제완료'로 변경됩니다(주문상태는 그대로).\n\n` +
        `⚠️ 확인 후에는 미결제 취소로 재고가 자동 복원되지 않습니다. 실제 입금을 확인한 뒤 진행하세요.`
    );
    if (!confirmed) return;

    const targets = [...selectedIds];
    setBulkRunning(true);
    setSavingOrderIds(new Set(targets));

    let success = 0;
    const failed: { id: string; code: string }[] = [];
    for (const id of targets) {
      try {
        await updateOrderStatus(id, DEPOSIT_CONFIRM_UPDATE);
        success += 1;
      } catch (error) {
        failed.push({ id, code: error instanceof Error ? error.message : '' });
      }
    }

    await loadOrders();
    setSelectedIds([]);
    setSavingOrderIds(new Set());
    setBulkRunning(false);

    if (failed.length === 0) {
      alert(`${success}건 모두 입금확인 완료했습니다.`);
    } else {
      alert(summarizeBulkFailures(targets.length, success, failed));
    }
  }, [selectedIds, loadOrders]);

  const handleDepositPendingClick = useCallback(() => {
    setSearchTerm('');
    setActiveTab('입금대기');
    resetSelectionAndPage();
  }, [resetSelectionAndPage]);

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
        <OrderFunnelTabs
          active={activeTab}
          counts={counts}
          totalCount={searchedOrders.length}
          onChange={handleTabChange}
        />

        <OrderFilters searchTerm={searchTerm} onSearchChange={handleSearchChange} />

        {/* 일괄 입금확인 바 — 입금대기 탭에서 1건 이상 선택 시 노출. */}
        {selectable && selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#2F3B34]/20 bg-[#F4F2EC] px-4 py-3">
            <span className="text-[14px] font-medium text-[#17201B]">
              {selectedIds.length}건 선택됨
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBulkDepositConfirm}
                disabled={bulkRunning}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#2F3B34] px-4 py-1.5 text-[13px] font-medium text-white hover:bg-[#232B25] disabled:cursor-wait disabled:bg-gray-300"
              >
                <Wallet className="w-4 h-4" />
                {bulkRunning ? '처리 중...' : `선택 ${selectedIds.length}건 입금확인`}
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                disabled={bulkRunning}
                className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-[13px] font-medium text-gray-600 hover:bg-white disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" /> 선택 해제
              </button>
            </div>
          </div>
        )}

        {/* PC Table View */}
        <div className="hidden md:block">
          <OrderDataTable
            orders={paginatedOrders}
            isLoading={loading}
            savingOrderIds={savingOrderIds}
            onDepositConfirm={handleDepositConfirm}
            brandMap={brandMap}
            onShipped={loadOrders}
            selectable={selectable}
            selectedIds={selectedIds}
            onSelect={handleSelect}
            onSelectAll={handleSelectAll}
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
                onDepositConfirm={handleDepositConfirm}
                brandMap={brandMap}
                onShipped={loadOrders}
              />
            ))
          )}
        </div>

        {filteredOrders.length > 0 && (
          <div className="pt-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
