'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { getCart, updateCartQuantity, removeFromCart, pruneCartToVisibleProducts } from '@/lib/cart';
import { getPublicProductsOrNull, getPublicBrands, isLoggedIn } from '@/lib/storage';
import { formatPrice } from '@/lib/format';
import { CartItem, Product, Brand } from '@/types';
import EmptyState from '@/components/common/EmptyState';
import { useMounted } from '@/lib/useMounted';

export default function CartPage() {
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

  useEffect(() => {
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
  }, []);

  if (!mounted || productsLoading) return null;

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

    return {
      ...item,
      product,
      option,
      hasPrice,
      price,
      totalPrice: hasPrice ? price * item.quantity : 0,
      brandName,
    };
  }).filter(item => item.product);

  const pricedItems = enrichedItems.filter(item => item.hasPrice);
  const unpricedItems = enrichedItems.filter(item => !item.hasPrice);

  const totalProductsPrice = pricedItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const deliveryFee = totalProductsPrice > 0 && totalProductsPrice < 50000 ? 3000 : 0;
  const finalPrice = totalProductsPrice + deliveryFee;
  const checkoutHref = isLoggedIn() ? '/checkout' : '/login?redirect=/checkout';

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
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Cart Items */}
            <div className="lg:w-2/3 space-y-3 md:space-y-4">
              {enrichedItems.map((item, idx) => (
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
                      </div>
                      <button onClick={() => handleRemove(item.productId, item.optionId)} className="text-gray-400 hover:text-red-500 p-2 sm:p-1 -mr-2 sm:-mr-1 -mt-2 sm:-mt-1 shrink-0">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    
                      <div className="flex items-end justify-between mt-3 sm:mt-4">
                        {/* Quantity Control */}
                        <div className="flex items-center rounded-lg border border-gray-200 bg-white">
                          <button 
                            onClick={() => handleUpdateQuantity(item.productId, item.optionId, item.quantity - 1)}
                            className="flex h-10 w-10 sm:h-8 sm:w-8 items-center justify-center text-gray-500 hover:text-[#2F3B34]"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="flex h-10 w-8 sm:h-8 sm:w-10 items-center justify-center text-[14px] sm:text-sm font-bold text-gray-900">
                            {item.quantity}
                          </span>
                          <button 
                            onClick={() => handleUpdateQuantity(item.productId, item.optionId, item.quantity + 1)}
                            className="flex h-10 w-10 sm:h-8 sm:w-8 items-center justify-center text-gray-500 hover:text-[#2F3B34]"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="font-bold text-[15px] sm:text-base text-[#2F3B34]">
                          {item.hasPrice ? formatPrice(item.totalPrice) : <span className="text-[#A65348] text-[13px] sm:text-sm">가격 확인 필요</span>}
                        </div>
                      </div>
                  </div>
                </div>
              ))}
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
                  {deliveryFee > 0 && (
                    <div className="text-xs text-[#68776C] text-right">
                      {formatPrice(50000 - totalProductsPrice)} 추가 주문 시 무료배송
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
        )}
      </div>
    </div>
  );
}
