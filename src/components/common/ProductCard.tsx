'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart, ShoppingBag, Star } from 'lucide-react';
import { useState } from 'react';
import BrandLogo from '@/components/common/BrandLogo';
import { brands } from '@/data/brands';
import { addToCart } from '@/lib/cart';
import { calcDiscount, formatPrice } from '@/lib/format';
import { isWishlisted, toggleWishlist } from '@/lib/storage';
import { useMounted } from '@/lib/useMounted';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  variant?: 'default' | 'shop';
}

const concernLabels: Record<string, string> = {
  tear: '눈물',
  joint: '관절',
  skin: '피부',
  obesity: '체중',
  picky: '편식',
  digestion: '배변',
  stress: '스트레스',
  senior: '시니어',
  nutrition: '영양',
  oral: '구강',
  grooming: '그루밍',
  living: '생활',
};

export default function ProductCard({ product, variant = 'default' }: ProductCardProps) {
  const mounted = useMounted();
  const [, refreshWishlist] = useState(0);
  const [cartMessage, setCartMessage] = useState('');
  const wishlisted = mounted && isWishlisted(product.id);
  const brand = brands.find((candidate) => candidate.id === product.brandId);
  const hasPrice = product.price !== null && product.price !== undefined;
  const isSellable = hasPrice && product.stock > 0;
  const isShopCard = variant === 'shop';
  const discount = hasPrice ? calcDiscount(product.price!, product.salePrice ?? undefined) : 0;
  const detailHref = `/shop/${product.id}`;

  const handleWishlist = () => {
    toggleWishlist(product.id);
    refreshWishlist((version) => version + 1);
  };

  const handleCart = () => {
    if (!isSellable) return;
    addToCart({
      productId: product.id,
      optionId: product.options?.[0]?.id,
      quantity: 1,
    });
    setCartMessage('장바구니에 담았어요.');
    window.setTimeout(() => setCartMessage(''), 1800);
  };

  const availabilityLabel = !hasPrice ? '판매 준비 중' : product.stock <= 0 ? '잠시 품절' : null;

  return (
    <article className="group flex h-full min-w-0 flex-col">
      <div
        className={`relative w-full overflow-hidden rounded-2xl bg-[#F3EEE6] ${
          isShopCard ? 'aspect-square' : 'aspect-[4/3]'
        }`}
      >
        <Link href={detailHref} aria-label={`${product.name} 상세 보기`} className="absolute inset-0 block">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              className="object-contain p-5 transition-transform duration-[1500ms] ease-out group-hover:scale-105"
            />
          ) : (
            <span className="flex h-full flex-col items-center justify-center px-4 text-center">
              <ShoppingBag className="mb-2 size-5 text-[#A8742E]/55" strokeWidth={1.5} />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#8A7A64]">
                Baekjo selection
              </span>
            </span>
          )}
        </Link>

        <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1.5">
          {product.isBest && (
            <span className="rounded-full bg-[#17211D] px-2.5 py-1 text-[9px] font-bold tracking-wide text-[#FBFAF7]">
              BEST
            </span>
          )}
          {product.isRecommended && (
            <span className="rounded-full border border-[#E7E0D5] bg-white/90 px-2.5 py-1 text-[9px] font-bold tracking-wide text-[#17211D]">
              SELECTED
            </span>
          )}
          {availabilityLabel && (
            <span className="rounded-full bg-[#FBFAF7]/95 px-2.5 py-1 text-[9px] font-bold text-[#6F766F]">
              {availabilityLabel}
            </span>
          )}
        </div>

        {isShopCard ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault(); // Prevent Link click
              handleWishlist();
            }}
            aria-pressed={wishlisted}
            aria-label={`${product.name} ${wishlisted ? '관심 상품에서 빼기' : '관심 상품에 담기'}`}
            className="absolute right-3 top-3 z-10 flex size-[38px] items-center justify-center rounded-full border border-[#E7E0D5] bg-white/90 text-[#17211D] shadow-sm transition-colors duration-500 hover:bg-[#F3EEE6]"
          >
            <Heart className={`size-4 ${wishlisted ? 'fill-[#9E3939] text-[#9E3939]' : ''}`} />
          </button>
        ) : (
          <div className="absolute bottom-3 right-3 flex gap-2 opacity-100 transition-all duration-500 lg:translate-y-1 lg:opacity-0 lg:group-focus-within:translate-y-0 lg:group-focus-within:opacity-100 lg:group-hover:translate-y-0 lg:group-hover:opacity-100">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                handleCart();
              }}
              disabled={!isSellable}
              aria-label={
                isSellable
                  ? `${product.name} 장바구니에 담기`
                  : `${product.name} ${availabilityLabel ?? '구매할 수 없음'}`
              }
              className="flex size-9 items-center justify-center rounded-full border border-[#E7E0D5] bg-white/95 text-[#17211D] shadow-sm transition-colors duration-500 hover:bg-[#F3EEE6] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <ShoppingBag className="size-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                handleWishlist();
              }}
              aria-pressed={wishlisted}
              aria-label={`${product.name} ${wishlisted ? '관심 상품에서 빼기' : '관심 상품에 담기'}`}
              className="flex size-9 items-center justify-center rounded-full border border-[#E7E0D5] bg-white/95 text-[#17211D] shadow-sm transition-colors duration-500 hover:bg-[#F3EEE6]"
            >
              <Heart className={`size-4 ${wishlisted ? 'fill-[#9E3939] text-[#9E3939]' : ''}`} />
            </button>
          </div>
        )}

        {cartMessage && (
          <div
            role="status"
            className="absolute inset-x-3 bottom-3 rounded-full bg-[#17211D] px-4 py-2 text-center text-xs font-semibold text-[#FBFAF7]"
          >
            {cartMessage}
          </div>
        )}
      </div>

      <div className="px-0.5 pb-1 pt-3">
        {brand && <BrandLogo brand={brand} size="sm" surface={false} />}
        <Link href={detailHref} className="block">
          <h3 className="mt-2 line-clamp-2 min-h-10 break-keep text-sm font-medium leading-5 tracking-tight text-[#17211D] transition-colors duration-500 hover:text-[#A8742E]">
            {product.name}
          </h3>
        </Link>

        <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          {hasPrice ? (
            <>
              {discount > 0 && <span className="text-sm font-bold text-[#A8742E]">{discount}%</span>}
              <span className="text-base font-bold tabular-nums tracking-tight text-[#17211D]">
                {formatPrice(product.salePrice || product.price!)}
              </span>
              {discount > 0 && (
                <span className="text-xs tabular-nums text-[#8A918B] line-through">{formatPrice(product.price!)}</span>
              )}
            </>
          ) : (
            <span className="text-sm font-medium text-[#6F766F]">판매가를 준비하고 있어요</span>
          )}
        </div>

        <div className="mt-2 flex items-center gap-1 text-xs text-[#6F766F]">
          <Star className="size-3 fill-[#D8C4A3] text-[#D8C4A3]" aria-hidden="true" />
          <span className="font-medium tabular-nums">{product.rating}</span>
          <span className="tabular-nums">후기 {product.reviewCount}</span>
        </div>

        {!isShopCard && (
          <>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {product.concernTags.slice(0, 2).map((tag) => (
                <span key={tag} className="rounded-full bg-[#FAF8F3] px-2.5 py-1 text-[10px] text-[#6F766F]">
                  {concernLabels[tag] ?? tag}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {isShopCard && (
        <div className="mt-auto px-0.5 pt-4">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              handleCart();
            }}
            disabled={!isSellable}
            className="flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-xl border border-[#E7E0D5] bg-white text-sm font-semibold text-[#17211D] transition-colors duration-500 hover:bg-[#F3EEE6] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[44px]"
          >
            <ShoppingBag className="size-4" />
            {isSellable ? '장바구니' : (availabilityLabel ?? '구매 불가')}
          </button>
        </div>
      )}
    </article>
  );
}
