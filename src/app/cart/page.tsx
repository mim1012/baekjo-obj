'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { getCart, updateCartQuantity, removeFromCart } from '@/lib/cart';
import { getPublicProducts } from '@/lib/storage';
import { formatPrice } from '@/lib/format';
import { CartItem, Product } from '@/types';
import EmptyState from '@/components/common/EmptyState';
import { useMounted } from '@/lib/useMounted';

export default function CartPage() {
  const mounted = useMounted();
  const [, refreshCart] = useState(0);
  // 카트 항목은 localStorage(클라이언트) 기준이라 어떤 상품이 필요한지 서버에서
  // 미리 알 수 없다 → 전체 카탈로그를 마운트 시 한 번 불러와 로컬에서 조인한다.
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getPublicProducts().then((list) => {
      if (cancelled) return;
      setProducts(list);
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
    
    return { 
      ...item, 
      product, 
      option, 
      hasPrice,
      price, 
      totalPrice: hasPrice ? price * item.quantity : 0 
    };
  }).filter(item => item.product);

  const pricedItems = enrichedItems.filter(item => item.hasPrice);
  const unpricedItems = enrichedItems.filter(item => !item.hasPrice);

  const totalProductsPrice = pricedItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const deliveryFee = totalProductsPrice > 0 && totalProductsPrice < 50000 ? 3000 : 0;
  const finalPrice = totalProductsPrice + deliveryFee;

  return (
    <div className="bg-[#F4F2EC] min-h-dvh py-12">
      <div className="site-container">
        <h1 className="text-2xl font-bold text-[#202521] mb-8">장바구니</h1>
        
        {enrichedItems.length === 0 ? (
          <EmptyState 
            title="장바구니가 비어있습니다" 
            description="백조오브제의 프리미엄 상품들을 만나보세요." 
            actionLabel="쇼핑하러 가기" 
            actionHref="/shop"
          />
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Cart Items */}
            <div className="lg:w-2/3 space-y-4">
              {enrichedItems.map((item, idx) => (
                <div key={`${item.productId}-${item.optionId || 'none'}-${idx}`} className="flex flex-col sm:flex-row gap-4 bg-white p-6 rounded-sm shadow-sm border border-gray-100">
                  <div className="h-24 w-24 shrink-0 rounded-sm bg-[#ECEAE3] flex items-center justify-center text-xs text-gray-400">
                    이미지
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-xs font-medium text-gray-500 mb-1">{item.product?.brandId}</div>
                        <Link href={`/shop/${item.product?.id}`} className="font-bold text-[#202521] hover:text-[#68776C] transition-colors">
                          {item.product?.name}
                        </Link>
                        {item.option && (
                          <div className="text-sm text-gray-600 mt-1">옵션: {item.option.name}</div>
                        )}
                      </div>
                      <button onClick={() => handleRemove(item.productId, item.optionId)} className="text-gray-400 hover:text-red-500 p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    
                      <div className="flex items-end justify-between mt-4">
                        {/* Quantity Control */}
                        <div className="flex items-center rounded-lg border border-gray-200 bg-white">
                          <button 
                            onClick={() => handleUpdateQuantity(item.productId, item.optionId, item.quantity - 1)}
                            className="flex h-8 w-8 items-center justify-center text-gray-500 hover:text-[#2F3B34]"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="flex h-8 w-10 items-center justify-center text-sm font-bold text-gray-900">
                            {item.quantity}
                          </span>
                          <button 
                            onClick={() => handleUpdateQuantity(item.productId, item.optionId, item.quantity + 1)}
                            className="flex h-8 w-8 items-center justify-center text-gray-500 hover:text-[#2F3B34]"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="font-bold text-[#2F3B34]">
                          {item.hasPrice ? formatPrice(item.totalPrice) : <span className="text-[#A65348] text-sm">가격 확인 필요</span>}
                        </div>
                      </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:w-1/3">
              <div className="bg-white p-6 rounded-sm shadow-sm border border-gray-100 sticky top-24">
                <h2 className="text-lg font-bold text-[#202521] mb-6">결제 정보</h2>
                
                <div className="space-y-4 text-sm mb-6">
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
                
                <div className="pt-6 border-t border-gray-100 flex items-end justify-between mb-8">
                  <span className="font-bold text-gray-900">총 결제 예정금액</span>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-[#2F3B34]">{formatPrice(finalPrice)}</span>
                    {unpricedItems.length > 0 && (
                      <div className="text-xs text-[#A65348] mt-1">+ 가격 미확정 상품 {unpricedItems.length}개</div>
                    )}
                  </div>
                </div>

                {unpricedItems.length > 0 ? (
                  <button 
                    type="button"
                    onClick={() => {
                      alert('가격 확인이 필요한 상품이 포함되어 있습니다. 주문 전 확인해주세요.');
                    }}
                    className="flex w-full items-center justify-center rounded-sm bg-[#9CA3AF] px-6 py-4 text-base font-bold text-white cursor-not-allowed"
                  >
                    일부 상품 가격 확인 필요
                  </button>
                ) : (
                  <Link 
                    href="/checkout"
                    className="flex w-full items-center justify-center rounded-sm bg-[#2F3B34] px-6 py-4 text-base font-bold text-white transition hover:bg-[#2F3B34]/90"
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
