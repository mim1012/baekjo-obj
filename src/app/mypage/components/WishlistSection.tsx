'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatPrice } from '@/lib/format';
import { removeWishlist } from '@/lib/storage';
import Pagination from './Pagination';
import EmptyState from '@/components/common/EmptyState';
import { Heart, ShoppingBag, X } from 'lucide-react';
import type { Product } from '@/types';

interface WishlistSectionProps {
  wishlistIds: string[];
  products: Product[];
  onWishlistChange: () => void;
}

const ITEMS_PER_PAGE = 20;

export default function WishlistSection({ wishlistIds, products, onWishlistChange }: WishlistSectionProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const wishlistProducts = wishlistIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined);

  const totalItems = wishlistProducts.length;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedProducts = wishlistProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (totalItems === 0) {
    return (
      <section>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[#18231F]">관심 상품</h2>
        </div>
        <EmptyState
          icon={<Heart className="h-8 w-8 text-[#68716C]" />}
          title="관심 상품이 없어요."
          description="마음에 드는 상품에 하트를 눌러보세요."
          actionLabel="상품 둘러보기"
          actionHref="/shop"
        />
      </section>
    );
  }

  const handleRemove = async (productId: string) => {
    await removeWishlist(productId);
    onWishlistChange();
    // 데이터 변경으로 현재 페이지가 비게 되면 이전 페이지로 이동
    if (paginatedProducts.length === 1 && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#18231F]">관심 상품</h2>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
        {paginatedProducts.map((product) => (
          <div key={product.id} className="mypage-card flex h-full flex-col p-4 group relative">
            <button
              onClick={() => void handleRemove(product.id)}
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#68716C] shadow-sm transition-colors hover:text-[#18231F]"
              aria-label="관심 상품 해제"
            >
              <X className="h-4 w-4" />
            </button>
            <Link href={`/shop/${product.id}`} className="block relative aspect-square w-full overflow-hidden rounded-xl border border-[#EBE6DC] bg-white">
              {product.image ? (
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="h-full w-full bg-gray-100" />
              )}
            </Link>
            <div className="mt-4 flex flex-1 flex-col">
              {product.brandName && (
                <span className="text-xs font-semibold text-[#68716C]">{product.brandName}</span>
              )}
              <Link href={`/shop/${product.id}`} className="mt-1 text-sm font-semibold text-[#18231F] line-clamp-2 hover:underline">
                {product.name}
              </Link>
              <div className="mt-auto pt-3">
                <span className="text-base font-bold text-[#18231F]">{formatPrice(product.price ?? 0)}</span>
              </div>
            </div>
            <button className="mp-btn-secondary mt-4 w-full gap-2">
              <ShoppingBag className="h-4 w-4" />
              장바구니
            </button>
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
