'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { ChevronDown } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { loadTossPayments, ANONYMOUS, type TossPaymentsWidgets } from '@tosspayments/tosspayments-sdk';
import { getCart, clearCart } from '@/lib/cart';
import { formatPrice } from '@/lib/format';
import { createOrder, cancelReservation, getPublicProducts, getSessionUser } from '@/lib/storage';
import { CartItem, OrderItem, Product, ProductOption } from '@/types';
import { useMounted } from '@/lib/useMounted';
import { DEFAULT_COMMERCE_POLICY } from '@/data/company';

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
  const [sessionChecked, setSessionChecked] = useState(false);
  const [canOrder, setCanOrder] = useState(false);

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

  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    getSessionUser().then((user) => {
      if (cancelled) return;
      if (!user) {
        setCanOrder(false);
        setSessionChecked(true);
        router.replace('/login?redirect=/checkout');
        return;
      }
      setCanOrder(true);
      setSessionChecked(true);
    });
    return () => {
      cancelled = true;
    };
  }, [mounted, router]);

  // Form State
  const [formData, setFormData] = useState({
    customerName: '',
    phone: '',
    address: '',
    memo: '',
    paymentMethod: '무통장입금'
  });
  const [submitting, setSubmitting] = useState(false);
  const [isNoticeOpen, setIsNoticeOpen] = useState(false);
  const [widgetReady, setWidgetReady] = useState(false);
  const [widgetError, setWidgetError] = useState(false);
  const widgetsRef = useRef<TossPaymentsWidgets | null>(null);

  const ready = mounted && !productsLoading && sessionChecked;
  const cartItems = ready ? getCheckoutItems(products) : [];
  const hasUnpricedItems = cartItems.some(item => !item.hasPrice);
  const isCardPayment = formData.paymentMethod === '카드결제';

  useEffect(() => {
    if (ready && canOrder) {
      if (cartItems.length === 0) {
        router.replace('/cart');
      } else if (hasUnpricedItems) {
        alert('가격 확인이 필요한 상품이 포함되어 결제를 진행할 수 없습니다.');
        router.replace('/cart');
      }
    }
  }, [canOrder, cartItems.length, hasUnpricedItems, ready, router]);

  // 결제창에서 실패/취소로 돌아온 경우: 직전에 만들어둔 PENDING 주문의 재고 선점을 해제한다.
  // 토스가 failUrl에 붙여주는 orderId 쿼리를 우선 신뢰하고, 없을 때만 세션 키를 폴백으로 쓴다
  // (관계없는 stale 세션 키로 엉뚱한 주문을 취소하지 않도록).
  useEffect(() => {
    if (searchParams.get('fail') !== '1') return;
    const pendingOrderId = typeof window !== 'undefined' ? sessionStorage.getItem(PENDING_ORDER_KEY) : null;
    const queryOrderId = searchParams.get('orderId');
    const targetOrderId = queryOrderId || pendingOrderId;
    if (!targetOrderId) return;

    cancelReservation(targetOrderId)
      .then(() => {
        // 세션 키가 이번에 취소한 주문과 같을 때만 지운다. 쿼리 orderId 가 세션 키와 다르면
        // 세션 키는 다른(아직 미처리) PENDING 을 가리킬 수 있으니 보존한다.
        if (pendingOrderId === targetOrderId) sessionStorage.removeItem(PENDING_ORDER_KEY);
      })
      .catch(() => {
        // 취소 실패 — 이미 만료 cron/confirm 이 처리했을 수도, 아직 안 됐을 수도 있다.
        // 세션 키를 지우지 않고 남겨 다음 fail 방문이나 cron 이 재시도할 수 있게 한다.
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
    if (!isCardPayment || !ready || !canOrder || cartItems.length === 0 || hasUnpricedItems) return;
    if (!TOSS_CLIENT_KEY) return;

    let cancelled = false;
    (async () => {
      try {
        setWidgetError(false);
        const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
        if (cancelled) return;
        const widgets = tossPayments.widgets({ customerKey: ANONYMOUS });
        if (cancelled) return;
        widgetsRef.current = widgets;
        await widgets.setAmount({ currency: 'KRW', value: widgetAmount });
        if (cancelled) return;
        await widgets.renderPaymentMethods({ selector: '#toss-payment-method' });
        if (cancelled) return;
        await widgets.renderAgreement({ selector: '#toss-agreement' });
        if (cancelled) return;
        setWidgetReady(true);
      } catch {
        if (cancelled) return;
        widgetsRef.current = null;
        setWidgetReady(false);
        setWidgetError(true);
      }
    })();

    return () => {
      cancelled = true;
      widgetsRef.current = null;
      setWidgetReady(false);
    };
    // widgetAmount 는 카트 확정 후에만 바뀌므로 위젯 재마운트 트리거로 쓰지 않는다(중복 렌더 방지).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCardPayment, ready, canOrder, cartItems.length, hasUnpricedItems]);

  if (!ready) return null;

  if (!canOrder || cartItems.length === 0 || hasUnpricedItems) {
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
      optionId: item.optionId,
      optionName: item.option?.name,
      quantity: item.quantity,
      price: item.price
    }));

    // totalPrice/deliveryFee/orderStatus/paymentStatus/deliveryStatus 는 서버(POST /api/orders)가
    // 카탈로그 가격으로 재계산·고정하므로 여기서 넘기지 않는다(콘센트 축소 — src/lib/storage.ts 참고).
    if (isCardPayment && (!widgetsRef.current || !widgetReady)) {
      alert('결제 위젯을 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    setSubmitting(true);
    let orderId: string;
    let authoritativePrice: number;
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
      authoritativePrice = order.totalPrice + order.deliveryFee;
    } catch (error) {
      setSubmitting(false);
      if (error instanceof Error && error.message === 'login-required') {
        router.replace('/login?redirect=/checkout');
      } else if (error instanceof Error && error.message === 'out-of-stock') {
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

    // 화면 표시 finalPrice(위젯 초기 setAmount 값)는 위젯 렌더 시점 기준이라 stale 할 수 있다.
    // 서버가 방금 카탈로그 가격으로 재계산·고정한 authoritativePrice 와 다르면 결제를 진행하지 않고
    // 선점을 즉시 해제한다(가격 조작·동시 가격변경 방어).
    if (authoritativePrice !== finalPrice) {
      setSubmitting(false);
      try {
        await cancelReservation(orderId);
      } catch {
        // 취소 실패해도 사용자에게는 재확인을 요구하는 것이 우선 — cron 이 만료 시 복원한다.
      }
      alert('결제 금액이 갱신되었습니다. 다시 확인해 주세요.');
      return;
    }

    // 카드결제: 결제창으로 리다이렉트되므로 여기서부터는 페이지가 이동한다.
    // successUrl 로 못 돌아오는(이탈·크래시) 경우를 대비해 선점 해제 대상 주문을 세션에 남긴다.
    // (성공 시 이 키 정리는 order-complete 담당 — 여기서는 지우지 않는다.)
    sessionStorage.setItem(PENDING_ORDER_KEY, orderId);
    const orderName = orderItems.length > 1
      ? `${orderItems[0].productName} 외 ${orderItems.length - 1}건`
      : orderItems[0].productName;
    try {
      // 결제 직전 서버 확정 금액으로 위젯 금액을 다시 맞춘다(초기 렌더 값이 stale 해도 안전).
      await widgetsRef.current!.setAmount({ currency: 'KRW', value: authoritativePrice });
      await widgetsRef.current!.requestPayment({
        orderId,
        orderName,
        // R4: successUrl은 서버 라우트(GET /api/payments/return)를 가리킨다 — 브라우저가 아니라
        // 서버가 승인을 오케스트레이션하고, 끝나면 /order-complete?status=... 로 302한다.
        successUrl: `${window.location.origin}/api/payments/return`,
        failUrl: `${window.location.origin}/checkout?fail=1`,
      });
    } catch {
      // 사용자가 결제창을 직접 닫은 경우 등 — failUrl 리다이렉트 없이 여기로 돌아온다.
      setSubmitting(false);
      try {
        await cancelReservation(orderId);
        sessionStorage.removeItem(PENDING_ORDER_KEY);
      } catch {
        // 취소 실패 — 세션 키를 보존해 다음 fail 방문이나 cron 이 복원하게 한다.
      }
      alert('결제가 취소되었습니다.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="bg-[#F4F2EC] min-h-dvh py-8 md:py-12">
      <div className="site-container">
        <h1 className="text-xl md:text-2xl font-bold text-[#202521] mb-5 md:mb-8">주문/결제</h1>

        <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Form Fields */}
          <div className="lg:w-2/3 space-y-5 md:space-y-6">

            <section className="bg-white p-5 md:p-8 rounded-sm shadow-sm border border-gray-100">
              <h2 className="text-[16px] md:text-lg font-bold text-[#202521] mb-4 md:mb-6">배송지 정보</h2>
              <div className="space-y-3 md:space-y-4">
                <div>
                  <label className="block text-[13px] md:text-sm font-medium text-gray-700 mb-1">받는 사람 *</label>
                  <input required type="text" name="customerName" value={formData.customerName} onChange={handleChange} className="w-full p-3 h-12 border border-gray-300 rounded-sm focus:ring-[#2F3B34] focus:border-[#2F3B34] text-[16px] md:text-sm" placeholder="이름을 입력하세요" />
                </div>
                <div>
                  <label className="block text-[13px] md:text-sm font-medium text-gray-700 mb-1">연락처 *</label>
                  <input required type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full p-3 h-12 border border-gray-300 rounded-sm focus:ring-[#2F3B34] focus:border-[#2F3B34] text-[16px] md:text-sm" placeholder="010-0000-0000" />
                </div>
                <div>
                  <label className="block text-[13px] md:text-sm font-medium text-gray-700 mb-1">주소 *</label>
                  <input required type="text" name="address" value={formData.address} onChange={handleChange} className="w-full p-3 h-12 border border-gray-300 rounded-sm focus:ring-[#2F3B34] focus:border-[#2F3B34] text-[16px] md:text-sm" placeholder="배송지 주소를 입력하세요" />
                </div>
                <div>
                  <label className="block text-[13px] md:text-sm font-medium text-gray-700 mb-1">배송 메모</label>
                  <input type="text" name="memo" value={formData.memo} onChange={handleChange} className="w-full p-3 h-12 border border-gray-300 rounded-sm focus:ring-[#2F3B34] focus:border-[#2F3B34] text-[16px] md:text-sm" placeholder="예) 문 앞에 놓아주세요" />
                </div>
              </div>
            </section>

            <section className="bg-white p-5 md:p-8 rounded-sm shadow-sm border border-gray-100">
              <h2 className="text-[16px] md:text-lg font-bold text-[#202521] mb-4 md:mb-6">결제 수단</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                {(['무통장입금', '카드결제'] as const).map(method => {
                  const disabled = method === '카드결제' && !TOSS_CLIENT_KEY;
                  return (
                    <label
                      key={method}
                      className={`border p-4 h-14 rounded-sm flex items-center justify-center transition-colors text-[14px] md:text-base ${disabled ? 'cursor-not-allowed border-gray-100 text-gray-400' : 'cursor-pointer'} ${formData.paymentMethod === method && !disabled ? 'border-[#2F3B34] bg-[#E4E8E3] text-[#2F3B34] font-bold' : 'border-gray-200 hover:border-gray-300'}`}
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
                  {widgetError ? (
                    <p className="text-sm text-red-600">
                      결제 위젯을 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.
                    </p>
                  ) : (
                    <>
                      <div id="toss-payment-method" />
                      <div id="toss-agreement" className="mt-4" />
                      {!widgetReady && (
                        <p className="mt-2 text-xs text-gray-400">결제 위젯을 불러오는 중…</p>
                      )}
                    </>
                  )}
                </div>
              )}
            </section>

            <section className="bg-white p-5 md:p-8 rounded-sm shadow-sm border border-gray-100">
              <button
                type="button"
                aria-expanded={isNoticeOpen}
                aria-controls="checkout-notice"
                onClick={() => setIsNoticeOpen((current) => !current)}
                className="flex w-full items-center justify-between gap-4 text-left"
              >
                <h2 className="text-[16px] md:text-lg font-bold text-[#202521]">주문 전 확인</h2>
                <ChevronDown className={`size-5 shrink-0 text-[#6F756F] transition-transform duration-300 ${isNoticeOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
              <div id="checkout-notice" className={`space-y-3 text-sm leading-6 text-gray-600 pt-4 ${isNoticeOpen ? 'block' : 'hidden'}`}>
                <p>
                  주문·배송·결제 처리를 위해 받는 사람, 연락처, 배송지 주소, 배송 메모, 주문 상품, 결제수단 정보를
                  수집·이용합니다. 주문 및 대금결제 기록은 전자상거래법에 따라 5년간 보관됩니다.
                </p>
                <p>
                  기본 배송비는 {DEFAULT_COMMERCE_POLICY.shippingLabel}이며, 출고·교환·반품 기준은 상품 상세와{' '}
                  <Link href="/refund-policy" className="font-semibold text-[#2F3B34] underline underline-offset-2">
                    배송·교환·환불 안내
                  </Link>
                  를 따릅니다.
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-[#2F3B34]">
                  <Link href="/terms" className="underline underline-offset-2">이용약관</Link>
                  <Link href="/privacy" className="underline underline-offset-2">개인정보처리방침</Link>
                  <Link href="/refund-policy" className="underline underline-offset-2">배송·교환·환불 안내</Link>
                </div>
              </div>
              <label className="flex cursor-pointer items-start gap-3 pt-4 text-sm text-[#4A514A]">
                <input required type="checkbox" className="mt-1 size-4" />
                <span>
                  <strong>[필수]</strong> 주문 정보, 결제 금액, 배송·교환·환불 기준 및 개인정보 수집·이용 안내를 확인했습니다.
                </span>
              </label>
            </section>

          </div>

          {/* Sidebar */}
          <div className="lg:w-1/3">
            <div className="bg-white p-5 md:p-6 rounded-sm shadow-sm border border-gray-100 sticky top-24">
              <h2 className="text-[16px] md:text-lg font-bold text-[#202521] mb-5 md:mb-6">주문 상품 ({cartItems.length}개)</h2>

              <div className="space-y-4 mb-5 md:mb-6 max-h-60 overflow-y-auto hide-scrollbar">
                {cartItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start text-sm">
                    <div className="flex-1 pr-4">
                      <div className="break-keep font-medium leading-[1.5] text-gray-900">{item.product.name}</div>
                      <div className="text-[13px] text-gray-500 mt-1">{item.option?.name ? `${item.option.name} / ` : ''}{item.quantity}개</div>
                    </div>
                    <div className="font-bold text-[14px] text-[#2F3B34] shrink-0">{formatPrice(item.totalPrice)}</div>
                  </div>
                ))}
              </div>

              <div className="pt-5 md:pt-6 border-t border-gray-100 space-y-3 md:space-y-4 text-[13px] md:text-sm mb-5 md:mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>총 상품금액</span>
                  <span className="font-medium text-gray-900">{formatPrice(totalProductsPrice)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>배송비</span>
                  <span className="font-medium text-gray-900">{formatPrice(deliveryFee)}</span>
                </div>
              </div>

              <div className="pt-5 md:pt-6 border-t border-gray-100 flex items-end justify-between mb-6 md:mb-8">
                <span className="font-bold text-gray-900 text-[14px] md:text-base">최종 결제금액</span>
                <span className="text-xl md:text-2xl font-bold text-[#2F3B34]">{formatPrice(finalPrice)}</span>
              </div>

              <button
                type="submit"
                disabled={submitting || (isCardPayment && !widgetReady)}
                className="w-full rounded-sm bg-[#2F3B34] px-6 py-4 h-[52px] md:h-[56px] text-[15px] md:text-base font-bold text-white transition hover:bg-[#2F3B34]/90 disabled:cursor-not-allowed disabled:opacity-60"
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
