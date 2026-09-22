'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, ShoppingBag, Star, Package } from 'lucide-react';
import { useEffect, useState } from 'react';
import { addToCart } from '@/lib/cart';
import { calcDiscount, formatPrice } from '@/lib/format';
import { getCurrentUser, getSessionUser, getWishlist, isWishlisted, STORAGE_EVENTS, toggleWishlist } from '@/lib/storage';
import { useMounted } from '@/lib/useMounted';
import { formatBrandDisplayName } from '@/lib/brands/presentation';
import type { Product } from '@/types';
import { isProductCommerceReady } from '@/lib/products/commerceReadiness';
import { useProductTagSettings } from '@/components/providers/ProductTagSettingsProvider';

interface ProductCardProps {
  product: Product;
  variant?: 'default' | 'shop' | 'home' | 'brand-detail-horizontal';
  density?: 'default' | 'compact';
  mobileLayout?: 'vertical' | 'horizontal';
}

export default function ProductCard({
  product,
  variant = 'default',
  density = 'default',
  mobileLayout = 'vertical',
}: ProductCardProps) {
  const router = useRouter();
  const mounted = useMounted();
  const { labelBySlug, visibleSlugs, hiddenSlugs } = useProductTagSettings();
  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistBusy, setWishlistBusy] = useState(false);
  const [cartMessage, setCartMessage] = useState('');
  const brandName = formatBrandDisplayName(product.brandName ?? product.brandId);
  const hasPrice = product.price !== null && product.price !== undefined;
  const commerceReady = isProductCommerceReady(product);
  const isSellable = hasPrice && product.stock > 0 && commerceReady;
  const isShopCard = variant === 'shop';
  const isHomeCard = variant === 'home';
  const isBrandDetailHorizontal = variant === 'brand-detail-horizontal';
  const isCompact = density === 'compact';
  const isMobileHorizontal = mobileLayout === 'horizontal';
  const discount = hasPrice ? calcDiscount(product.price!, product.salePrice ?? undefined) : 0;
  const detailHref = `/shop/${product.id}`;
  const brandAuditHref = product.brandId
    ? `/brands/${encodeURIComponent(product.brandId)}#brand-audit`
    : '/brands';
  const summary = product.summary?.trim();
  // 관리자가 숨긴(hiddenSlugs) 태그는 완전히 제외하고, 등록된 태그는 isVisible로 노출을 가른다.
  // 아직 사전에 등록되지 않은 과거 태그(labelBySlug에 없음)는 예전과 동일하게 원문 그대로 보여준다.
  const visibleConcernTags = (product.concernTags ?? []).filter(
    (tag) => !hiddenSlugs.includes(tag) && (visibleSlugs.includes(tag) || !(tag in labelBySlug)),
  );

  useEffect(() => {
    if (!mounted || !getCurrentUser()) return;
    let active = true;
    const syncWishlist = () => {
      getWishlist().then(() => {
        if (active) setWishlisted(isWishlisted(product.id));
      });
    };
    syncWishlist();
    window.addEventListener(STORAGE_EVENTS.WISHLIST_CHANGED, syncWishlist);
    return () => {
      active = false;
      window.removeEventListener(STORAGE_EVENTS.WISHLIST_CHANGED, syncWishlist);
    };
  }, [mounted, product.id]);

  const handleWishlist = async () => {
    if (wishlistBusy) return;
    setWishlistBusy(true);
    try {
      const next = await toggleWishlist(product.id);
      setWishlisted(next);
    } catch (error) {
      if (error instanceof Error && error.message === 'login-required') {
        router.push(`/login?redirect=${encodeURIComponent(detailHref)}`);
      }
    } finally {
      setWishlistBusy(false);
    }
  };

  const handleCart = async () => {
    if (!isSellable) return;
    const user = await getSessionUser();
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(detailHref)}`);
      return;
    }
    addToCart({
      productId: product.id,
      optionId: product.options?.[0]?.id,
      quantity: 1,
    });
    setCartMessage('장바구니에 담았어요.');
    window.setTimeout(() => setCartMessage(''), 1800);
  };

  const availabilityLabel = !hasPrice || !commerceReady ? '판매 준비 중' : product.stock <= 0 ? '잠시 품절' : null;

  return (
    <article className={`group relative flex h-full min-w-0 flex-col overflow-hidden transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 ${isHomeCard ? 'rounded-[16px] border border-[#E7E2D9] bg-white hover:border-[#173C32] shadow-none' : 'rounded-[18px] border border-[#E3DCCF] bg-[#FFFEFB] hover:border-[#CFC3B1] hover:shadow-[0_8px_24px_rgba(23,37,31,0.05)]'}`}>
      <Link href={detailHref} className="absolute inset-0 z-0" aria-label={`${product.name} 상세 보기`} />

      <div className={isBrandDetailHorizontal
        ? "pointer-events-none relative z-10 flex flex-1 flex-col md:grid md:grid-cols-[minmax(180px,42%)_minmax(0,58%)] md:min-h-[230px]"
        : isMobileHorizontal
          ? "pointer-events-none relative z-10 grid flex-1 grid-cols-[116px_minmax(0,1fr)] grid-rows-[40px_1fr_auto] md:flex md:flex-col"
          : "pointer-events-none relative z-10 flex flex-1 flex-col"
      }>
        <div className={isBrandDetailHorizontal
          ? "flex min-h-12 shrink-0 flex-wrap items-center gap-1 overflow-visible bg-[#FFFEFB] px-2 py-2 md:col-span-2 md:row-start-1 md:hidden"
          : isMobileHorizontal
            ? "col-span-2 row-start-1 flex min-h-11 shrink-0 flex-wrap items-center gap-1 overflow-visible bg-[#FFFEFB] px-3 py-2"
            : isCompact
              ? "flex min-h-11 shrink-0 flex-wrap items-center gap-1 overflow-visible bg-[#FFFEFB] px-3 py-2"
              : "flex min-h-12 shrink-0 flex-wrap items-center gap-1 overflow-visible bg-[#FFFEFB] px-2 py-2 md:h-auto md:min-h-12 md:flex-wrap md:gap-1.5 md:px-4"
        }>
          {product.isBest && (
            <>
              <span className="shrink-0 whitespace-nowrap rounded-full bg-[#17211D] px-1.5 py-1 text-[11px] font-bold leading-none text-[#FBFAF7] md:px-2.5 md:text-[11px]">
                BEST
              </span>
              <Link
                href={brandAuditHref}
                prefetch={false}
                aria-label={`${brandName} 자체 큐레이션 기준 보기`}
                className="pointer-events-auto shrink-0 whitespace-nowrap text-[11px] font-semibold text-[#59615B] underline underline-offset-2 md:text-[10px]"
              >
                자체 큐레이션 · 기준 보기
              </Link>
            </>
          )}
          {availabilityLabel && (
            <span className="shrink-0 whitespace-nowrap rounded-full bg-[#FAF8F3] px-1.5 py-1 text-[11px] font-bold leading-none text-[#59615B] md:px-2.5 md:text-[11px]">
              {availabilityLabel}
            </span>
          )}
        </div>

        <div className={isBrandDetailHorizontal
          ? "relative w-full overflow-hidden bg-[#F2EEE6] aspect-square md:aspect-auto md:h-full md:col-start-1 md:row-span-2"
          : isMobileHorizontal
            ? "relative col-start-1 row-span-2 row-start-2 min-h-[220px] w-full overflow-hidden bg-[#F2EEE6] md:aspect-[4/3] md:min-h-0"
            : `relative w-full overflow-hidden ${isHomeCard ? 'bg-[#F5F3EE] aspect-square' : `bg-[#F2EEE6] ${isCompact ? 'aspect-[4/3]' : 'aspect-square'}`}`
        }>
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              loading={isMobileHorizontal ? 'eager' : 'lazy'}
              unoptimized={isMobileHorizontal}
              sizes={isMobileHorizontal
                ? '(max-width: 767px) 116px, (max-width: 1279px) 33vw, 25vw'
                : '(max-width: 767px) 50vw, (max-width: 1279px) 33vw, 25vw'
              }
              className={`object-contain transition-transform duration-700 ease-out group-hover:scale-105 ${isCompact ? 'p-3 md:p-4' : 'p-3 md:p-5'}`}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <div className="flex flex-col items-center gap-2 text-[#A39B90]">
                <Package className="h-7 w-7" />
                <span className="text-xs">상품 이미지 준비 중</span>
              </div>
            </div>
          )}
        </div>

        <div className={isBrandDetailHorizontal
          ? "flex flex-1 flex-col p-4 md:col-start-2 md:row-start-1 md:p-[24px]"
          : isMobileHorizontal
            ? "col-start-2 row-start-2 flex min-w-0 flex-col p-3 md:p-4"
            : `flex flex-1 flex-col ${isHomeCard ? 'p-[18px]' : isCompact ? 'p-4' : 'p-4 md:p-6'}`
        }>
          <p className="break-keep text-[13px] leading-[1.6] text-[#59615B]">{brandName}</p>
          <h3 className="mt-1.5 break-keep text-[15px] font-bold leading-[1.6] text-[#26332D] md:text-[16px]">
            {product.name}
          </h3>
          {summary && (
            <p className="mt-2 break-keep text-sm leading-[1.7] text-[#59615B]">
              {summary}
            </p>
          )}

          <div className={`mt-auto ${isHomeCard ? 'pt-[10px]' : isCompact ? 'pt-3' : 'pt-3 md:pt-[18px]'}`}>
            <div className={`flex flex-wrap items-baseline gap-y-1 ${isHomeCard ? 'gap-x-[8px]' : 'gap-x-1.5 md:gap-x-2'}`}>
              {hasPrice ? (
                <>
                  {discount > 0 && <span className={`font-bold text-[#7A4E1D] ${isHomeCard ? 'text-[13px]' : isCompact ? 'text-[13px]' : 'text-[13px] md:text-sm'}`}>{discount}%</span>}
                  <p className={`font-bold tracking-[-0.02em] text-[#17251F] ${isHomeCard ? 'text-[17px] lg:text-[18px]' : isCompact ? 'text-[17px]' : 'text-[15px] md:text-[19px]'}`}>
                    {formatPrice(product.salePrice || product.price!)}
                  </p>
                  {discount > 0 && (
                    <span className={`text-xs tabular-nums text-[#59615B] line-through ${isCompact ? 'basis-auto' : 'basis-full md:basis-auto'}`}>{formatPrice(product.price!)}</span>
                  )}
                </>
              ) : (
                <p className={`font-bold tracking-[-0.02em] text-[#17251F] ${isHomeCard ? 'text-[17px] lg:text-[18px]' : isCompact ? 'text-[17px]' : 'text-[15px] md:text-[19px]'}`}>가격 협의</p>
              )}
            </div>
            <p className="mt-2 break-keep text-xs font-medium leading-[1.6] text-[#59615B]">
              실제 판매자 · {product.seller?.legalName || product.seller?.displayName || '판매자 정보 확인 중'}
            </p>

            {product.reviewCount > 0 && (
              <div className={`flex items-center text-[#59615B] ${isHomeCard ? 'mt-[6px] text-[12px]' : isCompact ? 'mt-2 text-[11px]' : 'mt-[8px] text-[11px] md:mt-[12px] md:text-[13px]'}`}>
                <Star className="size-2.5 md:size-3 fill-[#D8C4A3] text-[#D8C4A3]" aria-hidden="true" />
                <span className="ml-1 font-medium tabular-nums">{product.rating}</span>
                <span className="mx-1.5">·</span>
                <span className="tabular-nums">후기 {product.reviewCount}</span>
              </div>
            )}

            {!isShopCard && visibleConcernTags.length > 0 && (
              <div className={`mt-[10px] flex flex-wrap gap-[6px] ${isHomeCard ? '' : isCompact ? 'min-h-6' : 'min-h-[28px]'}`}>
                {visibleConcernTags.slice(0, isHomeCard ? 2 : visibleConcernTags.length).map((tag) => (
                  <span key={tag} className={`flex items-center justify-center rounded-full bg-[#FAF8F3] text-[#59615B] ${isHomeCard ? 'px-[8px] h-[22px] text-[11px]' : 'px-[9px] md:px-[11px] h-[24px] md:h-[28px] text-[11px] md:text-[12px]'}`}>
                    {labelBySlug[tag] ?? tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={isBrandDetailHorizontal
          ? "pointer-events-auto px-4 pb-4 md:col-start-2 md:row-start-2 md:mt-auto md:px-[24px] md:pb-[24px] md:pt-0"
          : isMobileHorizontal
            ? "pointer-events-auto col-start-2 row-start-3 px-3 pb-3 md:px-4 md:pb-4"
            : `pointer-events-auto ${isHomeCard ? 'px-[18px] pb-[18px]' : isCompact ? 'px-4 pb-4' : 'px-4 pb-4 md:px-6 md:pb-6'}`
        }>
          {cartMessage && (
            <div role="status" className="mb-2 rounded-xl bg-[#17211D] px-3 py-2 text-center text-xs font-semibold text-[#FBFAF7]">
              {cartMessage}
            </div>
          )}
          <div className="flex flex-wrap gap-2 sm:flex-nowrap">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                void handleCart();
              }}
              disabled={!isSellable}
              className={`flex min-w-[72px] flex-1 items-center justify-center gap-1 bg-white font-semibold transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-50 ${isHomeCard ? 'rounded-[10px] min-h-11 border border-[#E7E2D9] text-[#17211D] hover:border-[#173C32] hover:bg-[#173C32] hover:text-white px-2 text-[13px]' : `rounded-xl border border-[#E7E0D5] text-[#17211D] hover:bg-[#F3EEE6] px-1.5 ${isCompact ? 'min-h-11 text-[13px]' : 'min-h-11 text-[13px] sm:min-h-[44px] sm:gap-1.5 sm:px-2 sm:text-sm'}`}`}
            >
              <ShoppingBag className="hidden size-3.5 shrink-0 min-[361px]:block sm:size-4" />
              <span className="whitespace-nowrap">{isSellable ? '장바구니' : (availabilityLabel ?? '구매 불가')}</span>
            </button>
            <button
              type="button"
              aria-label={wishlisted ? `${product.name} 찜 해제` : `${product.name} 찜하기`}
              onClick={(e) => {
                e.preventDefault();
                void handleWishlist();
              }}
              disabled={wishlistBusy}
              className={`flex shrink-0 items-center justify-center bg-white transition-colors duration-300 ${isHomeCard ? 'rounded-[10px] min-h-11 w-11 border border-[#E7E2D9] text-[#17211D] hover:border-[#173C32] hover:bg-[#173C32] hover:text-white' : `rounded-xl border border-[#E7E0D5] text-[#17211D] hover:bg-[#F3EEE6] ${isCompact ? 'size-11' : 'size-11 sm:size-[44px]'}`}`}
            >
              <Heart className={`size-4 ${wishlisted ? 'fill-[#9E3939] text-[#9E3939]' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
