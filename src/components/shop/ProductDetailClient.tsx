'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Minus, Plus, ShoppingCart, CreditCard, Star } from 'lucide-react';
import { Product } from '@/types';
import { formatPrice, calcDiscount } from '@/lib/format';
import { addToCart } from '@/lib/cart';
import { getCurrentUser } from '@/lib/storage';
import { useMounted } from '@/lib/useMounted';
import { DEFAULT_COMMERCE_POLICY } from '@/data/company';
import { getProductPointsRateLabel } from '@/lib/products/points';

interface Props {
  product: Product;
}

export default function ProductDetailClient({ product }: Props) {
  const router = useRouter();
  const mounted = useMounted();
  const [quantity, setQuantity] = useState(1);
  const [selectedOption, setSelectedOption] = useState(product.options?.[0]?.id || '');
  const gallery = (product.images?.length ? product.images : [product.image]).filter(Boolean);
  const [activeImage, setActiveImage] = useState(0);

  // 상품 전환 시 로컬 state 재동기화(이전 상품의 인덱스·수량 잔존 방지)
  // — effect 내 동기 setState 는 lint(cascading render) 에러라 렌더 단계 리셋 패턴 사용.
  const [prevProductId, setPrevProductId] = useState(product.id);
  if (prevProductId !== product.id) {
    setPrevProductId(product.id);
    setActiveImage(0);
    setQuantity(1);
    // 파생 검증(validOption)만으론 다른 상품이 같은 옵션 id 를 쓸 때 이전 선택이 유효 매치로
    // 넘어오므로, 상품 전환 시점 리셋을 병행한다.
    setSelectedOption(product.options?.[0]?.id || '');
  }
  // brandName 은 repo 가 조인해 내려준다(콘센트 — src/types/index.ts Product.brandName).
  const brandName = product.brandName ?? product.brandId;


  // 옵션은 상태를 믿지 않고 매 렌더 검증 — 현재 상품에 없는 옵션 ID는 첫 옵션으로 대체
  const validOption = product.options?.find(o => o.id === selectedOption) ?? product.options?.[0];
  const effectiveOptionId = validOption?.id ?? '';

  const hasPrice = product.price !== null && product.price !== undefined;
  const basePrice = hasPrice ? (product.salePrice ?? product.price!) : 0;
  const optionPrice = validOption?.priceDiff ?? validOption?.price ?? 0;

  const finalPrice = basePrice + optionPrice;
  // 표시·계산·핸들러 전달 수량 일원화 — stock 변동과 무관하게 항상 1 이상으로 클램프
  const displayQty = Math.max(1, Math.min(quantity, Math.max(1, product.stock)));
  const totalPrice = finalPrice * displayQty;
  const discount = hasPrice ? calcDiscount(product.price!, product.salePrice ?? undefined) : 0;
  const isSellable = hasPrice && product.stock > 0;
  const currentUser = mounted ? getCurrentUser() : null;
  const isAdminViewer = currentUser?.role === 'admin';
  const unavailableTitle = isAdminViewer
    ? '판매가 미입력'
    : product.isMembersOnlyPrice
      ? '회원 전용가 등록 대기'
      : '판매가 등록 대기';
  const unavailableDescription = isAdminViewer
    ? '관리자 상품 편집에서 판매가와 재고를 입력하면 장바구니와 바로구매가 활성화됩니다.'
    : '판매가가 확정되면 장바구니와 바로구매를 이용할 수 있습니다.';
  const adminEditLabel = hasPrice ? '관리자 상품 정보 수정' : '관리자에서 판매가 입력';
  // 방어적 인덱스 클램프 — gallery 축소(상품 전환 직후 렌더) 시 undefined src 방지
  const safeIndex = Math.min(activeImage, gallery.length - 1);
  const currentImage = gallery[safeIndex];
  const pointsRateLabel = getProductPointsRateLabel(product);

  const handleAddToCart = () => {
    if (!hasPrice) {
      alert('가격을 먼저 확인해주세요.');
      router.push('/login');
      return;
    }
    if (product.stock <= 0) {
      alert('일시 품절된 상품입니다.');
      return;
    }
    addToCart({
      productId: product.id,
      optionId: effectiveOptionId || undefined,
      quantity: displayQty,
    });
    alert('장바구니에 담겼습니다.');
  };

  const handleBuyNow = () => {
    if (!hasPrice) {
      alert('가격을 먼저 확인해주세요.');
      router.push('/login');
      return;
    }
    if (product.stock <= 0) {
      alert('일시 품절된 상품입니다.');
      return;
    }
    addToCart({
      productId: product.id,
      optionId: effectiveOptionId || undefined,
      quantity: displayQty,
    });
    router.push('/checkout');
  };

  return (
    <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
      {/* Image Gallery */}
      <div className="w-full lg:w-1/2">
        {gallery.length > 0 ? (
          <>
            <div className="relative aspect-square w-full overflow-hidden rounded-[18px] border border-[rgba(15,23,42,0.08)] bg-[#F3EEE6] shadow-sm">
              <Image
                src={currentImage}
                alt={product.name}
                fill
                sizes="(max-width:1024px) 100vw, 50vw"
                className="object-contain p-8 sm:p-12"
              />
            </div>
            {gallery.length > 1 && (
              <div className="mt-4 flex gap-4 overflow-x-auto hide-scrollbar pb-2">
                {gallery.map((src, i) => (
                  <button
                    key={src + i}
                    type="button"
                    onClick={() => setActiveImage(i)}
                    aria-label={`${product.name} 이미지 ${i + 1}`}
                    className={`relative aspect-square w-20 shrink-0 overflow-hidden rounded-[12px] bg-[#F3EEE6] border shadow-sm transition-colors ${
                      i === safeIndex ? 'border-[#17211D]' : 'border-[rgba(15,23,42,0.08)] hover:border-[#17211D]'
                    }`}
                  >
                    <Image src={src} alt="" fill sizes="80px" className="object-contain p-1.5" />
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="flex aspect-square w-full items-center justify-center rounded-[18px] border border-[rgba(15,23,42,0.08)] bg-white p-12 shadow-sm overflow-hidden relative group">
            <div className="flex h-full w-[72%] flex-col items-center justify-center border border-[rgba(15,23,42,0.04)] bg-[#FBFAF7] text-center shadow-sm rounded-xl group-hover:scale-[1.02] transition-transform duration-500">
              <span className="font-editorial text-6xl italic text-[#8A918B]">{product.category.slice(0, 1)}</span>
              <span className="mt-6 text-[10px] font-semibold tracking-widest text-[#17211D]">BAEKJO CURATION</span>
              <span className="mt-2 text-[10px] text-[#6F766F]">{product.name}</span>
            </div>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="w-full lg:w-1/2 flex flex-col pt-2">
        <div className="mb-3 text-sm font-semibold tracking-wide text-[#6F766F] uppercase">{brandName}</div>
        <h1 className="text-3xl font-bold text-[#17211D] tracking-tight text-balance leading-tight">{product.name}</h1>

        <div className="mt-4 flex items-center gap-2 text-sm text-[#17211D]">
          <Star className="size-4 fill-[#17211D]" />
          <span className="font-semibold tabular-nums">{product.rating}</span>
          <span className="text-[#8A918B] ml-1">구매평 {product.reviewCount}개</span>
        </div>

        <div className="mt-8 border-b border-[rgba(15,23,42,0.06)] pb-8">
          <div className="flex items-end gap-3">
            {!hasPrice ? (
              <span className="text-3xl font-bold text-[#17211D] tracking-tight">
                {unavailableTitle}
              </span>
            ) : (
              <>
                {discount > 0 && (
                  <span className="text-3xl font-bold text-[#A8742E] tracking-tight">{discount}%</span>
                )}
                <span className="text-3xl font-bold text-[#17211D] tracking-tight">{formatPrice(product.salePrice || product.price!)}</span>
                {discount > 0 && (
                  <span className="text-lg text-[#8A918B] line-through pb-1 ml-1 font-medium">{formatPrice(product.price!)}</span>
                )}
              </>
            )}
          </div>
          {!hasPrice && (
            <p className="mt-3 break-keep text-sm leading-6 text-[#6F766F]">{unavailableDescription}</p>
          )}
        </div>

        <div className="mt-8 space-y-4 text-sm">
          <div className="flex">
            <span className="w-24 text-[#6F766F] font-medium">배송비</span>
            <span className="text-[#6F766F]">
              {product.shippingFee !== undefined
                ? `${formatPrice(product.shippingFee)} (50,000원 이상 무료배송)`
                : DEFAULT_COMMERCE_POLICY.shippingLabel}
            </span>
          </div>
          {pointsRateLabel && (
            <div className="flex">
              <span className="w-24 text-[#6F766F] font-medium">적립금</span>
              <span className="text-[#6F766F]">상품금액 기준 {pointsRateLabel} 적립 설정</span>
            </div>
          )}
        </div>

        {/* Options */}
        {product.options && product.options.length > 0 && (
          <div className="mt-10">
            <label className="block text-sm font-semibold text-[#17211D] mb-3">옵션 선택</label>
            <div className="relative">
              <select 
                value={effectiveOptionId}
                onChange={(e) => setSelectedOption(e.target.value)}
                className="w-full appearance-none rounded-[12px] border border-[rgba(15,23,42,0.12)] bg-white px-4 py-4 text-sm text-[#17211D] focus:border-[#17211D] focus:outline-none focus:ring-1 focus:ring-[#17211D] shadow-sm transition-all"
              >
                {product.options.map(opt => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name} {(opt.priceDiff ?? opt.price) > 0 ? `(+${formatPrice(opt.priceDiff ?? opt.price)})` : ''}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#6F766F]">
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
              onClick={() => setQuantity(Math.max(1, displayQty - 1))}
              disabled={!isSellable}
              className="flex h-10 w-10 items-center justify-center text-[#8A918B] hover:text-[#17211D] hover:bg-[#F4F2EC] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="flex h-10 w-12 items-center justify-center text-sm font-semibold text-[#17211D] border-x border-[rgba(15,23,42,0.06)]">
              {displayQty}
            </span>
            <button 
              type="button"
              aria-label="수량 늘리기"
              onClick={() => setQuantity(Math.min(product.stock, displayQty + 1))}
              disabled={!isSellable}
              className="flex h-10 w-10 items-center justify-center text-[#8A918B] hover:text-[#17211D] hover:bg-[#F4F2EC] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Total */}
        {hasPrice && (
          <div className="mt-8 flex items-end justify-between pt-6 border-t border-[rgba(15,23,42,0.06)]">
            <span className="text-base font-semibold text-[#6F766F]">총 상품금액</span>
            <span className="text-3xl font-bold text-[#17211D] tracking-tight">{formatPrice(totalPrice)}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex gap-3">
          {hasPrice ? (
            <>
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!isSellable}
                className="flex h-[60px] flex-1 items-center justify-center rounded-[16px] border border-[rgba(15,23,42,0.12)] bg-white text-base font-semibold text-[#17211D] hover:bg-[#F4F2EC] hover:border-[#17211D] transition-all shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ShoppingCart className="mr-2 h-5 w-5" /> {isSellable ? '장바구니' : '품절'}
              </button>
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={!isSellable}
                className="flex h-[60px] flex-1 items-center justify-center rounded-[16px] bg-[#17211D] text-base font-semibold text-white hover:bg-[#2F3B34] transition-all shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CreditCard className="mr-2 h-5 w-5" /> {isSellable ? '바로구매' : '품절'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="flex h-[60px] flex-1 cursor-not-allowed items-center justify-center rounded-[16px] border border-[rgba(15,23,42,0.12)] bg-white text-base font-semibold text-[#6F766F] opacity-70 shadow-sm"
              >
                <ShoppingCart className="mr-2 h-5 w-5" /> 장바구니 준비중
              </button>
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="flex h-[60px] flex-1 cursor-not-allowed items-center justify-center rounded-[16px] bg-[#17211D]/45 text-base font-semibold text-white opacity-80 shadow-md"
              >
                <CreditCard className="mr-2 h-5 w-5" /> 결제 준비중
              </button>
            </>
          )}
        </div>
        {isAdminViewer && (
          <button
            type="button"
            onClick={() => router.push(`/admin/products/${product.id}`)}
            className="mt-3 flex h-12 w-full items-center justify-center rounded-[14px] border border-[#A8742E]/30 bg-[#A8742E]/10 text-sm font-semibold text-[#7A4E1D] transition-colors hover:bg-[#A8742E]/15"
          >
            {adminEditLabel}
          </button>
        )}

      </div>
    </div>
  );
}
