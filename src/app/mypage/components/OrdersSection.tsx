'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Order, ProductReview, Product, Brand, Shipment } from '@/types';
import { formatPrice, formatDate } from '@/lib/format';
import { buildReviewTargetKey, getPublicBrands } from '@/lib/storage';
import { groupOrderItemsByBundle, type OrderBundle } from '@/lib/shipments/timeline';
import { canReviewOrderItem } from '@/lib/reviews/purchaseEligibility';
import Pagination from './Pagination';
import TrackingModal from './TrackingModal';
import EmptyState from '@/components/common/EmptyState';
import { PackageSearch, Truck } from 'lucide-react';

interface OrdersSectionProps {
  orders: Order[];
  shipmentsByOrder: Record<string, Shipment[]>;
  reviews: ProductReview[];
  products: Product[];
  onWriteReview: (product: Product, orderId: string, orderItemId?: string, optionName?: string) => void;
}

const ITEMS_PER_PAGE = 20;

export default function OrdersSection({ orders, shipmentsByOrder, reviews, products, onWriteReview }: OrdersSectionProps) {
  const [currentPage, setCurrentPage] = useState(1);
  // 배송정책 폴백용 공개 브랜드 목록을 콘센트로 읽는다(§4 — 컴포넌트 직접 fetch 금지). 실패 시 [].
  const [brands, setBrands] = useState<Brand[]>([]);
  // 배송조회 모달 대상: 주문 + 조회할 번들(브랜드 또는 레거시 null).
  const [tracking, setTracking] = useState<{ order: Order; bundle: OrderBundle } | null>(null);

  useEffect(() => {
    getPublicBrands().then(setBrands);
  }, []);

  // 주문 역순 정렬 (최신순)
  const sortedOrders = [...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const totalItems = sortedOrders.length;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedOrders = sortedOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (totalItems === 0) {
    return (
      <section>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[#18231F]">주문내역</h2>
        </div>
        <EmptyState
          icon={<PackageSearch className="h-8 w-8 text-[#68716C]" />}
          title="주문 내역이 없어요."
          description="최근 구매하신 상품이 없습니다."
          actionLabel="쇼핑하러 가기"
          actionHref="/shop"
        />
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

  const getOrderDeliveryLabel = (order: Order) => {
    const shipments = shipmentsByOrder[order.id] ?? [];
    if (shipments.some((shipment) => shipment.deliveryStatus === '구매확정' || shipment.confirmedAt)) {
      return '구매확정';
    }
    return order.deliveryStatus || '배송전';
  };

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#18231F]">주문내역</h2>
      </div>

      <div className="flex flex-col gap-6">
        {paginatedOrders.map((order) => {
          // 업체(브랜드)별 번들. 레거시 주문(brandId 없는 아이템)은 하나의 null 번들로 접혀 최소 1개 버튼을 갖는다.
          const bundles = groupOrderItemsByBundle(order.items);

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
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusStyle(order.paymentStatus)}`}>
                  {order.paymentStatus}
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusStyle(getOrderDeliveryLabel(order))}`}>
                  {getOrderDeliveryLabel(order)}
                </span>
                <Link href="#" className="text-sm font-semibold text-[#18231F] hover:underline">
                  상세보기
                </Link>
              </div>
            </div>

            <div className="flex flex-col divide-y divide-[#EBE6DC]">
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
                        {product?.brandName && (
                          <span className="text-xs font-semibold text-[#68716C]">{product.brandName}</span>
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
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusStyle(isPurchaseConfirmed ? '구매확정' : order.deliveryStatus)}`}>
                        {isPurchaseConfirmed ? '구매확정' : order.deliveryStatus}
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
            </div>

            {/* 업체별 배송조회 — 버튼은 항상 살아 있게 한다(숨기면 CS 문의가 는다). 레거시 단일 번들은 "배송조회"로 표기. */}
            <div className="flex flex-col gap-2 border-t border-[#EBE6DC] bg-[#FBF9F4] px-6 py-4">
              {bundles.map((bundle) => {
                const brand = bundle.brandId ? brands.find((b) => b.id === bundle.brandId) : null;
                const label = brand?.name ?? (bundle.brandId ? '배송 정보' : '배송조회');
                return (
                  <div
                    key={bundle.brandId ?? '__legacy__'}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="text-sm text-[#68716C]">
                      {label}
                      <span className="ml-1 text-xs text-[#A29E93]">· {bundle.items.length}개 상품</span>
                    </span>
                    <button
                      onClick={() => setTracking({ order, bundle })}
                      className="mp-btn-secondary h-9 gap-1 px-3 text-xs"
                    >
                      <Truck className="h-3.5 w-3.5" />
                      배송조회
                    </button>
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
    </section>
  );
}
