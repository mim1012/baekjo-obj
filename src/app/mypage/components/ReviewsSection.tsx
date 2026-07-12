'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Order, ProductReview, Product } from '@/types';
import { formatPrice, formatDate, ratingStars } from '@/lib/format';
import { buildReviewTargetKey } from '@/lib/storage';
import Pagination from './Pagination';
import EmptyState from '@/components/common/EmptyState';
import { Star, Edit2, Trash2 } from 'lucide-react';

interface ReviewsSectionProps {
  orders: Order[];
  reviews: ProductReview[];
  products: Product[];
  onWriteReview: (product: Product, orderId: string, orderItemId?: string, optionName?: string) => void;
  onEditReview: (review: ProductReview, product: Product, optionName?: string) => void;
  onDeleteReview: (reviewId: string) => void;
}

const ITEMS_PER_PAGE = 20;

export default function ReviewsSection({
  orders,
  reviews,
  products,
  onWriteReview,
  onEditReview,
  onDeleteReview,
}: ReviewsSectionProps) {
  const [subTab, setSubTab] = useState<'writable' | 'written'>('writable');
  const [currentPage, setCurrentPage] = useState(1);

  // 작성 가능한 주문상품 추출
  const writableItems = orders
    .filter((o) => o.orderStatus === '배송완료')
    .flatMap((order) =>
      order.items.map((item) => {
        const reviewTargetKey = buildReviewTargetKey(order.id, item.productId, item.optionName);
        return {
          order,
          item,
          reviewTargetKey,
          hasReview: reviews.some((r) => r.reviewTargetKey === reviewTargetKey),
        };
      })
    )
    .filter((data) => !data.hasReview)
    .sort((a, b) => new Date(b.order.createdAt).getTime() - new Date(a.order.createdAt).getTime());

  // 작성한 구매평 정렬
  const sortedReviews = [...reviews].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const totalItems = subTab === 'writable' ? writableItems.length : sortedReviews.length;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;

  const handleSubTabChange = (tab: 'writable' | 'written') => {
    setSubTab(tab);
    setCurrentPage(1);
  };

  return (
    <section>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#18231F]">구매평 관리</h2>
        </div>
        <div className="flex rounded-lg border border-[#DED8CC] bg-[#F8F6F0] p-1">
          <button
            onClick={() => handleSubTabChange('writable')}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
              subTab === 'writable'
                ? 'bg-white text-[#18231F] shadow-sm'
                : 'text-[#68716C] hover:text-[#18231F]'
            }`}
          >
            작성 가능 ({writableItems.length})
          </button>
          <button
            onClick={() => handleSubTabChange('written')}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
              subTab === 'written'
                ? 'bg-white text-[#18231F] shadow-sm'
                : 'text-[#68716C] hover:text-[#18231F]'
            }`}
          >
            작성한 구매평 ({sortedReviews.length})
          </button>
        </div>
      </div>

      {totalItems === 0 ? (
        <EmptyState
          icon={<Star className="h-8 w-8 text-[#68716C]" />}
          title={subTab === 'writable' ? '작성 가능한 구매평이 없어요.' : '작성한 구매평이 없어요.'}
          description={
            subTab === 'writable'
              ? '배송이 완료된 상품만 구매평을 작성할 수 있습니다.'
              : '구매하신 상품에 대한 솔직한 후기를 남겨주세요.'
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {subTab === 'writable'
            ? writableItems.slice(startIndex, startIndex + ITEMS_PER_PAGE).map((data, idx) => {
                const product = products.find((p) => p.id === data.item.productId);
                return (
                  <div key={`${data.order.id}-${idx}`} className="mypage-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex gap-4">
                      <Link href={`/shop/${data.item.productId}`} className="shrink-0">
                        <div className="relative h-[72px] w-[72px] overflow-hidden rounded-lg border border-[#EBE6DC] bg-white">
                          {product?.image && (
                            <Image src={product.image} alt={data.item.productName} fill className="object-cover" />
                          )}
                        </div>
                      </Link>
                      <div className="flex flex-col justify-center">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="font-editorial text-xs font-semibold text-[#B99562]">{formatDate(data.order.createdAt)}</span>
                          {product?.brandName && <span className="text-xs text-[#68716C]">{product.brandName}</span>}
                        </div>
                        <Link href={`/shop/${data.item.productId}`} className="text-sm font-semibold text-[#18231F] line-clamp-1 hover:underline">
                          {data.item.productName}
                        </Link>
                        {data.item.optionName && (
                          <span className="mt-1 text-xs text-[#68716C] line-clamp-1">{data.item.optionName}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => product && onWriteReview(product, data.order.id, undefined, data.item.optionName)}
                      className="mp-btn-primary shrink-0"
                    >
                      구매평 작성
                    </button>
                  </div>
                );
              })
            : sortedReviews.slice(startIndex, startIndex + ITEMS_PER_PAGE).map((review) => {
                const product = products.find((p) => p.id === review.productId);
                const order = orders.find((o) => o.id === review.orderId);
                const orderItem = order?.items.find((i) => buildReviewTargetKey(order.id, i.productId, i.optionName) === review.reviewTargetKey);
                
                return (
                  <div key={review.id} className="mypage-card flex flex-col gap-5 p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-3">
                        <Link href={`/shop/${review.productId}`} className="shrink-0">
                          <div className="relative h-14 w-14 overflow-hidden rounded-lg border border-[#EBE6DC] bg-white">
                            {product?.image && (
                              <Image src={product.image} alt={product.name} fill className="object-cover" />
                            )}
                          </div>
                        </Link>
                        <div className="flex flex-col justify-center">
                          {product?.brandName && <span className="text-xs text-[#68716C]">{product.brandName}</span>}
                          <Link href={`/shop/${review.productId}`} className="text-sm font-semibold text-[#18231F] line-clamp-1 hover:underline">
                            {product?.name || '알 수 없는 상품'}
                          </Link>
                          {orderItem?.optionName && (
                            <span className="text-xs text-[#68716C]">{orderItem.optionName}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => product && onEditReview(review, product, orderItem?.optionName)}
                          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[#68716C] transition-colors hover:bg-gray-100"
                        >
                          <Edit2 className="h-3 w-3" />
                          수정
                        </button>
                        <button
                          onClick={() => onDeleteReview(review.id)}
                          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-red-500 transition-colors hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                          삭제
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl bg-[#F8F6F0] p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex gap-0.5">
                          {ratingStars(review.rating).map((star, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                star === 'full' ? 'fill-[#B99562] text-[#B99562]' : 'fill-transparent text-[#DED8CC]'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="font-editorial text-xs text-[#68716C]">{formatDate(review.createdAt)}</span>
                      </div>
                      {review.title && <h4 className="mb-2 text-sm font-semibold text-[#18231F]">{review.title}</h4>}
                      <p className="whitespace-pre-wrap break-keep text-sm leading-relaxed text-[#18231F]">
                        {review.content}
                      </p>
                    </div>
                  </div>
                );
              })}
        </div>
      )}

      <Pagination
        currentPage={currentPage}
        totalItems={totalItems}
        itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={setCurrentPage}
      />
    </section>
  );
}
