'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Minus, Plus, ShoppingCart, CreditCard, Star } from 'lucide-react';
import { Product } from '@/types';
import { formatPrice, calcDiscount } from '@/lib/format';
import { addToCart } from '@/lib/cart';
import { toggleWishlist, isWishlisted } from '@/lib/storage';
import { useMounted } from '@/lib/useMounted';

interface Props {
  product: Product;
}

export default function ProductDetailClient({ product }: Props) {
  const router = useRouter();
  const mounted = useMounted();
  const [quantity, setQuantity] = useState(1);
  const [selectedOption, setSelectedOption] = useState(product.options?.[0]?.id || '');
  const [, refreshWishlist] = useState(0);
  const wishlisted = mounted && isWishlisted(product.id);
  // brandName 은 repo 가 조인해 내려준다(콘센트 — src/types/index.ts Product.brandName).
  const brandName = product.brandName ?? product.brandId;

  const handleWishlist = () => {
    toggleWishlist(product.id);
    refreshWishlist((version) => version + 1);
  };

  const currentOption = product.options?.find(o => o.id === selectedOption);
  
  const hasPrice = product.price !== null && product.price !== undefined;
  const basePrice = hasPrice ? (product.salePrice ?? product.price!) : 0;
  const optionPrice = currentOption?.priceDiff ?? currentOption?.price ?? 0;
  
  const finalPrice = basePrice + optionPrice;
  const totalPrice = finalPrice * quantity;
  const discount = hasPrice ? calcDiscount(product.price!, product.salePrice ?? undefined) : 0;

  const handleAddToCart = () => {
    if (!hasPrice) {
      alert('가격을 먼저 확인해주세요.');
      router.push('/login');
      return;
    }
    addToCart({
      productId: product.id,
      optionId: selectedOption || undefined,
      quantity,
    });
    alert('장바구니에 담겼습니다.');
  };

  const handleBuyNow = () => {
    if (!hasPrice) {
      alert('가격을 먼저 확인해주세요.');
      router.push('/login');
      return;
    }
    addToCart({
      productId: product.id,
      optionId: selectedOption || undefined,
      quantity,
    });
    router.push('/checkout');
  };

  return (
    <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
      {/* Image Gallery */}
      <div className="w-full lg:w-1/2">
        <div className="flex aspect-square w-full items-center justify-center rounded-[18px] border border-[rgba(15,23,42,0.08)] bg-white p-12 shadow-sm overflow-hidden relative group">
          <div className="flex h-full w-[72%] flex-col items-center justify-center border border-[rgba(15,23,42,0.04)] bg-[#FBFAF7] text-center shadow-sm rounded-xl group-hover:scale-[1.02] transition-transform duration-500">
            <span className="font-editorial text-6xl italic text-slate-300">{product.category.slice(0, 1)}</span>
            <span className="mt-6 text-[10px] font-semibold tracking-widest text-[#17211D]">BAEKJO CURATION</span>
            <span className="mt-2 text-[10px] text-slate-400">{product.name}</span>
          </div>
        </div>
        <div className="mt-4 flex gap-4 overflow-x-auto hide-scrollbar pb-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="aspect-square w-20 shrink-0 rounded-[12px] bg-white border border-[rgba(15,23,42,0.08)] shadow-sm flex items-center justify-center text-[10px] font-medium text-slate-400 hover:border-[#17211D] transition-colors cursor-pointer">
              VIEW {i}
            </div>
          ))}
        </div>
      </div>

      {/* Product Info */}
      <div className="w-full lg:w-1/2 flex flex-col pt-2">
        <div className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">{brandName}</div>
        <h1 className="text-3xl font-bold text-[#17211D] tracking-tight text-balance leading-tight">{product.name}</h1>

        <div className="mt-4 flex items-center gap-2 text-sm text-[#17211D]">
          <Star className="size-4 fill-[#17211D]" />
          <span className="font-semibold tabular-nums">{product.rating}</span>
          <span className="text-slate-400 ml-1">구매평 {product.reviewCount}개</span>
        </div>
        
        <div className="mt-8 flex items-end gap-3 pb-8 border-b border-[rgba(15,23,42,0.06)]">
          {!hasPrice ? (
            <span className="text-3xl font-bold text-[#17211D] tracking-tight">
              {product.isMembersOnlyPrice ? '판매가 회원공개' : '판매가 확인 필요'}
            </span>
          ) : (
            <>
              {discount > 0 && (
                <span className="text-3xl font-bold text-red-600 tracking-tight">{discount}%</span>
              )}
              <span className="text-3xl font-bold text-[#17211D] tracking-tight">{formatPrice(product.salePrice || product.price!)}</span>
              {discount > 0 && (
                <span className="text-lg text-slate-400 line-through pb-1 ml-1 font-medium">{formatPrice(product.price!)}</span>
              )}
            </>
          )}
        </div>

        <div className="mt-8 space-y-4 text-sm">
          <div className="flex">
            <span className="w-24 text-slate-500 font-medium">배송비</span>
            <span className="text-[#334155]">
              {product.shippingFee !== undefined
                ? `${formatPrice(product.shippingFee)} (50,000원 이상 무료배송)`
                : '공식 판매가 확인 후 안내'}
            </span>
          </div>
          <div className="flex">
            <span className="w-24 text-slate-500 font-medium">적립금</span>
            <span className="text-[#334155]">최대 5% 적립</span>
          </div>
        </div>

        {/* Options */}
        {product.options && product.options.length > 0 && (
          <div className="mt-10">
            <label className="block text-sm font-semibold text-[#17211D] mb-3">옵션 선택</label>
            <div className="relative">
              <select 
                value={selectedOption}
                onChange={(e) => setSelectedOption(e.target.value)}
                className="w-full appearance-none rounded-[12px] border border-[rgba(15,23,42,0.12)] bg-white px-4 py-4 text-sm text-[#17211D] focus:border-[#17211D] focus:outline-none focus:ring-1 focus:ring-[#17211D] shadow-sm transition-all"
              >
                {product.options.map(opt => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name} {(opt.priceDiff ?? opt.price) > 0 ? `(+${formatPrice(opt.priceDiff ?? opt.price)})` : ''}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* Quantity */}
        <div className="mt-8 flex items-center justify-between rounded-[16px] bg-[#FBFAF7] border border-[rgba(15,23,42,0.06)] p-5">
          <span className="text-sm font-semibold text-[#17211D]">수량</span>
          <div className="flex items-center rounded-lg border border-[rgba(15,23,42,0.12)] bg-white shadow-sm overflow-hidden">
            <button 
              type="button"
              aria-label="수량 줄이기"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="flex h-10 w-10 items-center justify-center text-slate-400 hover:text-[#17211D] hover:bg-slate-50 transition-colors"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="flex h-10 w-12 items-center justify-center text-sm font-semibold text-[#17211D] border-x border-[rgba(15,23,42,0.06)]">
              {quantity}
            </span>
            <button 
              type="button"
              aria-label="수량 늘리기"
              onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
              className="flex h-10 w-10 items-center justify-center text-slate-400 hover:text-[#17211D] hover:bg-slate-50 transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Total */}
        {hasPrice && (
          <div className="mt-8 flex items-end justify-between pt-6 border-t border-[rgba(15,23,42,0.06)]">
            <span className="text-base font-semibold text-[#334155]">총 상품금액</span>
            <span className="text-3xl font-bold text-[#17211D] tracking-tight">{formatPrice(totalPrice)}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex gap-3">
          <button 
            type="button"
            aria-label={wishlisted ? '찜 해제' : '찜하기'}
            onClick={handleWishlist}
            className={`flex h-[60px] w-[60px] items-center justify-center shrink-0 rounded-[16px] border transition-all shadow-sm ${wishlisted ? 'border-red-500 bg-red-50 text-red-500' : 'border-[rgba(15,23,42,0.12)] bg-white text-slate-400 hover:border-[#17211D] hover:text-[#17211D]'}`}
          >
            <Heart className={`h-6 w-6 ${wishlisted ? 'fill-current' : ''}`} strokeWidth={wishlisted ? 1.5 : 2} />
          </button>
          
          {hasPrice ? (
            <>
              <button 
                type="button"
                onClick={handleAddToCart}
                className="flex h-[60px] flex-1 items-center justify-center rounded-[16px] border border-[rgba(15,23,42,0.12)] bg-white text-base font-semibold text-[#17211D] hover:bg-slate-50 hover:border-[#17211D] transition-all shadow-sm"
              >
                <ShoppingCart className="mr-2 h-5 w-5" /> 장바구니
              </button>
              <button 
                type="button"
                onClick={handleBuyNow}
                className="flex h-[60px] flex-1 items-center justify-center rounded-[16px] bg-[#17211D] text-base font-semibold text-white hover:bg-[#334155] transition-all shadow-md"
              >
                <CreditCard className="mr-2 h-5 w-5" /> 바로구매
              </button>
            </>
          ) : (
            <button 
              type="button"
              onClick={() => router.push('/login')}
              className="flex h-[60px] flex-1 items-center justify-center rounded-[16px] bg-[#17211D] text-base font-semibold text-white hover:bg-[#334155] transition-all shadow-md"
            >
              로그인 후 가격 확인
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
