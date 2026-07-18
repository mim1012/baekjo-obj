'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { User, Order, InsuranceApplication, Product, ProductReview, ProductInquiry } from '@/types';
import {
  getCurrentUser,
  getMyOrders,
  getMyInsuranceApplications,
  getWishlist,
  getPublicProducts,
  getMyHistoryProducts,
  getProductReviewsByUser,
  addProductReview,
  updateProductReview,
  deleteProductReview,
  getProductInquiriesByUser,
  addProductInquiry,
  updateProductInquiry,
  deleteProductInquiry,
  buildReviewTargetKey,
  STORAGE_EVENTS,
} from '@/lib/storage';

import MypageSidebar from './components/MypageSidebar';
import MypageMobileNav from './components/MypageMobileNav';
import OverviewSection from './components/OverviewSection';
import OrdersSection from './components/OrdersSection';
import WishlistSection from './components/WishlistSection';
import ReviewsSection from './components/ReviewsSection';
import InquiriesSection from './components/InquiriesSection';
import InsuranceSection from './components/InsuranceSection';
import ProfileSection from './components/ProfileSection';
import ReviewFormModal from '@/components/reviews/ReviewFormModal';
import InquiryFormModal from '@/components/inquiries/InquiryFormModal';
import PasswordChangeSection from '@/components/mypage/PasswordChangeSection';
import EmailVerifyBanner from '@/components/mypage/EmailVerifyBanner';

/** 구매평 작성/수정 모달에 전달되는 상품 + 주문 컨텍스트. 신규 작성 시에만 orderId/orderItemId 를 채운다. */
type ReviewTargetProduct = Product & {
  orderId?: string;
  orderItemId?: string;
  optionName?: string;
};

function MypageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') || 'overview';

  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [insuranceApps, setInsuranceApps] = useState<InsuranceApplication[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [inquiries, setInquiries] = useState<ProductInquiry[]>([]);
  // 정적 @/data/products 직접 import 대신 콘센트(getPublicProducts)로 로드(§4 drift 방지).
  const [products, setProducts] = useState<Product[]>([]);
  
  const [isMounted, setIsMounted] = useState(false);

  // Modals state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewInitialData, setReviewInitialData] = useState<ProductReview | null>(null);
  const [reviewProduct, setReviewProduct] = useState<ReviewTargetProduct | null>(null);

  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);
  const [inquiryInitialData, setInquiryInitialData] = useState<ProductInquiry | null>(null);

  // 각 로더는 mount·STORAGE_EVENTS 리스너에서 독립적으로 재호출된다(단일 useEffect cleanup으로는
  // 못 잡는 범위) — 필드별 시퀀스 번호로 먼저 시작했지만 늦게 응답한 요청이 최신 상태를 덮어쓰지
  // 않게 한다(last-response-wins 레이스 방지). reviews/inquiries는 loadData 외에도 STORAGE_EVENTS
  // 핸들러가 별도로 갱신하므로 자체 시퀀스를 둔다.
  const loadSeqRef = useRef(0);
  const reviewsSeqRef = useRef(0);
  const inquiriesSeqRef = useRef(0);

  const loadData = () => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.replace('/login');
      return;
    }
    setUser(currentUser);

    const seq = ++loadSeqRef.current;
    // getMyOrders/getMyInsuranceApplications 는 세션 기준으로 이미 내 것만 반환한다.
    getMyOrders().then((orders) => {
      if (loadSeqRef.current === seq) setOrders(orders);
    });
    getMyInsuranceApplications().then((apps) => {
      if (loadSeqRef.current === seq) setInsuranceApps(apps);
    });
    // 공개 상품(노출) + 과거 주문 이력 상품(비노출 포함)을 병렬 로드 후 id 기준 병합한다.
    // 관리자가 상품을 숨겨도 이미 구매한 상품은 주문내역·구매평에서 계속 보여야 하므로
    // history 쪽을 우선한다(같은 id 면 history 값으로 덮어씀).
    Promise.all([getPublicProducts(), getMyHistoryProducts()]).then(([publicProducts, historyProducts]) => {
      if (loadSeqRef.current !== seq) return;
      const merged = new Map(publicProducts.map((product) => [product.id, product]));
      historyProducts.forEach((product) => merged.set(product.id, product));
      setProducts(Array.from(merged.values()));
    });
    setWishlist(getWishlist());

    const reviewsSeq = ++reviewsSeqRef.current;
    getProductReviewsByUser(currentUser.id).then((reviews) => {
      if (reviewsSeqRef.current === reviewsSeq) setReviews(reviews);
    });
    const inquiriesSeq = ++inquiriesSeqRef.current;
    getProductInquiriesByUser(currentUser.id).then((inquiries) => {
      if (inquiriesSeqRef.current === inquiriesSeq) setInquiries(inquiries);
    });
  };

  useEffect(() => {
    // mount 감지 + 클라이언트 전용 스토리지 로딩(SSR-hydration 불일치 방지) — dad 동작 보존,
    // DB 전환 PR에서 마운트 판정 로직 자체를 재작업할 예정.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
    loadData();

    const handleReviewsChanged = () => {
      const seq = ++reviewsSeqRef.current;
      getProductReviewsByUser(getCurrentUser()?.id || '').then((reviews) => {
        if (reviewsSeqRef.current === seq) setReviews(reviews);
      });
    };
    const handleInquiriesChanged = () => {
      const seq = ++inquiriesSeqRef.current;
      getProductInquiriesByUser(getCurrentUser()?.id || '').then((inquiries) => {
        if (inquiriesSeqRef.current === seq) setInquiries(inquiries);
      });
    };

    window.addEventListener(STORAGE_EVENTS.REVIEWS_CHANGED, handleReviewsChanged);
    window.addEventListener(STORAGE_EVENTS.INQUIRIES_CHANGED, handleInquiriesChanged);

    // Hash to query fallback
    if (window.location.hash) {
      const hashMap: Record<string, string> = {
        '#orders': 'orders',
        '#insurance': 'insurance',
        '#wishlist': 'wishlist',
        '#reviews': 'reviews',
        '#inquiries': 'inquiries',
        '#profile': 'profile',
      };
      const newTab = hashMap[window.location.hash];
      if (newTab) {
        router.replace(`/mypage?tab=${newTab}`);
      }
    }

    return () => {
      window.removeEventListener(STORAGE_EVENTS.REVIEWS_CHANGED, handleReviewsChanged);
      window.removeEventListener(STORAGE_EVENTS.INQUIRIES_CHANGED, handleInquiriesChanged);
    };
  }, [router]);

  if (!isMounted || !user) return null;

  // Overview Stats
  const stats = {
    processingOrders: orders.filter(o => !['배송완료', '취소완료', '환불완료'].includes(o.orderStatus)).length,
    shippingOrders: orders.filter(o => o.orderStatus === '배송중').length,
    wishlistCount: wishlist.length,
    writableReviews: orders
      .filter(o => o.orderStatus === '배송완료')
      .flatMap(o => o.items.map(item => ({ orderId: o.id, item })))
      .filter(data => !reviews.some(r => r.reviewTargetKey === buildReviewTargetKey(data.orderId, data.item.productId, data.item.optionName)))
      .length,
    waitingInquiries: inquiries.filter(i => i.status === 'waiting').length,
    insuranceCount: insuranceApps.filter(a => !['완료', '분석완료'].includes(a.status)).length,
  };

  // Handlers
  // orderItemId: OrderItem 고유 id 도입 시 채움 — 지금은 reviewTargetKey 로 유일성을 보장하므로 optional.
  const handleWriteReview = (product: Product, orderId: string, orderItemId?: string, optionName?: string) => {
    setReviewProduct({ ...product, orderId, orderItemId, optionName });
    setReviewInitialData(null);
    setReviewModalOpen(true);
  };

  const handleEditReview = (review: ProductReview, product: Product, optionName?: string) => {
    setReviewProduct({ ...product, optionName });
    setReviewInitialData(review);
    setReviewModalOpen(true);
  };

  const submitReview = async (data: { rating: number; title: string; content: string }) => {
    try {
      if (reviewInitialData) {
        await updateProductReview(reviewInitialData.id, user.id, data);
      } else if (reviewProduct?.orderId) {
        await addProductReview({
          ...data,
          userId: user.id,
          orderId: reviewProduct.orderId,
          orderItemId: reviewProduct.orderItemId,
          reviewTargetKey: buildReviewTargetKey(reviewProduct.orderId, reviewProduct.id, reviewProduct.optionName),
          productId: reviewProduct.id,
          brandId: reviewProduct.brandId,
          optionName: reviewProduct.optionName,
        });
      }
      setReviewModalOpen(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : '구매평 저장에 실패했습니다.');
    }
  };

  const handleDeleteReview = async (id: string) => {
    if (!confirm('구매평을 삭제하시겠습니까?')) return;
    try {
      await deleteProductReview(id, user.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : '구매평 삭제에 실패했습니다.');
    }
  };

  const submitInquiry = async (data: { title: string; content: string; isSecret: boolean; productId?: string; brandId?: string }) => {
    try {
      if (inquiryInitialData) {
        await updateProductInquiry(inquiryInitialData.id, user.id, data);
      } else {
        await addProductInquiry({
          ...data,
          userId: user.id,
        } as Omit<ProductInquiry, 'id' | 'createdAt' | 'updatedAt' | 'status'>);
      }
      setInquiryModalOpen(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : '상품문의 저장에 실패했습니다.');
    }
  };

  const handleDeleteInquiry = async (id: string) => {
    if (!confirm('상품문의를 삭제하시겠습니까?')) return;
    try {
      await deleteProductInquiry(id, user.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : '상품문의 삭제에 실패했습니다.');
    }
  };

  const renderContent = () => {
    switch (tab) {
      case 'orders':
        return <OrdersSection orders={orders} reviews={reviews} products={products} onWriteReview={handleWriteReview} />;
      case 'wishlist':
        return <WishlistSection wishlistIds={wishlist} products={products} onWishlistChange={() => setWishlist(getWishlist())} />;
      case 'reviews':
        return (
          <ReviewsSection
            orders={orders}
            reviews={reviews}
            products={products}
            onWriteReview={handleWriteReview}
            onEditReview={handleEditReview}
            onDeleteReview={handleDeleteReview}
          />
        );
      case 'inquiries':
        return (
          <InquiriesSection
            inquiries={inquiries}
            products={products}
            onWriteInquiry={() => { setInquiryInitialData(null); setInquiryModalOpen(true); }}
            onEditInquiry={(inquiry) => { setInquiryInitialData(inquiry); setInquiryModalOpen(true); }}
            onDeleteInquiry={handleDeleteInquiry}
          />
        );
      case 'insurance':
        return <InsuranceSection applications={insuranceApps} />;
      case 'profile':
        return (
          <>
            <ProfileSection user={user} />
            {user.provider !== 'kakao' && user.provider !== 'naver' && <PasswordChangeSection />}
          </>
        );
      case 'overview':
      default:
        return (
          <>
            {(!user.provider || user.provider === 'email') && user.emailVerified === false && <EmailVerifyBanner />}
            <OverviewSection stats={stats} />
          </>
        );
    }
  };

  return (
    <div className="mypage-page">
      <div className="mypage-container">
        <MypageSidebar user={user} activeTab={tab} />

        <main className="mypage-content">
          <MypageMobileNav activeTab={tab} />
          {renderContent()}
        </main>
      </div>

      <ReviewFormModal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        onSubmit={submitReview}
        initialData={
          reviewInitialData
            ? { rating: reviewInitialData.rating, title: reviewInitialData.title ?? '', content: reviewInitialData.content }
            : undefined
        }
        product={reviewProduct || { name: '', image: '' }}
        optionName={reviewProduct?.optionName}
      />

      <InquiryFormModal
        isOpen={inquiryModalOpen}
        onClose={() => setInquiryModalOpen(false)}
        onSubmit={submitInquiry}
        initialData={
          inquiryInitialData
            ? {
                title: inquiryInitialData.title,
                content: inquiryInitialData.content,
                isSecret: inquiryInitialData.isSecret ?? false,
                productId: inquiryInitialData.productId,
              }
            : undefined
        }
        availableProducts={products}
      />
    </div>
  );
}

export default function MyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8F6F0]" />}>
      <MypageContent />
    </Suspense>
  );
}
