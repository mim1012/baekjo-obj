'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ReviewViewItem, InquiryViewItem, User, Order, Product } from '@/types';
import { getMergedReviews, getMergedInquiries } from '@/lib/adapters';
import { getCurrentUser, getMyOrders, getProductReviewsByUser, STORAGE_EVENTS, addProductReview, addProductInquiry, buildReviewTargetKey } from '@/lib/storage';
import { Lock, MessageCircle, Star } from 'lucide-react';
import { formatDate, formatPrice, ratingStars } from '@/lib/format';
import EmptyState from '@/components/common/EmptyState';
import ReviewFormModal from '@/components/reviews/ReviewFormModal';
import InquiryFormModal from '@/components/inquiries/InquiryFormModal';
import Pagination from '@/app/mypage/components/Pagination';

interface ProductTabsClientProps {
  product: Product;
  children: React.ReactNode;
}

/** 배송완료 후 아직 구매평을 쓰지 않은 주문상품 — 후기 작성 모달에 넘길 최소 컨텍스트. */
interface WritableItem {
  orderId: string;
  /** OrderItem 고유 id 도입 시 채움 — 지금은 reviewTargetKey 로 유일성을 보장하므로 optional. */
  orderItemId?: string;
  optionName?: string;
}

export default function ProductTabsClient({ product, children }: ProductTabsClientProps) {
  const router = useRouter();
  
  const [reviews, setReviews] = useState<ReviewViewItem[]>([]);
  const [inquiries, setInquiries] = useState<InquiryViewItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  // Pagination states
  const [reviewsPage, setReviewsPage] = useState(1);
  const [inquiriesPage, setInquiriesPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  // Modals state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);
  
  // Writable review targets
  const [writableItems, setWritableItems] = useState<WritableItem[]>([]);

  const loadData = () => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    if (currentUser) {
      getMyOrders().then(setOrders);
    }
    setReviews(getMergedReviews(product.id));
    setInquiries(getMergedInquiries(product.id));
  };

  useEffect(() => {
    // mount 감지 + 클라이언트 전용 스토리지 로딩(SSR-hydration 불일치 방지) — dad 동작 보존,
    // DB 전환 PR에서 마운트 판정 로직 자체를 재작업할 예정.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
    loadData();

    const handleStorageChange = () => loadData();
    window.addEventListener(STORAGE_EVENTS.REVIEWS_CHANGED, handleStorageChange);
    window.addEventListener(STORAGE_EVENTS.INQUIRIES_CHANGED, handleStorageChange);

    return () => {
      window.removeEventListener(STORAGE_EVENTS.REVIEWS_CHANGED, handleStorageChange);
      window.removeEventListener(STORAGE_EVENTS.INQUIRIES_CHANGED, handleStorageChange);
    };
  }, [product.id]);

  useEffect(() => {
    if (!user || !orders.length) {
      // user/orders 가 아직 없을 때 이전 값이 남지 않도록 초기화(dad 동작 보존,
      // DB 전환 PR에서 재작업 예정).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWritableItems([]);
      return;
    }

    let cancelled = false;
    const rawReviews = getProductReviewsByUser(user.id);
    const writable: WritableItem[] = [];
    orders.forEach(order => {
      if (order.orderStatus === '배송완료') {
        order.items.forEach(item => {
          if (item.productId === product.id) {
            const reviewTargetKey = buildReviewTargetKey(order.id, item.productId, item.optionName);
            if (!rawReviews.some(r => r.reviewTargetKey === reviewTargetKey)) {
              writable.push({ orderId: order.id, optionName: item.optionName });
            }
          }
        });
      }
    });
    if (!cancelled) setWritableItems(writable);

    return () => {
      cancelled = true;
    };
  }, [user, orders, product.id]);

  if (!isMounted) return null;

  const tabs = [
    ['상품 이야기', 'story'],
    ['성분·사용법', 'details'],
    ['살펴본 기준', 'standard'],
    [`후기 ${reviews.length}`, 'reviews'],
    [`문의 ${inquiries.length}`, 'qna'],
  ];

  const handleWriteReviewClick = () => {
    if (!user) {
      alert('로그인 후 이용 가능합니다.');
      router.push('/login');
      return;
    }
    if (writableItems.length === 0) {
      alert('이 상품을 구매하고 배송 완료된 내역이 없거나, 이미 모든 후기를 작성하셨습니다.');
      return;
    }
    setReviewModalOpen(true);
  };

  const handleWriteInquiryClick = () => {
    if (!user) {
      alert('로그인 후 이용 가능합니다.');
      router.push('/login');
      return;
    }
    setInquiryModalOpen(true);
  };

  const submitReview = (data: { rating: number; title: string; content: string }) => {
    // Pick the first writable item
    const target = writableItems[0];
    if (!target || !user) return;

    try {
      addProductReview({
        ...data,
        userId: user.id,
        orderId: target.orderId,
        // orderItemId: OrderItem 고유 id 도입 시 채움 — reviewTargetKey 로 유일성 보장.
        reviewTargetKey: buildReviewTargetKey(target.orderId, product.id, target.optionName),
        productId: product.id,
        brandId: product.brandId,
      });
      alert('구매평이 등록되었습니다.');
      setReviewModalOpen(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : '구매평 등록에 실패했습니다.');
    }
  };

  const submitInquiry = (data: { title: string; content: string; isSecret: boolean }) => {
    if (!user) return;
    addProductInquiry({
      ...data,
      userId: user.id,
      productId: product.id,
      brandId: product.brandId,
    });
    alert('상품문의가 등록되었습니다.');
    setInquiryModalOpen(false);
  };

  const paginatedReviews = reviews.slice((reviewsPage - 1) * ITEMS_PER_PAGE, reviewsPage * ITEMS_PER_PAGE);
  const paginatedInquiries = inquiries.slice((inquiriesPage - 1) * ITEMS_PER_PAGE, inquiriesPage * ITEMS_PER_PAGE);

  return (
    <>
      <div className="sticky top-16 z-20 mt-12 border-b border-[#E7E0D5] bg-[#FBFAF7]/95 backdrop-blur-xl lg:top-[72px]">
        <nav aria-label="상품 상세 메뉴" className="hide-scrollbar -mb-px flex gap-6 overflow-x-auto">
          {tabs.map(([label, target]) => (
            <a
              key={target}
              href={`#${target}`}
              className="shrink-0 border-b-2 border-transparent py-4 text-sm font-semibold text-[#6F766F] transition-colors duration-500 hover:border-[#17211D] hover:text-[#17211D] focus:border-[#17211D] focus:text-[#17211D]"
            >
              {label}
            </a>
          ))}
        </nav>
      </div>

      <div className="space-y-20 py-12 lg:space-y-28 lg:py-20">
        {/* Render static sections from server component */}
        {children}

        {/* Reviews Section */}
        <section id="reviews" className="scroll-mt-36">
          <div className="mb-6 flex items-end justify-between border-b border-[#E7E0D5] pb-4">
            <div>
              <p className="page-eyebrow">반려가족 이야기</p>
              <h2 className="mt-2 text-xl font-bold text-[#17211D]">이 상품을 써본 이야기</h2>
            </div>
            <button
              onClick={handleWriteReviewClick}
              className="text-sm font-semibold text-[#6F766F] transition-colors duration-500 hover:text-[#17211D]"
            >
              후기 남기기
            </button>
          </div>
          
          {reviews.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {paginatedReviews.map((review) => (
                <div key={review.id} className="flex flex-col gap-4 rounded-2xl border border-[#E7E0D5] bg-white p-5 sm:p-6 transition-colors hover:border-[#17211D]/30">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-0.5">
                      {ratingStars(review.rating).map((star, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            star === 'full' ? 'fill-[#17211D] text-[#17211D]' : 'fill-[#E7E0D5] text-[#E7E0D5]'
                          }`}
                        />
                      ))}
                    </div>
                    {review.isBest && (
                      <span className="rounded-full bg-[#17211D] px-2 py-0.5 text-[10px] font-bold text-white">BEST</span>
                    )}
                  </div>

                  {review.source === 'seed' ? (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium text-[#8A918B]">
                      {review.breed && <span className="rounded bg-[#F3EEE6] px-1.5 py-0.5">{review.breed}</span>}
                      {review.age && <span className="rounded bg-[#F3EEE6] px-1.5 py-0.5">{review.age}</span>}
                      {review.usePeriod && <span className="rounded bg-[#F3EEE6] px-1.5 py-0.5">{review.usePeriod} 사용</span>}
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium text-[#8A918B]">
                      <span className="rounded bg-[#F3EEE6] px-1.5 py-0.5">구매자</span>
                      <span className="rounded bg-[#F3EEE6] px-1.5 py-0.5">{formatDate(review.createdAt)}</span>
                    </div>
                  )}

                  <div className="flex-1">
                    {review.title && <h4 className="mb-1 text-sm font-semibold text-[#17211D]">{review.title}</h4>}
                    <p className="whitespace-pre-wrap break-keep text-sm leading-relaxed text-[#17211D]">
                      {review.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="이 상품의 이야기는 아직 없어요."
              description="먼저 사용해 본 경험이 쌓이면 이곳에 차곡차곡 소개할게요."
              actionLabel="다른 셀렉션 보기"
              actionHref="/shop"
            />
          )}

          {reviews.length > ITEMS_PER_PAGE && (
            <div className="mt-8">
              <Pagination
                currentPage={reviewsPage}
                totalItems={reviews.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setReviewsPage}
              />
            </div>
          )}
        </section>

        {/* Inquiries Section */}
        <section id="qna" className="scroll-mt-36">
          <div className="mb-6 flex items-end justify-between border-b border-[#E7E0D5] pb-4">
            <div>
              <p className="page-eyebrow">상품 문의</p>
              <h2 className="mt-2 text-xl font-bold text-[#17211D]">궁금한 점을 남겨주세요.</h2>
            </div>
            <button
              onClick={handleWriteInquiryClick}
              className="btn-secondary min-h-10 px-4 py-2 text-xs"
            >
              <MessageCircle className="size-4" />
              문의하기
            </button>
          </div>
          
          {inquiries.length > 0 ? (
            <div className="border-t border-[#E7E0D5]">
              {paginatedInquiries.map((qna) => (
                <article key={qna.id} className="border-b border-[#E7E0D5] py-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      qna.status === 'answered' ? 'bg-[#17211D] text-white' : 'bg-[#F3EEE6] text-[#6F766F]'
                    }`}>
                      {qna.status === 'answered' ? '답변완료' : '답변대기'}
                    </span>
                    <h3 className="flex items-center gap-1.5 break-keep text-sm font-semibold text-[#17211D]">
                      {qna.isSecret && <Lock className="size-3 text-[#6F766F]" />}
                      {qna.title || qna.question}
                    </h3>
                    <time className="ml-auto text-xs tabular-nums text-[#8A918B]">{formatDate(qna.createdAt)}</time>
                  </div>
                  
                  {(!qna.isSecret || (user && (user.id === qna.userId || user.role === 'admin' || (user.role === 'partner' && user.managedBrandIds?.includes(qna.brandId || ''))))) && (
                    <p className="mt-3 text-sm leading-6 text-[#6F766F] pl-1">{qna.content}</p>
                  )}

                  {qna.answer && (!qna.isSecret || (user && (user.id === qna.userId || user.role === 'admin' || (user.role === 'partner' && user.managedBrandIds?.includes(qna.brandId || ''))))) && (
                    <div className="mt-4 rounded-2xl bg-[#FAF8F3] p-4 text-sm leading-6">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-[#17211D]">백조오브제</span>
                        <span className="text-xs text-[#8A918B]">{formatDate(qna.answeredAt || qna.createdAt)}</span>
                      </div>
                      <p className="text-[#6F766F] whitespace-pre-wrap">{qna.answer}</p>
                    </div>
                  )}
                  
                  {qna.isSecret && !(user && (user.id === qna.userId || user.role === 'admin' || (user.role === 'partner' && user.managedBrandIds?.includes(qna.brandId || '')))) && (
                    <p className="mt-3 text-sm italic text-[#8A918B] pl-1">비밀글입니다.</p>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="아직 등록된 문의가 없어요."
              description="상품에 대해 궁금한 점이 있다면 편하게 남겨주세요."
              actionLabel="로그인하고 문의하기"
              actionHref="/login"
            />
          )}

          {inquiries.length > ITEMS_PER_PAGE && (
            <div className="mt-8">
              <Pagination
                currentPage={inquiriesPage}
                totalItems={inquiries.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setInquiriesPage}
              />
            </div>
          )}
        </section>
      </div>

      <ReviewFormModal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        onSubmit={submitReview}
        product={product}
        optionName={writableItems[0]?.optionName}
      />

      <InquiryFormModal
        isOpen={inquiryModalOpen}
        onClose={() => setInquiryModalOpen(false)}
        onSubmit={submitInquiry}
        product={{
          id: product.id,
          name: product.name,
          image: product.image,
          brandName: product.brandName,
          brandId: product.brandId,
        }}
      />
    </>
  );
}
