'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Check, CreditCard, Heart, Minus, Plus, ShoppingCart, Star } from 'lucide-react';
import { useState } from 'react';
import ProductPurchaseInfo from '@/components/shop/ProductPurchaseInfo';
import { brands } from '@/data/brands';
import { addToCart } from '@/lib/cart';
import { calcDiscount, formatPrice } from '@/lib/format';
import { isWishlisted, toggleWishlist } from '@/lib/storage';
import { useMounted } from '@/lib/useMounted';
import type { Product } from '@/types';

interface ProductDetailClientProps {
  product: Product;
}

export default function ProductDetailClient({ product }: ProductDetailClientProps) {
  const router = useRouter();
  const mounted = useMounted();
  const [quantity, setQuantity] = useState(1);
  const [selectedOption, setSelectedOption] = useState(product.options?.[0]?.id ?? '');
  const [, refreshWishlist] = useState(0);
  const [cartMessage, setCartMessage] = useState('');
  const wishlisted = mounted && isWishlisted(product.id);
  const brand = brands.find((candidate) => candidate.id === product.brandId);
  const brandName = brand?.name ?? '백조오브제 셀렉션';
  const currentOption = product.options?.find((option) => option.id === selectedOption);
  const hasPrice = product.price !== null && product.price !== undefined;
  const isSellable = hasPrice && product.stock > 0;
  const basePrice = hasPrice ? product.salePrice ?? product.price! : 0;
  const optionPrice = currentOption?.priceDiff ?? currentOption?.price ?? 0;
  const totalPrice = (basePrice + optionPrice) * quantity;
  const discount = hasPrice ? calcDiscount(product.price!, product.salePrice ?? undefined) : 0;

  const handleWishlist = () => {
    toggleWishlist(product.id);
    refreshWishlist((version) => version + 1);
  };

  const handleAddToCart = () => {
    if (!isSellable) return;
    addToCart({ productId: product.id, optionId: selectedOption || undefined, quantity });
    setCartMessage('장바구니에 담았어요.');
    window.setTimeout(() => setCartMessage(''), 1800);
  };

  const handleBuyNow = () => {
    if (!isSellable) return;
    addToCart({ productId: product.id, optionId: selectedOption || undefined, quantity });
    router.push('/checkout');
  };

  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
      <div className="relative aspect-square overflow-hidden rounded-3xl bg-[#F3EEE6]">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-contain p-8 sm:p-12"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-8 text-center">
            <span className="font-editorial text-sm italic tracking-wide text-[#A8742E]">Baekjo selection</span>
            <span className="mt-3 break-keep text-sm text-[#6F766F]">상품 이미지를 준비하고 있어요.</span>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-col pt-1">
        <p className="text-sm font-semibold text-[#6F766F]">{brandName}</p>
        <h1 className="mt-3 break-keep text-3xl font-bold leading-[1.2] tracking-tight text-[#17211D] sm:text-4xl">
          {product.name}
        </h1>

        <div className="mt-4 flex items-center gap-2 text-sm text-[#6F766F]">
          <Star className="size-4 fill-[#D8C4A3] text-[#D8C4A3]" aria-hidden="true" />
          <span className="font-semibold tabular-nums text-[#17211D]">{product.rating}</span>
          <span>후기 {product.reviewCount}개</span>
        </div>

        <div className="mt-8 border-t border-[#E7E0D5] pt-8">
          {hasPrice ? (
            <div className="flex flex-wrap items-baseline gap-3">
              {discount > 0 && <span className="text-xl font-bold text-[#A8742E]">{discount}%</span>}
              <span className="text-3xl font-bold tabular-nums tracking-tight text-[#17211D]">
                {formatPrice(product.salePrice || product.price!)}
              </span>
              {discount > 0 && (
                <span className="text-sm tabular-nums text-[#8A918B] line-through">{formatPrice(product.price!)}</span>
              )}
            </div>
          ) : (
            <div>
              <p className="text-xl font-bold text-[#17211D]">아직 판매 준비 중인 상품이에요.</p>
              <p className="mt-2 break-keep text-sm leading-6 text-[#6F766F]">
                가격과 구매 일정을 확인한 뒤 편하게 만나볼 수 있도록 안내할게요.
              </p>
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F3EEE6] px-3 py-1.5 text-xs font-semibold text-[#6F766F]">
            <Check className="size-3 text-[#A8742E]" />
            {brand?.auditReport ? '브랜드 자료를 확인했어요' : '브랜드 자료를 살펴보고 있어요'}
          </span>
          <span className="inline-flex items-center rounded-full bg-[#FAF8F3] px-3 py-1.5 text-xs font-semibold text-[#6F766F]">
            {product.catalogStatus === 'ready' ? '상품 정보를 확인했어요' : '판매 정보를 확인하고 있어요'}
          </span>
        </div>

        {isSellable && product.options && product.options.length > 0 && (
          <div className="mt-8">
            <label htmlFor="product-option" className="text-xs font-semibold uppercase tracking-widest text-[#6F766F]">
              옵션
            </label>
            <select
              id="product-option"
              value={selectedOption}
              onChange={(event) => setSelectedOption(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[#E7E0D5] bg-white px-4 py-4 text-sm text-[#17211D] transition-colors duration-500 focus:border-[#A8742E] focus:outline-none"
            >
              {product.options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}{' '}
                  {(option.priceDiff ?? option.price) > 0
                    ? `(+${formatPrice(option.priceDiff ?? option.price)})`
                    : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {isSellable && (
          <div className="mt-5 flex items-center justify-between rounded-2xl border border-[#E7E0D5] bg-[#FAF8F3] px-5 py-4">
            <span className="text-sm font-semibold text-[#17211D]">수량</span>
            <div className="flex items-center overflow-hidden rounded-full border border-[#E7E0D5] bg-white">
              <button
                type="button"
                aria-label="수량 줄이기"
                disabled={quantity <= 1}
                onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                className="flex size-10 items-center justify-center text-[#6F766F] transition-colors duration-500 hover:bg-[#F3EEE6] hover:text-[#17211D] disabled:opacity-35"
              >
                <Minus className="size-4" />
              </button>
              <span className="flex h-10 w-12 items-center justify-center border-x border-[#E7E0D5] text-sm font-semibold tabular-nums text-[#17211D]">
                {quantity}
              </span>
              <button
                type="button"
                aria-label="수량 늘리기"
                disabled={quantity >= product.stock}
                onClick={() => setQuantity((current) => Math.min(product.stock, current + 1))}
                className="flex size-10 items-center justify-center text-[#6F766F] transition-colors duration-500 hover:bg-[#F3EEE6] hover:text-[#17211D] disabled:opacity-35"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>
        )}

        {isSellable && (
          <div className="mt-6 flex items-baseline justify-between border-t border-[#E7E0D5] pt-5">
            <span className="text-sm font-semibold text-[#6F766F]">상품 금액</span>
            <span className="text-2xl font-bold tabular-nums tracking-tight text-[#17211D]">{formatPrice(totalPrice)}</span>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            aria-pressed={wishlisted}
            aria-label={wishlisted ? '관심 상품에서 빼기' : '관심 상품에 담기'}
            onClick={handleWishlist}
            className={`flex size-12 shrink-0 items-center justify-center rounded-full border transition-colors duration-500 ${
              wishlisted
                ? 'border-[#9E3939]/30 bg-[#9E3939]/5 text-[#9E3939]'
                : 'border-[#E7E0D5] bg-white text-[#6F766F] hover:border-[#D8C4A3] hover:bg-[#F3EEE6]'
            }`}
          >
            <Heart className={`size-5 ${wishlisted ? 'fill-current' : ''}`} />
          </button>

          {isSellable ? (
            <>
              <button type="button" onClick={handleAddToCart} className="btn-secondary flex-1 px-4">
                <ShoppingCart className="size-4" />
                장바구니
              </button>
              <button type="button" onClick={handleBuyNow} className="btn-primary flex-1 px-4">
                <CreditCard className="size-4" />
                바로 구매
              </button>
            </>
          ) : (
            <button type="button" disabled className="btn-primary flex-1 cursor-not-allowed opacity-55">
              {hasPrice ? '잠시 품절' : '판매 준비 중'}
            </button>
          )}
        </div>

        <p aria-live="polite" className={`mt-3 text-sm font-semibold text-[#2F3B34] ${cartMessage ? '' : 'sr-only'}`}>
          {cartMessage}
        </p>

        <ProductPurchaseInfo product={product} />
      </div>
    </div>
  );
}
