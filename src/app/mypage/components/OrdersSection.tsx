'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Order, OrderItem, ProductReview, Product, Brand, Shipment, CustomerServiceRequest } from '@/types';
import { formatPrice, formatDate } from '@/lib/format';
import {
  buildReviewTargetKey,
  createCustomerServiceRequest,
  createOrderActionRequest,
  getMyCustomerServiceRequests,
  getOrderActionRequests,
  getPublicBrands,
  requestOrderCancellation,
} from '@/lib/storage';
import { groupOrderItemsByBundle, type OrderBundle } from '@/lib/shipments/timeline';
import { canReviewOrderItem } from '@/lib/reviews/purchaseEligibility';
import { deriveOrderDeliveryStatus, orderBrandIds } from '@/lib/shipments/derive';
import { customerPaymentStatusLabel, customerPaymentStatusStyle } from '@/lib/orders/customerPaymentLabels';
import type {
  OrderActionRequestItemInput,
  OrderActionRequestRecord,
} from '@/lib/orders/actionRequests';
import { isCancellationRequestAllowed } from '@/lib/orders/cancellation';
import { OrderDateRangeFilter } from '@/components/orders/OrderDateRangeFilter';
import { EMPTY_ORDER_DATE_RANGE, matchesOrderDateRange, type OrderDateRange } from '@/lib/orders/orderDateFilters';
import Pagination from './Pagination';
import TrackingModal from './TrackingModal';
import OrderActionRequestSheet from './OrderActionRequestSheet';
import EmptyState from '@/components/common/EmptyState';
import { ChevronDown, CircleAlert, PackageSearch, Truck } from 'lucide-react';
import MarketplaceNotice from '@/components/common/MarketplaceNotice';

interface OrdersSectionProps {
  orders: Order[];
  shipmentsByOrder: Record<string, Shipment[]>;
  reviews: ProductReview[];
  products: Product[];
  onWriteReview: (product: Product, orderId: string, orderItemId?: string, optionName?: string) => void;
  onOrderUpdated: () => void | Promise<void>;
}

const ITEMS_PER_PAGE = 20;

