'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Order, ProductReview } from '@/types';
import { products } from '@/data/products';
import { formatPrice, formatDate } from '@/lib/format';
import { buildReviewTargetKey } from '@/lib/storage';
import Pagination from './Pagination';
import EmptyState from '@/components/common/EmptyState';
import { PackageSearch } from 'lucide-react';

interface OrdersSectionProps {
  orders: Order[];
  reviews: ProductReview[];
  onWriteReview: (product: any, orderId: string, orderItemId: string, optionName?: string) => void;
}

const ITEMS_PER_PAGE = 20;

export default function OrdersSection({ orders, reviews, onWriteReview }: OrdersSectionProps) {
  const [currentPage, setCurrentPage] = useState(1);

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

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#18231F]">주문내역</h2>
      </div>

      <div className="flex flex-col gap-6">
        {paginatedOrders.map((order) => (
          <div key={order.id} className="mypage-card p-0 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EBE6DC] bg-[#F8F6F0] px-6 py-4">
              <div className="flex items-center gap-4">
                <span className="font-editorial text-sm font-semibold text-[#18231F]">
                  {formatDate(order.createdAt)}
                </span>
                <span className="text-sm text-[#68716C]">주문번호 {order.id}</span>
              </div>
              <Link href="#" className="text-sm font-semibold text-[#18231F] hover:underline">
                상세보기
              </Link>
            </div>

            <div className="flex flex-col divide-y divide-[#EBE6DC]">
              {order.items.map((item, idx) => {
                const product = products.find((p) => p.id === item.productId);
                const reviewTargetKey = buildReviewTargetKey(order.id, item.productId, item.optionName);
                const hasReview = reviews.some((r) => r.reviewTargetKey === reviewTargetKey);
                const canWriteReview = order.orderStatus === '배송완료' && !hasReview;

                return (
                  <div key={`${order.id}-${idx}`} className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex gap-4">
                      <Link href={`/shop/${item.productId}`} className="shrink-0">
                        <div className="relative h-20 w-20 overflow-hidden rounded-lg border border-[#EBE6DC] bg-white">
                          {product?.image ? (
                            <Image src={product.image} alt={item.productName} fill className="object-cover" />
                          ) : (
                            <div className="h-full w-full bg-gray-100" />
                          )}
                        </div>
                      </Link>
                      <div className="flex flex-col justify-center">
                        {product?.brandName && (
                          <span className="text-xs font-semibold text-[#68716C]">{product.brandName}</span>
                        )}
                        <Link href={`/shop/${item.productId}`} className="mt-1 text-sm font-semibold text-[#18231F] line-clamp-1 hover:underline">
                          {item.productName}
                        </Link>
                        {item.optionName && (
                          <span className="mt-1 text-xs text-[#68716C] line-clamp-1">{item.optionName}</span>
                        )}
                        <span className="mt-1 text-sm font-bold text-[#18231F]">
                          {formatPrice(item.price)} <span className="text-xs font-normal text-[#68716C]">/ {item.quantity}개</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-row items-center gap-3 sm:flex-col sm:items-end">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusStyle(order.orderStatus)}`}>
                        {order.orderStatus}
                      </span>
                      {canWriteReview ? (
                        <button
                          onClick={() => product && onWriteReview(product, order.id, 'temp-item-id', item.optionName)}
                          className="mp-btn-secondary h-8 px-3 text-xs"
                        >
                          구매평 작성
                        </button>
                      ) : order.orderStatus === '배송완료' && hasReview ? (
                        <span className="text-xs font-semibold text-[#B99562]">작성 완료</span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <Pagination
        currentPage={currentPage}
        totalItems={totalItems}
        itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={setCurrentPage}
      />
    </section>
  );
}
