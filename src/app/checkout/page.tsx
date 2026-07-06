'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCart, clearCart } from '@/lib/cart';
import { products } from '@/data/products';
import { formatPrice } from '@/lib/format';
import { addOrder } from '@/lib/storage';
import { CartItem, OrderItem, Product, ProductOption } from '@/types';
import { useMounted } from '@/lib/useMounted';

interface CheckoutCartItem extends CartItem {
  product: Product;
  option?: ProductOption;
  hasPrice: boolean;
  price: number;
  totalPrice: number;
}

function getCheckoutItems(): CheckoutCartItem[] {
  return getCart().flatMap((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    if (!product) return [];

    const hasPrice = product.price !== null && product.price !== undefined;
    const basePrice = hasPrice ? (product.salePrice || product.price || 0) : 0;
    const option = product.options?.find((candidate) => candidate.id === item.optionId);
    const optionPrice = option?.priceDiff ?? option?.price ?? 0;
    const price = basePrice + optionPrice;
    
    return [{ 
      ...item, 
      product, 
      option, 
      price, 
      hasPrice,
      totalPrice: hasPrice ? price * item.quantity : 0 
    }];
  });
}

export default function CheckoutPage() {
  const router = useRouter();
  const mounted = useMounted();
  
  // Form State
  const [formData, setFormData] = useState({
    customerName: '',
    phone: '',
    address: '',
    memo: '',
    paymentMethod: '무통장입금'
  });

  const cartItems = mounted ? getCheckoutItems() : [];
  const hasUnpricedItems = cartItems.some(item => !item.hasPrice);

  useEffect(() => {
    if (mounted) {
      if (cartItems.length === 0) {
        router.replace('/cart');
      } else if (hasUnpricedItems) {
        alert('가격 확인이 필요한 상품이 포함되어 결제를 진행할 수 없습니다.');
        router.replace('/cart');
      }
    }
  }, [cartItems.length, hasUnpricedItems, mounted, router]);

  if (!mounted) return null;

  if (cartItems.length === 0 || hasUnpricedItems) {
    return null;
  }

  const totalProductsPrice = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const deliveryFee = totalProductsPrice > 0 && totalProductsPrice < 50000 ? 3000 : 0;
  const finalPrice = totalProductsPrice + deliveryFee;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create Mock Order
    const orderItems: OrderItem[] = cartItems.map(item => ({
      productId: item.productId,
      productName: item.product.name,
      optionName: item.option?.name,
      quantity: item.quantity,
      price: item.price
    }));

    const orderId = `ORD-${new Date().toISOString().replace(/\D/g, '').slice(0,14)}`;
    
    addOrder({
      id: orderId,
      customerName: formData.customerName,
      phone: formData.phone,
      address: formData.address,
      items: orderItems,
      totalPrice: totalProductsPrice,
      deliveryFee,
      paymentMethod: formData.paymentMethod,
      deliveryMemo: formData.memo,
      orderStatus: '주문접수',
      paymentStatus: formData.paymentMethod === '무통장입금' ? '입금대기' : '결제완료',
      deliveryStatus: '배송준비',
      createdAt: new Date().toISOString()
    });

    clearCart();
    router.push('/order-complete');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="bg-[#F4F2EC] min-h-dvh py-12">
      <div className="site-container">
        <h1 className="text-2xl font-bold text-[#202521] mb-8">주문/결제</h1>
        
        <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-8">
          {/* Form Fields */}
          <div className="lg:w-2/3 space-y-6">
            
            <section className="bg-white p-8 rounded-sm shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-[#202521] mb-6">배송지 정보</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">받는 사람 *</label>
                  <input required type="text" name="customerName" value={formData.customerName} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-sm focus:ring-[#2F3B34] focus:border-[#2F3B34]" placeholder="이름을 입력하세요" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">연락처 *</label>
                  <input required type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-sm focus:ring-[#2F3B34] focus:border-[#2F3B34]" placeholder="010-0000-0000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">주소 *</label>
                  <input required type="text" name="address" value={formData.address} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-sm focus:ring-[#2F3B34] focus:border-[#2F3B34]" placeholder="배송지 주소를 입력하세요" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">배송 메모</label>
                  <input type="text" name="memo" value={formData.memo} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-sm focus:ring-[#2F3B34] focus:border-[#2F3B34]" placeholder="예) 문 앞에 놓아주세요" />
                </div>
              </div>
            </section>

            <section className="bg-white p-8 rounded-sm shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-[#202521] mb-6">결제 수단</h2>
              <div className="grid grid-cols-2 gap-4">
                {['무통장입금', '카드결제 준비중', '가상 결제 테스트'].map(method => (
                  <label key={method} className={`border p-4 rounded-sm cursor-pointer flex items-center justify-center transition-colors ${formData.paymentMethod === method ? 'border-[#2F3B34] bg-[#E4E8E3] text-[#2F3B34] font-bold' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" name="paymentMethod" value={method} checked={formData.paymentMethod === method} onChange={handleChange} className="hidden" />
                    {method}
                  </label>
                ))}
              </div>
            </section>

          </div>

          {/* Sidebar */}
          <div className="lg:w-1/3">
            <div className="bg-white p-6 rounded-sm shadow-sm border border-gray-100 sticky top-24">
              <h2 className="text-lg font-bold text-[#202521] mb-6">주문 상품</h2>
              
              <div className="space-y-4 mb-6 max-h-60 overflow-y-auto hide-scrollbar">
                {cartItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start text-sm">
                    <div className="flex-1 pr-4">
                      <div className="font-medium text-gray-900 line-clamp-1">{item.product.name}</div>
                      <div className="text-gray-500 mt-1">{item.option?.name ? `${item.option.name} / ` : ''}{item.quantity}개</div>
                    </div>
                    <div className="font-bold text-[#2F3B34]">{formatPrice(item.totalPrice)}</div>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-gray-100 space-y-4 text-sm mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>총 상품금액</span>
                  <span className="font-medium text-gray-900">{formatPrice(totalProductsPrice)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>배송비</span>
                  <span className="font-medium text-gray-900">{formatPrice(deliveryFee)}</span>
                </div>
              </div>
              
              <div className="pt-6 border-t border-gray-100 flex items-end justify-between mb-8">
                <span className="font-bold text-gray-900">최종 결제금액</span>
                <span className="text-2xl font-bold text-[#2F3B34]">{formatPrice(finalPrice)}</span>
              </div>

              <button 
                type="submit"
                className="w-full rounded-sm bg-[#2F3B34] px-6 py-4 text-base font-bold text-white transition hover:bg-[#2F3B34]/90"
              >
                {formatPrice(finalPrice)} 결제하기
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
