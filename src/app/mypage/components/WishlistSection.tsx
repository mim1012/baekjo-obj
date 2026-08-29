'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatPrice } from '@/lib/format';
import { removeWishlist } from '@/lib/storage';
import { addToCart } from '@/lib/cart';
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
  // 상품 카드(ProductCard.tsx)와 동일한 패턴 — 담기 결과를 상품별로 짧게 보여주고 자동으로 지운다.
  const [cartFeedback, setCartFeedback] = useState<{ id: string; message: string } | null>(null);
  // 삭제 낙관적 갱신 중인 상품 id — handleRemove 참고.
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  const wishlistProducts = wishlistIds
    .filter((id) => !removingIds.has(id))
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
    // 낙관적 갱신 — 클릭 즉시 카드를 숨겨서 반응성을 준다. 실제 목록은 부모(mypage/page.tsx)의
    // wishlistIds가 진실 소스이므로, 실패하면 removingIds에서 지워 원래대로 되돌린다(revert).
    setRemovingIds((current) => new Set(current).add(productId));
    try {
      await removeWishlist(productId);
      onWishlistChange();
      // 데이터 변경으로 현재 페이지가 비게 되면 이전 페이지로 이동
      if (paginatedProducts.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    } catch {
      // removeWishlist는 401·비-ok 응답에서 throw한다(storage.ts) — 지금까지는 아무도 잡지 않아
      // unhandled rejection으로 조용히 사라졌다. 실패를 알리고 낙관적으로 숨겼던 카드를 되돌린다.
      setRemovingIds((current) => {
        const next = new Set(current);
        next.delete(productId);
        return next;
      });
      alert('관심 상품 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  // ProductCard.tsx handleCart와 동일한 규칙(hasPrice && stock > 0)을 재사용 — 가격 미확정("가격
  // 협의") 상품은 장바구니에 담을 수 없어 버튼을 비활성화하고 같은 라벨로 안내한다.
  const handleAddToCart = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const hasPrice = product.price !== null && product.price !== undefined;
    if (!hasPrice || product.stock <= 0) return;

    addToCart({
      productId: product.id,
      optionId: product.options?.[0]?.id,
      quantity: 1,
    });
    setCartFeedback({ id: product.id, message: '장바구니에 담았어요.' });
    window.setTimeout(() => {
      setCartFeedback((current) => (current?.id === product.id ? null : current));
    }, 1800);
  };

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#18231F]">관심 상품</h2>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
        {paginatedProducts.map((product) => {
          const hasPrice = product.price !== null && product.price !== undefined;
          const isSellable = hasPrice && product.stock > 0;
          const cartButtonLabel = isSellable ? '장바구니' : !hasPrice ? '가격 협의' : '품절';

          return (
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
                <span className="text-base font-bold text-[#18231F]">
                  {hasPrice ? formatPrice(product.salePrice || product.price!) : '가격 협의'}
                </span>
              </div>
            </div>
            {cartFeedback?.id === product.id && (
              <div role="status" className="mt-3 rounded-xl bg-[#17211D] px-3 py-2 text-center text-xs font-semibold text-[#FBFAF7]">
                {cartFeedback.message}
              </div>
            )}
            <button
              type="button"
              onClick={() => handleAddToCart(product.id)}
              disabled={!isSellable}
              className="mp-btn-secondary mt-4 w-full gap-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShoppingBag className="h-4 w-4" />
              {cartButtonLabel}
            </button>
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
    </section>
  );
}
