'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { clearCart, getCart, pruneCartToVisibleProducts, removeFromCart, updateCartQuantity } from '@/lib/cart';
import { getPublicProductsOrNull, getPublicBrands, getSessionUser, isLoggedIn } from '@/lib/storage';
import { formatPrice } from '@/lib/format';
import { CartItem, Product, Brand } from '@/types';
import EmptyState from '@/components/common/EmptyState';
import { useMounted } from '@/lib/useMounted';
import { calcBrandDeliveryFee } from '@/lib/orderPolicy';
import MarketplaceNotice from '@/components/common/MarketplaceNotice';
import { isProductCommerceReady } from '@/lib/products/commerceReadiness';

export default function CartPage() {
  const router = useRouter();
  const mounted = useMounted();
  const [, refreshCart] = useState(0);
  // 카트 항목은 localStorage(클라이언트) 기준이라 어떤 상품이 필요한지 서버에서
  // 미리 알 수 없다 → 전체 카탈로그를 마운트 시 한 번 불러와 로컬에서 조인한다.
  // 브랜드명도 같은 방식(마운트 시 1회 조회, OrdersSection.tsx 패턴 미러) — product.brandName은
  // admin이 상세 detail에 직접 입력했을 때만 채워지는 선택 필드라 신뢰할 수 없고, product에는
  // brandId(내부 코드, 예 'b2')만 항상 있어 화면에 원값을 그대로 노출하면 안 된다.
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSessionUser().then((user) => {
      if (cancelled) return;
      if (!user) {
        clearCart();
        router.replace('/login?redirect=/cart');
        return;
      }
      setSessionChecked(true);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!sessionChecked) return;
    let cancelled = false;
    Promise.all([getPublicProductsOrNull(), getPublicBrands()]).then(([productList, brandList]) => {
      if (cancelled) return;
      // 자가치유(wave-6 발견 수정) — 노출 상품 목록이 곧 "유효한 카트 항목"의 기준이다.
      // 숨겨지거나 삭제된 상품이 카트에 남아 있으면 여기서 localStorage 자체를 정리해
      // 헤더 뱃지(getCartCount)와 이 화면이 다시 같은 개수를 보게 만든다 — 화면 필터
      // (enrichedItems)만으로는 뱃지가 안 맞았다.
      //
      // ⚠️ CRITICAL(2026-07-19, PR #173 리뷰에서 발견) — productList가 null(=조회 실패:
      // 네트워크 오류·!ok·파싱 실패)일 때 정리를 절대 돌리면 안 된다. getPublicProducts()의
      // "실패는 빈 배열로 접는다" 계약을 그대로 썼더니 일시적 네트워크 블립이 "노출 상품
      // 0건"으로 오인돼 고객 카트 전체가 영구 삭제됐다 — 그래서 실패와 진짜 0건을 구분하는
      // getPublicProductsOrNull()로 바꿨다(null=실패). null이면 이번 방문에서는 자가치유를
      // 건너뛸 뿐이고 localStorage는 그대로 남으며, 다음 정상 방문에서 다시 시도된다.
      if (productList !== null) {
        pruneCartToVisibleProducts(new Set(productList.map((product) => product.id)));
      }
      setProducts(productList ?? []);
      setBrands(brandList);
      setProductsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [sessionChecked]);

  if (!mounted || !sessionChecked || productsLoading) return null;

  const cartItems: CartItem[] = getCart();

  const handleUpdateQuantity = (productId: string, optionId: string | undefined, qty: number) => {
    updateCartQuantity(productId, optionId, qty);
    refreshCart((version) => version + 1);
  };

  const handleRemove = (productId: string, optionId?: string) => {
    removeFromCart(productId, optionId);
    refreshCart((version) => version + 1);
  };

  const enrichedItems = cartItems.map(item => {
    const product = products.find(p => p.id === item.productId);
    const option = product?.options?.find(o => o.id === item.optionId);
    const hasPrice = product?.price !== null && product?.price !== undefined;
    const basePrice = hasPrice ? (product?.salePrice || product?.price || 0) : 0;
    const optionPrice = option?.priceDiff ?? option?.price ?? 0;
    const price = basePrice + optionPrice;
    const brandName = product?.brandName || brands.find(b => b.id === product?.brandId)?.name || product?.brandId;
    // 상품 상세 페이지와 동일한 재고 판단 기준(ProductDetailClient.tsx: isSellable = hasPrice && stock > 0).
    // stock 정보가 없는 상품(product 자체가 안 실린 경우)은 아래 filter(item.product)에서 이미 걸러진다.
    const productStock = product?.stock ?? null;
    const stock = option?.stock === undefined
      ? productStock
      : productStock === null
        ? option.stock
        : Math.min(productStock, option.stock);
    const isSoldOut = stock !== null && stock <= 0;
    const isOverStock = stock !== null && stock > 0 && item.quantity > stock;
    const commerceReady = product ? isProductCommerceReady(product) : false;

    return {
      ...item,
      product,
      option,
      hasPrice,
      price,
      totalPrice: hasPrice ? price * item.quantity : 0,
      brandName,
      stock,
      isSoldOut,
      isOverStock,
      commerceReady,
    };
  }).filter(item => item.product);

  const pricedItems = enrichedItems.filter(item => item.hasPrice);
  const unpricedItems = enrichedItems.filter(item => !item.hasPrice);

  const totalProductsPrice = pricedItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const deliveryFeeCalculation = calcBrandDeliveryFee(
    pricedItems.map((item) => ({
      brandId: item.product?.brandId ?? '',
      sellerKey: item.product?.sellerId ? `seller:${item.product.sellerId}` : `brand:${item.product?.brandId || 'unknown'}`,
      brandName: item.brandName,
      sellerName: item.product?.seller?.displayName,
      totalPrice: item.totalPrice,
      // 실제 판매자가 있으면 판매자 배송비를 우선 적용한다. 판매자는 있는데 배송비만 없으면
      // 브랜드 기본값이 아니라 0원(무료)으로 간주한다.
      shippingFee: item.product?.seller ? (item.product.seller.shippingFee ?? 0) : undefined,
      freeShippingThreshold: item.product?.seller?.freeShippingThreshold,
    })),
    brands,
  );
  const deliveryFee = deliveryFeeCalculation.deliveryFee;
  const finalPrice = totalProductsPrice + deliveryFee;
  const hasUnavailableItems = enrichedItems.some((item) => !item.commerceReady || item.isSoldOut || item.isOverStock);
  const checkoutHref = isLoggedIn() ? '/checkout' : '/login?redirect=/checkout';
  const sellerGroups = enrichedItems.reduce<Array<{
    key: string;
    label: string;
    legalName?: string;
    items: typeof enrichedItems;
  }>>((groups, item) => {
    const key = item.product?.sellerId ? `seller:${item.product.sellerId}` : `brand:${item.product?.brandId || 'unknown'}`;
    let group = groups.find((candidate) => candidate.key === key);
    if (!group) {
      group = {
        key,
        label: item.product?.seller?.displayName || item.product?.sellerName || item.brandName || '판매자 확인 필요',
        legalName: item.product?.seller?.legalName,
        items: [],
      };
      groups.push(group);
    }
    group.items.push(item);
    return groups;
  }, []);

  return (
    <div className="bg-[#F4F2EC] min-h-dvh py-8 md:py-12">
      <div className="site-container">
        <h1 className="text-xl md:text-2xl font-bold text-[#202521] mb-5 md:mb-8">장바구니</h1>
        
        {enrichedItems.length === 0 ? (
          <EmptyState 
            title="장바구니가 비어있습니다" 
            description="백조오브제의 프리미엄 상품들을 만나보세요." 
            actionLabel="쇼핑하러 가기" 
            actionHref="/shop"
          />
        ) : (
          <div className="space-y-5">
            <MarketplaceNotice />
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Cart Items */}
            <div className="lg:w-2/3 space-y-3 md:space-y-4">
              {sellerGroups.map((group) => {
                const groupSubtotal = group.items.reduce((sum, item) => sum + item.totalPrice, 0);
                const groupShippingFee = deliveryFeeCalculation.breakdown
                  .filter((fee) => fee.sellerKey
                    ? fee.sellerKey === group.key
                    : group.items.some((item) => item.product?.brandId === fee.brandId))
                  .reduce((sum, fee) => sum + fee.appliedDeliveryFee, 0);
                const dispatchEstimates = [...new Set(group.items.map((item) => item.product?.seller?.dispatchEstimate || item.product?.deliveryEstimate).filter(Boolean))];
                const returnPolicies = [...new Set(group.items.map((item) => item.product?.seller?.returnPolicy || item.product?.returnNotice).filter(Boolean))];
                return (
                <section key={group.key} className="overflow-hidden rounded-sm border border-gray-200 bg-[#FBF9F4] shadow-sm" aria-label={`${group.label} 판매 상품`}>
                  <header className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-4 py-3 md:px-6">
                    <div><p className="text-xs font-bold text-[#A8742E]">실제 판매자</p><h2 className="mt-0.5 text-sm font-bold text-[#202521]">{group.label}</h2></div>
                    <p className="text-xs text-gray-500">{group.legalName ? `${group.legalName} · ` : ''}{group.items.length}개 상품</p>
                  </header>
                  <div className="border-b border-gray-200 bg-white px-4 py-3 text-xs leading-5 text-[#59615B] md:px-6">
                    <p>이 상품의 판매자는 <strong className="text-[#17211D]">{group.legalName || group.label}</strong>이며, 백조 오브제는 판매자와 구매자 간 거래를 중개합니다.</p>
                    <dl className="mt-2 grid gap-1 sm:grid-cols-2">
                      <div><dt className="inline font-semibold">판매자별 상품금액 </dt><dd className="inline">{formatPrice(groupSubtotal)}</dd></div>
                      <div><dt className="inline font-semibold">판매자별 배송비 </dt><dd className="inline">{groupShippingFee === 0 ? '무료' : formatPrice(groupShippingFee)}</dd></div>
                      <div><dt className="inline font-semibold">출고 예정 </dt><dd className="inline">{dispatchEstimates.join(' / ') || '상품 상세 확인'}</dd></div>
                      <div><dt className="inline font-semibold">교환·반품 </dt><dd className="inline">{returnPolicies.join(' / ') || '배송·교환·환불 안내 확인'}</dd></div>
                    </dl>
                  </div>
                  <div className="space-y-3 p-3 md:p-4">
              {group.items.map((item, idx) => (
                <div key={`${item.productId}-${item.optionId || 'none'}-${idx}`} className="flex gap-3 sm:gap-4 bg-white p-4 md:p-6 rounded-sm shadow-sm border border-gray-100">
                  <Link
                    href={`/shop/${item.product?.id}`}
                    className="relative block h-[88px] w-[88px] sm:h-24 sm:w-24 shrink-0 overflow-hidden rounded-sm bg-[#F2EEE6]"
                  >
                    {item.product?.image ? (
                      <Image
                        src={item.product.image}
                        alt={item.product.name}
                        fill
                        sizes="96px"
                        className="object-contain p-1.5"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-xs text-[#A39B90]">
                        이미지 준비 중
                      </span>
                    )}
                  </Link>
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0">
                        <div className="text-[11px] md:text-xs font-medium text-gray-500 mb-1">{item.brandName}</div>
                        <Link href={`/shop/${item.product?.id}`} className="break-keep text-[14px] font-bold leading-[1.5] text-[#202521] transition-colors hover:text-[#68776C] md:text-base">
                          {item.product?.name}
                        </Link>
                        {item.option && (
                          <div className="mt-1 break-keep text-[13px] leading-[1.6] text-gray-600 md:text-sm">옵션: {item.option.name}</div>
                        )}
                        {item.isSoldOut ? (
                          <div className="mt-1 text-[13px] font-semibold text-[#A65348] md:text-sm">품절된 상품입니다</div>
                        ) : item.isOverStock ? (
                          <div className="mt-1 text-[13px] font-semibold text-[#A65348] md:text-sm">재고 부족 (재고 {item.stock}개)</div>
                        ) : !item.commerceReady ? (
                          <div className="mt-1 text-[13px] font-semibold text-[#A65348] md:text-sm">판매자·필수 상품정보 확인 중</div>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        aria-label={`${item.product?.name ?? '상품'} 삭제`}
                        onClick={() => handleRemove(item.productId, item.optionId)}
                        className="text-gray-400 hover:text-red-500 p-2 sm:p-1 -mr-2 sm:-mr-1 -mt-2 sm:-mt-1 shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                      <div className="flex items-end justify-between mt-3 sm:mt-4">
                        {/* Quantity Control — stock 정보가 있는 상품은 상세 페이지(ProductDetailClient.tsx)와
                            동일하게 + 버튼을 재고 수량에서 클램프한다. stock을 모르면(null) 기존처럼 무제한 허용. */}
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center rounded-lg border border-gray-200 bg-white">
                            <button
                              type="button"
                              aria-label={`${item.product?.name ?? '상품'} 수량 줄이기`}
                              onClick={() => handleUpdateQuantity(item.productId, item.optionId, item.quantity - 1)}
                              className="flex h-10 w-10 sm:h-8 sm:w-8 items-center justify-center text-gray-500 hover:text-[#2F3B34]"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="flex h-10 w-8 sm:h-8 sm:w-10 items-center justify-center text-[14px] sm:text-sm font-bold text-gray-900">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              aria-label={`${item.product?.name ?? '상품'} 수량 늘리기`}
                              onClick={() => handleUpdateQuantity(item.productId, item.optionId, Math.min(item.quantity + 1, item.stock ?? Infinity))}
                              disabled={item.stock !== null && item.quantity >= item.stock}
                              className="flex h-10 w-10 sm:h-8 sm:w-8 items-center justify-center text-gray-500 hover:text-[#2F3B34] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-gray-500"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          {item.stock !== null && item.quantity >= item.stock && !item.isSoldOut && (
                            <span className="text-[11px] text-[#A65348]">최대 재고 수량입니다</span>
                          )}
                        </div>
                        <div className="font-bold text-[15px] sm:text-base text-[#2F3B34]">
                          {item.hasPrice ? formatPrice(item.totalPrice) : <span className="text-[#A65348] text-[13px] sm:text-sm">가격 확인 필요</span>}
                        </div>
                      </div>
                  </div>
                </div>
              ))}
                  </div>
                </section>
                );
              })}
            </div>

            {/* Order Summary */}
            <div className="lg:w-1/3">
              <div className="bg-white p-5 md:p-6 rounded-sm shadow-sm border border-gray-100 sticky top-24">
                <h2 className="text-[16px] md:text-lg font-bold text-[#202521] mb-5 md:mb-6">결제 정보</h2>
                
                <div className="space-y-3 md:space-y-4 text-[13px] md:text-sm mb-5 md:mb-6">
                  <div className="flex justify-between text-gray-600">
                    <span>총 상품금액</span>
                    <span className="font-medium text-gray-900">{formatPrice(totalProductsPrice)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>배송비</span>
                    <span className="font-medium text-gray-900">{deliveryFee === 0 ? '무료' : formatPrice(deliveryFee)}</span>
                  </div>
                  {deliveryFeeCalculation.breakdown.length > 0 && (
                    <div className="space-y-1 text-right text-xs text-[#68776C]">
                      {deliveryFeeCalculation.breakdown.map((item) => (
                        <div key={`${item.sellerKey ?? 'brand'}-${item.brandId}`}>
                          {sellerGroups.find((group) => group.key === item.sellerKey)?.label ?? item.sellerName ?? item.brandName ?? item.brandId}: {item.appliedDeliveryFee === 0 ? '무료' : formatPrice(item.appliedDeliveryFee)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="pt-5 md:pt-6 border-t border-gray-100 flex items-end justify-between mb-6 md:mb-8">
                  <span className="font-bold text-gray-900 text-[14px] md:text-base">총 결제 예정금액</span>
                  <div className="text-right">
                    <span className="text-xl md:text-2xl font-bold text-[#2F3B34]">{formatPrice(finalPrice)}</span>
                    {unpricedItems.length > 0 && (
                      <div className="text-[11px] md:text-xs text-[#A65348] mt-1">+ 가격 미확정 상품 {unpricedItems.length}개</div>
                    )}
                  </div>
                </div>

                {unpricedItems.length > 0 ? (
                  <button 
                    type="button"
                    onClick={() => {
                      alert('가격 확인이 필요한 상품이 포함되어 있습니다. 주문 전 확인해주세요.');
                    }}
                    className="flex w-full items-center justify-center rounded-sm bg-[#9CA3AF] px-6 py-4 md:py-4 h-[52px] md:h-[56px] text-[15px] md:text-base font-bold text-white cursor-not-allowed"
                  >
                    일부 상품 가격 확인 필요
                  </button>
                ) : hasUnavailableItems ? (
                  <button type="button" disabled className="flex h-[52px] w-full cursor-not-allowed items-center justify-center rounded-sm bg-[#9CA3AF] px-6 py-4 text-[15px] font-bold text-white md:h-[56px] md:text-base">
                    품절·판매 준비 상품 확인 필요
                  </button>
                ) : (
                  <Link 
                    href={checkoutHref}
                    className="flex w-full items-center justify-center rounded-sm bg-[#2F3B34] px-6 py-4 md:py-4 h-[52px] md:h-[56px] text-[15px] md:text-base font-bold text-white transition hover:bg-[#2F3B34]/90"
                  >
                    주문하기 ({cartItems.length}개)
                  </Link>
                )}
              </div>
            </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
