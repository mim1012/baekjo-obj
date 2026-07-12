'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadTossPayments, ANONYMOUS, type TossPaymentsWidgets } from '@tosspayments/tosspayments-sdk';
import { getCart, clearCart } from '@/lib/cart';
import { formatPrice } from '@/lib/format';
import { createOrder, cancelReservation, getPublicProducts } from '@/lib/storage';
import { CartItem, OrderItem, Product, ProductOption } from '@/types';
import { useMounted } from '@/lib/useMounted';

const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
// 결제 실패/이탈 시 선점 해제 대상 주문을 기억해두는 세션 키. 결제창은 페이지를 이탈시키므로
// React state 로는 살아남지 않는다 — sessionStorage 로만 다음 로드에 전달한다.
const PENDING_ORDER_KEY = 'baekjo_pending_toss_order';

interface CheckoutCartItem extends CartItem {
  product: Product;
  option?: ProductOption;
  hasPrice: boolean;
  price: number;
  totalPrice: number;
}

function getCheckoutItems(products: Product[]): CheckoutCartItem[] {
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
  return (
    <Suspense fallback={null}>
      <CheckoutForm />
    </Suspense>
  );
}

function CheckoutForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mounted = useMounted();

  // 카트와 마찬가지로 어떤 상품이 필요한지 서버에서 미리 알 수 없어 마운트 시
  // 전체 카탈로그를 한 번 불러온다.
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

  // Form State
  const [formData, setFormData] = useState({
    customerName: '',
    phone: '',
    address: '',
    memo: '',
    paymentMethod: '무통장입금'
  });
  const [submitting, setSubmitting] = useState(false);
  const [widgetReady, setWidgetReady] = useState(false);
  const widgetsRef = useRef<TossPaymentsWidgets | null>(null);

  const ready = mounted && !productsLoading;
  const cartItems = ready ? getCheckoutItems(products) : [];
  const hasUnpricedItems = cartItems.some(item => !item.hasPrice);
  const isCardPayment = formData.paymentMethod === '카드결제';

  useEffect(() => {
    if (ready) {
      if (cartItems.length === 0) {
        router.replace('/cart');
      } else if (hasUnpricedItems) {
        alert('가격 확인이 필요한 상품이 포함되어 결제를 진행할 수 없습니다.');
        router.replace('/cart');
      }
    }
  }, [cartItems.length, hasUnpricedItems, ready, router]);

  // 결제창에서 실패/취소로 돌아온 경우: 직전에 만들어둔 PENDING 주문의 재고 선점을 해제한다.
  useEffect(() => {
    if (searchParams.get('fail') !== '1') return;
    const pendingOrderId = typeof window !== 'undefined' ? sessionStorage.getItem(PENDING_ORDER_KEY) : null;
    if (!pendingOrderId) return;
    sessionStorage.removeItem(PENDING_ORDER_KEY);
    cancelReservation(pendingOrderId)
      .catch(() => {
        // 이미 만료 cron이 처리했거나 확정된 주문일 수 있다 — 사용자에게는 취소 안내만 하면 충분.
      })
      .finally(() => {
        alert('결제가 취소되었습니다.');
        router.replace('/checkout');
      });
  }, [router, searchParams]);

  const finalPriceForWidget = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const deliveryFeeForWidget = finalPriceForWidget > 0 && finalPriceForWidget < 50000 ? 3000 : 0;
  const widgetAmount = finalPriceForWidget + deliveryFeeForWidget;

  // 카드결제 선택 + 결제 가능 금액이 확정된 뒤에만 토스 위젯을 로드·렌더한다.
  useEffect(() => {
    if (!isCardPayment || !ready || cartItems.length === 0 || hasUnpricedItems) return;
    if (!TOSS_CLIENT_KEY) return;

    let cancelled = false;
    (async () => {
      const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
      if (cancelled) return;
      const widgets = tossPayments.widgets({ customerKey: ANONYMOUS });
      widgetsRef.current = widgets;
      await widgets.setAmount({ currency: 'KRW', value: widgetAmount });
      if (cancelled) return;
      await widgets.renderPaymentMethods({ selector: '#toss-payment-method' });
      if (cancelled) return;
      await widgets.renderAgreement({ selector: '#toss-agreement' });
      if (cancelled) return;
      setWidgetReady(true);
    })();

    return () => {
      cancelled = true;
      widgetsRef.current = null;
      setWidgetReady(false);
    };
    // widgetAmount 는 카트 확정 후에만 바뀌므로 위젯 재마운트 트리거로 쓰지 않는다(중복 렌더 방지).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCardPayment, ready, cartItems.length, hasUnpricedItems]);

  if (!ready) return null;

  if (cartItems.length === 0 || hasUnpricedItems) {
    return null;
  }

  const totalProductsPrice = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const deliveryFee = totalProductsPrice > 0 && totalProductsPrice < 50000 ? 3000 : 0;
  const finalPrice = totalProductsPrice + deliveryFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    // 주문 항목 구성. id·createdAt·member_id 는 서버가 정하므로 여기서 넘기지 않는다.
    const orderItems: OrderItem[] = cartItems.map(item => ({
      productId: item.productId,
      productName: item.product.name,
      optionName: item.option?.name,
      quantity: item.quantity,
      price: item.price
    }));

    // totalPrice/deliveryFee/orderStatus/paymentStatus/deliveryStatus 는 서버(POST /api/orders)가
    // 카탈로그 가격으로 재계산·고정하므로 여기서 넘기지 않는다(콘센트 축소 — src/lib/storage.ts 참고).
    if (isCardPayment && !widgetsRef.current) {
      alert('결제 위젯을 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    setSubmitting(true);
    let orderId: string;
    try {
      const order = await createOrder({
        customerName: formData.customerName,
        phone: formData.phone,
        address: formData.address,
        items: orderItems,
        paymentMethod: formData.paymentMethod,
        deliveryMemo: formData.memo,
      });
      orderId = order.id;
    } catch (error) {
      setSubmitting(false);
      if (error instanceof Error && error.message === 'out-of-stock') {
        alert('일부 상품의 재고가 부족합니다. 장바구니를 확인해주세요.');
      } else {
        alert('주문 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      }
      return;
    }

    if (!isCardPayment) {
      clearCart();
      router.push('/order-complete');
      return;
    }

    // 카드결제: 결제창으로 리다이렉트되므로 여기서부터는 페이지가 이동한다.
    // successUrl 로 못 돌아오는(이탈·크래시) 경우를 대비해 선점 해제 대상 주문을 세션에 남긴다.
    sessionStorage.setItem(PENDING_ORDER_KEY, orderId);
    const orderName = orderItems.length > 1
      ? `${orderItems[0].productName} 외 ${orderItems.length - 1}건`
      : orderItems[0].productName;
    try {
      await widgetsRef.current!.requestPayment({
        orderId,
        orderName,
        successUrl: `${window.location.origin}/order-complete`,
        failUrl: `${window.location.origin}/checkout?fail=1`,
      });
    } catch {
      // 사용자가 결제창을 직접 닫은 경우 등 — failUrl 리다이렉트 없이 여기로 돌아온다.
      setSubmitting(false);
      cancelReservation(orderId).catch(() => {});
      sessionStorage.removeItem(PENDING_ORDER_KEY);
      alert('결제가 취소되었습니다.');
    }
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
                {(['무통장입금', '카드결제'] as const).map(method => {
                  const disabled = method === '카드결제' && !TOSS_CLIENT_KEY;
                  return (
                    <label
                      key={method}
                      className={`border p-4 rounded-sm flex items-center justify-center transition-colors ${disabled ? 'cursor-not-allowed border-gray-100 text-gray-400' : 'cursor-pointer'} ${formData.paymentMethod === method && !disabled ? 'border-[#2F3B34] bg-[#E4E8E3] text-[#2F3B34] font-bold' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method}
                        checked={formData.paymentMethod === method}
                        onChange={handleChange}
                        disabled={disabled}
                        className="hidden"
                      />
                      {disabled ? '카드결제 준비중' : method}
                    </label>
                  );
                })}
              </div>
              {isCardPayment && TOSS_CLIENT_KEY && (
                <div className="mt-6">
                  <div id="toss-payment-method" />
                  <div id="toss-agreement" className="mt-4" />
                  {!widgetReady && (
                    <p className="mt-2 text-xs text-gray-400">결제 위젯을 불러오는 중…</p>
                  )}
                </div>
              )}
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
                disabled={submitting || (isCardPayment && !widgetReady)}
                className="w-full rounded-sm bg-[#2F3B34] px-6 py-4 text-base font-bold text-white transition hover:bg-[#2F3B34]/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? '주문 처리 중…' : `${formatPrice(finalPrice)} 결제하기`}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