export default function OrdersSection({ orders, shipmentsByOrder, reviews, products, onWriteReview, onOrderUpdated }: OrdersSectionProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [dateRange, setDateRange] = useState<OrderDateRange>(EMPTY_ORDER_DATE_RANGE);
  const [actionRequestKey, setActionRequestKey] = useState<string | null>(null);
  const [actionRequests, setActionRequests] = useState<OrderActionRequestRecord[]>([]);
  const [actionOrder, setActionOrder] = useState<Order | null>(null);
  // 배송정책 폴백용 공개 브랜드 목록을 콘센트로 읽는다(§4 — 컴포넌트 직접 fetch 금지). 실패 시 [].
  const [brands, setBrands] = useState<Brand[]>([]);
  // 배송조회 모달 대상: 주문 + 조회할 번들(브랜드 또는 레거시 null).
  const [tracking, setTracking] = useState<{ order: Order; bundle: OrderBundle } | null>(null);
  // '상세보기' — 고객용 개별 주문 상세 페이지가 따로 없어(주문 조회는 이 목록 카드가 전부),
  // href="#"로 죽어 있던 링크를 배송지·결제수단·금액 요약을 펼쳐 보여주는 토글로 대체한다
  // (order-complete 페이지의 OrderDetailCard와 같은 정보를 이 카드 안에서 보여주는 최소 침습 방식).
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [serviceRequests, setServiceRequests] = useState<CustomerServiceRequest[]>([]);
  const [requestingKey, setRequestingKey] = useState<string | null>(null);

  useEffect(() => {
    getPublicBrands().then(setBrands).catch(() => setBrands([]));
    getMyCustomerServiceRequests().then(setServiceRequests).catch(() => setServiceRequests([]));
  }, []);

  const handleServiceRequest = async (order: Order, sellerKey: string, type: CustomerServiceRequest['type']) => {
    const typeLabel = type === 'exchange' ? '교환' : '반품';
    const reason = window.prompt(`${typeLabel} 사유를 5자 이상 입력해주세요.\n접수 후 판매자 확인을 거쳐 처리됩니다.`);
    if (reason === null) return;
    if (reason.trim().length < 5) {
      window.alert('사유를 5자 이상 입력해주세요.');
      return;
    }
    const busyKey = `${order.id}:${sellerKey}:${type}`;
    setRequestingKey(busyKey);
    try {
      const created = await createCustomerServiceRequest({ orderId: order.id, sellerKey, type, reason: reason.trim() });
      setServiceRequests((current) => [created, ...current]);
      window.alert(`${typeLabel} 요청이 접수되었습니다.`);
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      window.alert(code === 'request-already-open' ? `이미 처리 중인 ${typeLabel} 요청이 있습니다.` : code === 'request-not-allowed' ? '결제 완료된 주문만 요청할 수 있습니다.' : `${typeLabel} 요청을 접수하지 못했습니다.`);
    } finally {
      setRequestingKey(null);
    }
  };

  useEffect(() => {
    let active = true;
    void Promise.all(orders.map(async (order) => {
      try {
        return await getOrderActionRequests(order.id);
      } catch {
        return [];
      }
    })).then((requestGroups) => {
      if (!active) return;
      setActionRequests(requestGroups.flat());
    });
    return () => { active = false; };
  }, [orders]);

  // 주문 역순 정렬 (최신순)
  const sortedOrders = orders.filter((order) => matchesOrderDateRange(order, dateRange)).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const totalItems = sortedOrders.length;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedOrders = sortedOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const hasDateFilter = Boolean(dateRange.createdFrom || dateRange.createdTo);
  const dateRangeFilter = (
    <div className="mb-6 rounded-md border border-[#EBE6DC] bg-[#FBF9F4] p-3" aria-label="주문내역 기간 필터">
      <div className="flex flex-wrap items-center gap-3">
        <OrderDateRangeFilter
          createdFrom={dateRange.createdFrom}
          createdTo={dateRange.createdTo}
          onChange={(range) => {
            setDateRange(range);
            setCurrentPage(1);
            setExpandedOrderId(null);
          }}
          ariaLabel="주문내역 빠른 기간 선택"
        />
      </div>
    </div>
  );

  if (totalItems === 0) {
    return (
      <section>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[#18231F]">주문내역</h2>
        </div>
        {dateRangeFilter}
        {hasDateFilter ? (
          <EmptyState
            icon={<PackageSearch className="h-8 w-8 text-[#68716C]" />}
            title="선택한 기간에 해당하는 주문 내역이 없습니다."
            description="다른 기간을 선택해 주문 내역을 확인해보세요."
          />
        ) : (
          <EmptyState
            icon={<PackageSearch className="h-8 w-8 text-[#68716C]" />}
            title="주문 내역이 없어요."
            description="최근 구매하신 상품이 없습니다."
            actionLabel="쇼핑하러 가기"
            actionHref="/shop"
          />
        )}
      </section>
    );
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case '구매확정':
        return 'bg-[#2F3B34] text-white';
      case '주문접수':
      case '결제완료':
        return 'bg-[#F2EEE5] text-[#68716C]';
      case '배송준비':
      case '배송중':
        return 'bg-[#FFFDF9] border border-[#DED8CC] text-[#18231F]';
      case '배송완료':
        return 'bg-[#18231F] text-white';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  // 서버 파생(derive.ts: deriveOrderDeliveryStatus)과 동일한 "가장 뒤처진 번들이 주문을 대표한다"
  // 규칙을 그대로 재사용한다. 순수 함수라 클라이언트에서 import해도 안전하다(Supabase 미의존).
  // 이 규칙상 주문 단위 라벨은 절대 '구매확정'이 되지 않는다 — 확정은 브랜드(번들) 단위 행동이므로
  // 모든 번들이 배송완료 이상이어도 주문 라벨은 '배송완료'로 상한선이 걸린다.
  const getOrderDeliveryLabel = (order: Order) => {
    const shipments = shipmentsByOrder[order.id] ?? [];
    const brandIds = orderBrandIds(order.items);
    if (brandIds === null) {
      // 레거시 주문(brandId 없는 아이템 포함) — 브랜드별 파생이 불가능해 주문 자체 필드로 폴백.
      return order.deliveryStatus || '배송전';
    }
    return deriveOrderDeliveryStatus(brandIds, shipments);
  };

  // 아이템(브랜드) 자신의 송장 상태. brandId가 없는 레거시 아이템은 주문 필드로 폴백한다.
  const getItemDeliveryLabel = (order: Order, item: OrderItem) => {
    if (!item.brandId) return order.deliveryStatus || '배송전';
    const shipment = (shipmentsByOrder[order.id] ?? []).find((s) => s.brandId === item.brandId);
    return shipment?.deliveryStatus || '배송전';
  };

  const handleActionRequest = async (
    requestType: 'CANCEL' | 'REFUND',
    brandId: string,
    items: OrderActionRequestItemInput[],
    reason: string,
  ) => {
    if (!actionOrder) return;
    try {
      const created = await createOrderActionRequest(actionOrder.id, { requestType, brandId, items, reason });
      setActionRequests((current) => [...current, created]);
      await onOrderUpdated();
    } catch (error) {
      if (error instanceof Error && error.message === 'action-request-already-exists') {
        throw new Error('같은 브랜드의 요청이 이미 접수되어 있습니다.');
      }
      if (error instanceof Error && error.message === 'action-request-quantity-exceeds-remaining') {
        throw new Error('이미 처리 중이거나 취소된 수량이 포함되어 있습니다. 주문을 새로고침한 뒤 다시 선택해주세요.');
      }
      if (error instanceof Error && error.message === 'action-request-order-closed') {
        throw new Error('이미 종료된 주문에는 요청할 수 없습니다.');
      }
      throw new Error('브랜드별 요청에 실패했습니다. 주문 상태를 새로고침한 뒤 다시 시도해주세요.');
    }
  };

  const handleLegacyCancelRequest = async (order: Order) => {
    if (!window.confirm('주문 취소를 요청하시겠습니까?\n\n관리자가 결제·배송 상태를 확인한 뒤 최종 처리합니다.')) return;
    setActionRequestKey(order.id);
    try {
      await requestOrderCancellation(order.id);
      await onOrderUpdated();
    } catch (error) {
      window.alert(error instanceof Error && error.message === 'cancel-request-not-allowed' ? '현재 상태에서는 주문 취소를 요청할 수 없습니다.' : '주문 취소 요청에 실패했습니다.');
    } finally {
      setActionRequestKey(null);
    }
  };

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#18231F]">주문내역</h2>
      </div>
      {dateRangeFilter}

      <MarketplaceNotice className="mb-6" />

      <div className="flex flex-col gap-6">
        {paginatedOrders.map((order) => {
          // 업체(브랜드)별 번들. 레거시 주문(brandId 없는 아이템)은 하나의 null 번들로 접혀 최소 1개 버튼을 갖는다.
          const bundles = groupOrderItemsByBundle(order.items);
          const sellerGroups = order.sellerGroups ?? [];

          return (
          <div key={order.id} className="mypage-card p-0 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EBE6DC] bg-[#F8F6F0] px-6 py-4">
              <div className="flex flex-wrap items-center gap-4">
                <span className="font-editorial text-sm font-semibold text-[#18231F]">
                  {formatDate(order.createdAt)}
                </span>
                <span className="text-sm text-[#68716C]">주문번호 {order.id}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusStyle(order.orderStatus)}`}>
                  {order.orderStatus}
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${customerPaymentStatusStyle(order.paymentStatus) ?? getStatusStyle(order.paymentStatus)}`}>
                  {customerPaymentStatusLabel(order.paymentStatus)}
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusStyle(getOrderDeliveryLabel(order))}`}>
                  {getOrderDeliveryLabel(order)}
                </span>
                <button
                  type="button"
                  onClick={() => setExpandedOrderId((current) => (current === order.id ? null : order.id))}
                  aria-expanded={expandedOrderId === order.id}
                  className="flex items-center gap-1 text-sm font-semibold text-[#18231F] hover:underline"
                >
                  상세보기
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${expandedOrderId === order.id ? 'rotate-180' : ''}`}
                  />
                </button>
                {bundles.some((bundle) => Boolean(bundle.brandId)) && order.orderStatus !== '취소완료' && (
                  <button
                    type="button"
                    onClick={() => setActionOrder(order)}
                    className="mp-btn-secondary h-11 gap-1 px-3 text-xs"
                  >
                    <CircleAlert className="h-3.5 w-3.5" />
                    취소·환불 요청
                  </button>
                )}
              </div>
            </div>

            {expandedOrderId === order.id && (
              <dl className="grid gap-3 border-b border-[#EBE6DC] bg-[#FBF9F4] px-6 py-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-[#68716C]">배송지</dt>
                  <dd className="max-w-[70%] text-right text-[#18231F]">{order.address}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[#68716C]">배송 요청</dt>
                  <dd className="text-[#18231F]">{order.deliveryMemo || '없음'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[#68716C]">결제수단</dt>
                  <dd className="text-[#18231F]">{order.paymentMethod}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-[#EBE6DC] pt-3 font-semibold">
                  <dt className="text-[#18231F]">최종 결제금액</dt>
                  <dd className="text-[#18231F]">{formatPrice(order.totalPrice + order.deliveryFee)}</dd>
                </div>
              </dl>
            )}

            {expandedOrderId !== order.id && (
              <div className="flex items-center justify-between gap-4 border-b border-[#EBE6DC] px-6 py-4 text-sm">
                <span className="truncate text-[#17201B]">{order.items[0]?.productName ?? '주문 상품'}</span>
                {order.items.length > 1 && <span className="shrink-0 text-xs text-[#8A918B]">외 {order.items.length - 1}개 상품</span>}
              </div>
            )}

            {expandedOrderId === order.id && <div className="flex flex-col divide-y divide-[#EBE6DC]">
              {order.items.map((item, idx) => {
                const product = products.find((p) => p.id === item.productId);
                const canOpenProduct = Boolean(product && product.isVisible !== false);
                const reviewTargetKey = buildReviewTargetKey(order.id, item.productId, item.optionName);
                const hasReview = reviews.some((r) => r.reviewTargetKey === reviewTargetKey);
                const isPurchaseConfirmed = canReviewOrderItem(order, item, shipmentsByOrder[order.id] ?? []);
                const canWriteReview = Boolean(product) && isPurchaseConfirmed && !hasReview;

                return (
                  <div key={`${order.id}-${idx}`} className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex gap-4">
                      {canOpenProduct ? (
                        <Link href={`/shop/${item.productId}`} className="shrink-0">
                          <div className="relative h-20 w-20 overflow-hidden rounded-lg border border-[#EBE6DC] bg-white">
                            {product?.image ? (
                              <Image src={product.image} alt={item.productName} fill className="object-cover" />
                            ) : (
                              <div className="h-full w-full bg-gray-100" />
                            )}
                          </div>
                        </Link>
                      ) : (
                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-[#EBE6DC] bg-white">
                          {product?.image ? (
                            <Image src={product.image} alt={item.productName} fill className="object-cover" />
                          ) : (
                            <div className="h-full w-full bg-gray-100" />
                          )}
                        </div>
                      )}
                      <div className="flex flex-col justify-center">
                        {(item.sellerName || product?.seller?.displayName || product?.brandName) && (
                          <span className="text-xs font-semibold text-[#68716C]">판매자 · {item.sellerName || product?.seller?.displayName || product?.brandName}</span>
                        )}
                        {canOpenProduct ? (
                          <Link href={`/shop/${item.productId}`} className="mt-1 text-sm font-semibold text-[#18231F] line-clamp-1 hover:underline">
                            {item.productName}
                          </Link>
                        ) : (
                          <span className="mt-1 text-sm font-semibold text-[#18231F] line-clamp-1">{item.productName}</span>
                        )}
                        {item.optionName && (
                          <span className="mt-1 text-xs text-[#68716C] line-clamp-1">{item.optionName}</span>
                        )}
                        <span className="mt-1 text-sm font-bold text-[#18231F]">
                          {formatPrice(item.price)} <span className="text-xs font-normal text-[#68716C]">/ {item.quantity}개</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-row items-center gap-3 sm:flex-col sm:items-end">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusStyle(isPurchaseConfirmed ? '구매확정' : getItemDeliveryLabel(order, item))}`}>
                        {isPurchaseConfirmed ? '구매확정' : getItemDeliveryLabel(order, item)}
                      </span>
                      {canWriteReview ? (
                        <button
                          onClick={() => product && onWriteReview(product, order.id, undefined, item.optionName)}
                          className="mp-btn-secondary h-8 px-3 text-xs"
                        >
                          구매평 작성
                        </button>
                      ) : isPurchaseConfirmed && hasReview ? (
                        <span className="text-xs font-semibold text-[#B99562]">작성 완료</span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>}

            {sellerGroups.length > 0 && (
              <div className="border-t border-[#EBE6DC] bg-white px-6 py-4">
                <h3 className="text-sm font-bold text-[#18231F]">판매자별 취소·교환·반품</h3>
                <p className="mt-1 text-xs leading-5 text-[#68716C]">주문 취소는 주문 상단 버튼, 교환·반품은 아래 실제 판매자별 버튼으로 접수합니다.</p>
                <div className="mt-3 space-y-3">
                  {sellerGroups.map((group) => {
                    const requests = serviceRequests.filter((request) => request.orderId === order.id && request.sellerKey === group.key);
                    const canRequest = order.paymentStatus === '결제완료' && !['취소요청', '취소완료'].includes(order.orderStatus);
                    const acceptance = order.sellerAcceptances?.find((item) => item.sellerKey === group.key);
                    return (
                      <div key={group.key} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#EBE6DC] bg-[#FBF9F4] p-3">
                        <div><p className="text-sm font-semibold text-[#18231F]">{group.seller.displayName}</p><p className="mt-0.5 text-xs text-[#68716C]">{group.productIds.length}종 · 판매자 처리 상태 {acceptance?.status === 'accepted' ? '수락' : acceptance?.status === 'rejected' ? '거절' : acceptance?.status === 'cancelled' ? '묶음 취소' : '접수 대기'}{acceptance?.note ? ` · ${acceptance.note}` : ''}</p>{requests.map((request) => <p key={request.id} className="mt-1 text-xs font-semibold text-[#A8742E]">{request.type === 'exchange' ? '교환' : '반품'} · {request.status === 'received' ? '접수' : request.status === 'reviewing' ? '검토 중' : request.status === 'approved' ? '승인' : request.status === 'rejected' ? '반려' : '완료'}{request.adminNote ? ` · ${request.adminNote}` : ''}</p>)}</div>
                        <div className="flex gap-2">
                          {(['exchange', 'return'] as const).map((type) => {
                            const busyKey = `${order.id}:${group.key}:${type}`;
                            const hasOpen = requests.some((request) => request.type === type && ['received', 'reviewing', 'approved'].includes(request.status));
                            return <button key={type} type="button" disabled={!canRequest || hasOpen || requestingKey === busyKey} onClick={() => void handleServiceRequest(order, group.key, type)} className="mp-btn-secondary h-9 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-50">{hasOpen ? `${type === 'exchange' ? '교환' : '반품'} 처리 중` : `${type === 'exchange' ? '교환' : '반품'} 요청`}</button>;
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 업체별 배송조회 — 버튼은 항상 살아 있게 한다(숨기면 CS 문의가 는다). 레거시 단일 번들은 "배송조회"로 표기. */}
            <div className="flex flex-col gap-2 border-t border-[#EBE6DC] bg-[#FBF9F4] px-6 py-4">
              {bundles.map((bundle) => {
                const brand = bundle.brandId ? brands.find((b) => b.id === bundle.brandId) : null;
                const label = brand?.name ?? (bundle.brandId ? '배송 정보' : '배송조회');
                const brandId = bundle.brandId;
                return (
                  <div
                    key={bundle.brandId ?? '__legacy__'}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="text-sm text-[#68716C]">
                      {label}
                      <span className="ml-1 text-xs text-[#A29E93]">· {bundle.items.length}개 상품</span>
                    </span>
                    <div className="flex flex-wrap justify-end gap-2">
                      <button onClick={() => setTracking({ order, bundle })} className="mp-btn-secondary h-9 gap-1 px-3 text-xs"><Truck className="h-3.5 w-3.5" />배송조회</button>
                      {!brandId && isCancellationRequestAllowed(order) && <button onClick={() => void handleLegacyCancelRequest(order)} disabled={Boolean(actionRequestKey)} className="mp-btn-secondary h-9 gap-1 px-3 text-xs"><CircleAlert className="h-3.5 w-3.5" />{actionRequestKey === order.id ? '요청 중...' : '주문 취소 요청'}</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          );
        })}
      </div>

      <Pagination
        currentPage={currentPage}
        totalItems={totalItems}
        itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={setCurrentPage}
      />

      {tracking && (
        <TrackingModal
          isOpen
          onClose={() => setTracking(null)}
          order={tracking.order}
          bundle={tracking.bundle}
          brands={brands}
        />
      )}

      {actionOrder && (
        <OrderActionRequestSheet
          order={actionOrder}
          bundles={groupOrderItemsByBundle(actionOrder.items)}
          brands={brands}
          shipments={shipmentsByOrder[actionOrder.id] ?? []}
          requests={actionRequests.filter((request) => request.orderId === actionOrder.id)}
          onClose={() => setActionOrder(null)}
          onSubmit={handleActionRequest}
        />
      )}
    </section>
  );
}
