'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { User, Order, InsuranceApplication, ProductReview, ProductInquiry } from '@/types';
import {
  getCurrentUser,
  getOrders,
  getInsuranceApplications,
  getWishlist,
  getProductReviewsByUser,
  addProductReview,
  updateProductReview,
  deleteProductReview,
  getProductInquiriesByUser,
  addProductInquiry,
  updateProductInquiry,
  deleteProductInquiry,
  STORAGE_EVENTS,
} from '@/lib/storage';
import { products } from '@/data/products';

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
  
  const [isMounted, setIsMounted] = useState(false);

  // Modals state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewInitialData, setReviewInitialData] = useState<any>(null);
  const [reviewProduct, setReviewProduct] = useState<any>(null);
  
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);
  const [inquiryInitialData, setInquiryInitialData] = useState<any>(null);

  const loadData = () => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.replace('/login');
      return;
    }
    setUser(currentUser);
    
    // 권한 필터링: 자기 주문만
    const allOrders = getOrders();
    const myOrders = allOrders.filter(o => o.customerName === currentUser.name); // Mock이므로 이름으로 매칭
    setOrders(myOrders);
    
    setInsuranceApps(getInsuranceApplications());
    setWishlist(getWishlist());
    setReviews(getProductReviewsByUser(currentUser.id));
    setInquiries(getProductInquiriesByUser(currentUser.id));
  };

  useEffect(() => {
    setIsMounted(true);
    loadData();

    const handleReviewsChanged = () => setReviews(getProductReviewsByUser(getCurrentUser()?.id || ''));
    const handleInquiriesChanged = () => setInquiries(getProductInquiriesByUser(getCurrentUser()?.id || ''));
    
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
      .filter(data => !reviews.some(r => r.reviewTargetKey === `${data.orderId}:${data.item.productId}:${data.item.optionName ?? 'default'}`))
      .length,
    waitingInquiries: inquiries.filter(i => i.status === 'waiting').length,
    insuranceCount: insuranceApps.filter(a => !['완료', '분석완료'].includes(a.status)).length,
  };

  // Handlers
  const handleWriteReview = (product: any, orderId: string, orderItemId: string, optionName?: string) => {
    setReviewProduct({ ...product, orderId, orderItemId, optionName });
    setReviewInitialData(null);
    setReviewModalOpen(true);
  };

  const handleEditReview = (review: ProductReview, product: any, optionName?: string) => {
    setReviewProduct({ ...product, optionName });
    setReviewInitialData(review);
    setReviewModalOpen(true);
  };

  const submitReview = (data: any) => {
    if (reviewInitialData) {
      updateProductReview(reviewInitialData.id, user.id, data);
    } else {
      addProductReview({
        ...data,
        userId: user.id,
        orderId: reviewProduct.orderId,
        orderItemId: reviewProduct.orderItemId,
        reviewTargetKey: `${reviewProduct.orderId}:${reviewProduct.id}:${reviewProduct.optionName ?? 'default'}`,
        productId: reviewProduct.id,
        brandId: reviewProduct.brandId,
      });
    }
    setReviewModalOpen(false);
  };

  const handleDeleteReview = (id: string) => {
    if (confirm('구매평을 삭제하시겠습니까?')) {
      deleteProductReview(id, user.id);
    }
  };

  const submitInquiry = (data: any) => {
    if (inquiryInitialData) {
      updateProductInquiry(inquiryInitialData.id, user.id, data);
    } else {
      addProductInquiry({
        ...data,
        userId: user.id,
      });
    }
    setInquiryModalOpen(false);
  };

  const handleDeleteInquiry = (id: string) => {
    if (confirm('상품문의를 삭제하시겠습니까?')) {
      deleteProductInquiry(id, user.id);
    }
  };

  const renderContent = () => {
    switch (tab) {
      case 'orders':
        return <OrdersSection orders={orders} reviews={reviews} onWriteReview={handleWriteReview} />;
      case 'wishlist':
        return <WishlistSection wishlistIds={wishlist} onWishlistChange={() => setWishlist(getWishlist())} />;
      case 'reviews':
        return (
          <ReviewsSection
            orders={orders}
            reviews={reviews}
            onWriteReview={handleWriteReview}
            onEditReview={handleEditReview}
            onDeleteReview={handleDeleteReview}
          />
        );
      case 'inquiries':
        return (
          <InquiriesSection
            inquiries={inquiries}
            onWriteInquiry={() => { setInquiryInitialData(null); setInquiryModalOpen(true); }}
            onEditInquiry={(inquiry, product) => { setInquiryInitialData(inquiry); setInquiryModalOpen(true); }}
            onDeleteInquiry={handleDeleteInquiry}
          />
        );
      case 'insurance':
        return <InsuranceSection applications={insuranceApps} />;
      case 'profile':
        return <ProfileSection user={user} />;
      case 'overview':
      default:
        return <OverviewSection stats={stats} />;
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
        initialData={reviewInitialData}
        product={reviewProduct || { name: '', image: '' }}
        optionName={reviewProduct?.optionName}
      />

      <InquiryFormModal
        isOpen={inquiryModalOpen}
        onClose={() => setInquiryModalOpen(false)}
        onSubmit={submitInquiry}
        initialData={inquiryInitialData}
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
