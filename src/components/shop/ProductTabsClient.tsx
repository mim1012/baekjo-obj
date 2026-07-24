'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ReviewViewItem, InquiryViewItem, User, Order, Product, Shipment } from '@/types';
import { getMergedReviews, getMergedInquiries } from '@/lib/adapters';
import { getSessionUser, getMyOrders, getOrderShipments, getProductReviewsByUser, STORAGE_EVENTS, addProductReview, addProductInquiry, buildReviewTargetKey } from '@/lib/storage';
import { canReviewOrderItem } from '@/lib/reviews/purchaseEligibility';
import { Lock, MessageCircle, Star } from 'lucide-react';
import { formatDate, ratingStars } from '@/lib/format';
import EmptyState from '@/components/common/EmptyState';
import ReviewFormModal from '@/components/reviews/ReviewFormModal';
import InquiryFormModal from '@/components/inquiries/InquiryFormModal';
import Pagination from '@/app/mypage/components/Pagination';

interface ProductTabsClientProps {
  product: Product;
  children: React.ReactNode;
}

interface WritableItem {
  orderId: string;
  /** OrderItem Í≥†Ïú† id ?ÑÏûÖ ??Ï±ÑÏ? ??ÏßÄÍ∏àÏ? reviewTargetKey Î°??†Ïùº?±ÏùÑ Î≥¥Ïû•?òÎ?Î°?optional. */
  orderItemId?: string;
  optionName?: string;
}

export default function ProductTabsClient({ product, children }: ProductTabsClientProps) {
  const router = useRouter();
  
  const [reviews, setReviews] = useState<ReviewViewItem[]>([]);
  const [inquiries, setInquiries] = useState<InquiryViewItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [shipmentsByOrder, setShipmentsByOrder] = useState<Record<string, Shipment[]>>({});
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

  // loadData ??mount¬∑product.id Î≥ÄÍ≤Ω¬∑STORAGE_EVENTS Î¶¨Ïä§?àÏóê??Í∞ÅÍ∞Å ?ÖÎ¶Ω?ÅÏúºÎ°??¨Ìò∏Ï∂úÎêú??  // (?®Ïùº useEffect cleanup?ºÎ°ú??Î™??°Îäî Î≤îÏúÑ) ??ÎßàÏ?Îß??∏Ï∂ú Î≤àÌò∏Îß??†Î¢∞??Î®ºÏ? ?úÏûë?àÏ?Îß?  // ??≤å ?ëÎãµ???îÏ≤≠??ÏµúÏã† ?ÅÌÉúÎ•???ñ¥?∞Ï? ?äÍ≤å ?úÎã§(last-response-wins ?àÏù¥??Î∞©Ï?).
  const loadSeqRef = useRef(0);

  const loadData = useCallback(() => {
    const seq = ++loadSeqRef.current;
    getSessionUser().then((currentUser) => {
      if (loadSeqRef.current !== seq) return;
      setUser(currentUser);
      if (!currentUser) {
        setOrders([]);
        setShipmentsByOrder({});
        return;
      }
      getMyOrders().then(async (orders) => {
        const shipmentPairs = await Promise.all(
          orders.map(async (order) => [order.id, await getOrderShipments(order.id)] as const),
        );
        if (loadSeqRef.current === seq) {
          setOrders(orders);
          setShipmentsByOrder(Object.fromEntries(shipmentPairs));
        }
      });
    });
    getMergedReviews(product.id).then((reviews) => {
      if (loadSeqRef.current === seq) setReviews(reviews);
    });
    getMergedInquiries(product.id).then((inquiries) => {
      if (loadSeqRef.current === seq) setInquiries(inquiries);
    });
  }, [product.id]);

  useEffect(() => {
    // mount Í∞êÏ? + ?¥Îùº?¥Ïñ∏???ÑÏö© ?§ÌÜ†Î¶¨Ï? Î°úÎî©(SSR-hydration Î∂àÏùºÏπ?Î∞©Ï?) ??dad ?ôÏûë Î≥¥Ï°¥,
    // DB ?ÑÌôò PR?êÏÑú ÎßàÏö¥???êÏ†ï Î°úÏßÅ ?êÏ≤¥Î•??¨Ïûë?ÖÌï† ?àÏ†ï.
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
  }, [loadData]);

  // reviews ???ÑÎûò Î≥∏Î¨∏?êÏÑú ÏßÅÏ†ë ?ΩÏ? ?äÏ?Îß???ÉÅ getProductReviewsByUser Î°?ÏµúÏã†Í∞íÏùÑ
  // ?§Ïãú Ï°∞Ìöå), Î¶¨Î∑∞ ?ëÏÑ±/??†ú ????effect Î•??¨Ïã§?âÏãú?§Îäî ?†Ìò∏Î°?deps ??Î™ÖÏãú?úÎã§.
  // orders Í∞±Ïã†?êÎßå ?òÏ°¥?òÎ©¥ Î¶¨Î∑∞Îß?Î∞îÎÄåÍ≥† orders Í∞Ä Í∑∏Î?Î°úÏùº ??writableItems Í∞Ä
  // stale ?¥Ï???Î¨∏Ï†úÍ∞Ä ?àÏóà??codex ÏßÄ??.
  useEffect(() => {
    if (!user || !orders.length) {
      // user/orders Í∞Ä ?ÑÏßÅ ?ÜÏùÑ ???¥Ï†Ñ Í∞íÏù¥ ?®Ï? ?äÎèÑÎ°?Ï¥àÍ∏∞??dad ?ôÏûë Î≥¥Ï°¥,
      // DB ?ÑÌôò PR?êÏÑú ?¨Ïûë???àÏ†ï).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWritableItems([]);
      return;
    }

    let cancelled = false;
    getProductReviewsByUser(user.id).then((rawReviews) => {
      if (cancelled) return;
      const writable: WritableItem[] = [];
      orders.forEach(order => {
        order.items.forEach(item => {
          if (item.productId === product.id) {
            const reviewTargetKey = buildReviewTargetKey(order.id, item.productId, item.optionName);
            if (
              canReviewOrderItem(order, item, shipmentsByOrder[order.id] ?? []) &&
              !rawReviews.some(r => r.reviewTargetKey === reviewTargetKey)
            ) {
              writable.push({ orderId: order.id, optionName: item.optionName });
            }
          }
        });
      });
      setWritableItems(writable);
    });

    return () => {
      cancelled = true;
    };
  }, [user, orders, shipmentsByOrder, product.id, reviews]);

  // Î∂ÄÎ™?Î¶¨Î†å?îÎßà????Í∞ùÏ≤¥ Î¶¨ÌÑ∞????InquiryFormModal ??effect ?¨Î∞ú?îÎ°ú ?ëÏÑ± Ï§?Î¨∏ÏùòÍ∞Ä ?åÎ¶¨ ?ÜÏù¥
  // Ï¶ùÎ∞ú?òÎçò Î≤ÑÍ∑∏(2026-07-18 e2e ?§Ï∏°). effect Ï™?deps Î•??êÏãúÍ∞íÏúºÎ°?Î∞îÍæº Í≤ÉÎßå?ºÎ°ú??ÎßâÌûàÏßÄÎß?
  // Î∞©Ïñ¥?ÅÏúºÎ°??¨Í∏∞?úÎèÑ Ï∞∏Ï°∞Î•??àÏ†ï?îÌï¥ ?êÏãù Î¶¨Î†å???êÏ≤¥Î•?Ï§ÑÏù∏??defense in depth). early return
  // (isMounted Í∞Ä?? Î≥¥Îã§ ?ÑÏóê ?¨Ïïº ???∏Ï∂ú ?úÏÑúÍ∞Ä ?åÎçîÎßàÎã§ ?ºÏ†ï?òÍ≤å ?†Ï??úÎã§.
  const inquiryProduct = useMemo(
    () => ({
      id: product.id,
      name: product.name,
      image: product.image,
      brandName: product.brandName,
      brandId: product.brandId,
    }),
    [product.id, product.name, product.image, product.brandName, product.brandId],
  );

  if (!isMounted) return null;

  const tabs = [
    ['?ÅÌíà ?¥ÏïºÍ∏?, 'story'],
    ['?±Î∂Ñ¬∑?¨Ïö©Î≤?, 'details'],
    ['?¥Ìé¥Î≥?Í∏∞Ï?', 'standard'],
    [`?ÑÍ∏∞ ${reviews.length}`, 'reviews'],
    [`Î¨∏Ïùò ${inquiries.length}`, 'qna'],
  ];

  const handleWriteReviewClick = () => {
    if (!user) {
      alert('Î°úÍ∑∏?????¥Ïö© Í∞Ä?•Ìï©?àÎã§.');
      router.push('/login');
      return;
    }
    if (writableItems.length === 0) {
      alert('???ÅÌíà??Íµ¨Îß§?òÍ≥† Î∞∞ÏÜ° ?ÑÎ£å???¥Ïó≠???ÜÍ±∞?? ?¥Î? Î™®Îì† ?ÑÍ∏∞Î•??ëÏÑ±?òÏÖ®?µÎãà??');
      return;
    }
    setReviewModalOpen(true);
  };

  const handleWriteInquiryClick = () => {
    if (!user) {
      alert('Î°úÍ∑∏?????¥Ïö© Í∞Ä?•Ìï©?àÎã§.');
      router.push('/login');
      return;
    }
    setInquiryModalOpen(true);
  };

  const submitReview = async (data: { rating: number; title: string; content: string }) => {
    // Pick the first writable item
    const target = writableItems[0];
    if (!target || !user) return;

    try {
      await addProductReview({
        ...data,
        userId: user.id,
        orderId: target.orderId,
        // orderItemId: OrderItem Í≥†Ïú† id ?ÑÏûÖ ??Ï±ÑÏ? ??reviewTargetKey Î°??†Ïùº??Î≥¥Ïû•.
        reviewTargetKey: buildReviewTargetKey(target.orderId, product.id, target.optionName),
        productId: product.id,
        brandId: product.brandId,
        optionName: target.optionName,
      });
      alert('Íµ¨Îß§?âÏù¥ ?±Î°ù?òÏóà?µÎãà??');
      setReviewModalOpen(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Íµ¨Îß§???±Î°ù???§Ìå®?àÏäµ?àÎã§.');
    }
  };

  const submitInquiry = async (data: { title: string; content: string; isSecret: boolean }) => {
    if (!user) return;
    try {
      await addProductInquiry({
        ...data,
        userId: user.id,
        productId: product.id,
        brandId: product.brandId,
      });
      alert('?ÅÌíàÎ¨∏ÏùòÍ∞Ä ?±Î°ù?òÏóà?µÎãà??');
      setInquiryModalOpen(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : '?ÅÌíàÎ¨∏Ïùò ?±Î°ù???§Ìå®?àÏäµ?àÎã§.');
    }
  };

  const paginatedReviews = reviews.slice((reviewsPage - 1) * ITEMS_PER_PAGE, reviewsPage * ITEMS_PER_PAGE);
  const paginatedInquiries = inquiries.slice((inquiriesPage - 1) * ITEMS_PER_PAGE, inquiriesPage * ITEMS_PER_PAGE);

  return (
    <>
      <div className="sticky top-16 z-20 mt-12 border-b border-[#E7E0D5] bg-white/95 backdrop-blur-xl lg:top-[72px]">
        <nav aria-label="?ÅÌíà ?ÅÏÑ∏ Î©îÎâ¥" className="hide-scrollbar -mb-px flex gap-6 overflow-x-auto">
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
              <p className="page-eyebrow">Î∞òÎ†§Í∞ÄÏ°??¥ÏïºÍ∏?/p>
              <h2 className="mt-2 text-xl font-bold text-[#17211D]">???ÅÌíà???®Î≥∏ ?¥ÏïºÍ∏?/h2>
            </div>
            <button
              onClick={handleWriteReviewClick}
              className="text-sm font-semibold text-[#6F766F] transition-colors duration-500 hover:text-[#17211D]"
            >
              ?ÑÍ∏∞ ?®Í∏∞Í∏?            </button>
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
                      {review.usePeriod && <span className="rounded bg-[#F3EEE6] px-1.5 py-0.5">{review.usePeriod} ?¨Ïö©</span>}
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium text-[#8A918B]">
                      <span className="rounded bg-[#F3EEE6] px-1.5 py-0.5">Íµ¨Îß§??/span>
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
              title="???ÅÌíà???¥ÏïºÍ∏∞Îäî ?ÑÏßÅ ?ÜÏñ¥??"
              description="Î®ºÏ? ?¨Ïö©??Î≥?Í≤ΩÌóò???ìÏù¥Î©??¥Í≥≥??Ï∞®Í≥°Ï∞®Í≥° ?åÍ∞ú?†Í≤å??"
              actionLabel="?§Î•∏ ?Ä?âÏÖò Î≥¥Í∏∞"
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
              <p className="page-eyebrow">?ÅÌíà Î¨∏Ïùò</p>
              <h2 className="mt-2 text-xl font-bold text-[#17211D]">Í∂ÅÍ∏à???êÏùÑ ?®Í≤®Ï£ºÏÑ∏??</h2>
            </div>
            <button
              onClick={handleWriteInquiryClick}
              className="btn-secondary min-h-10 px-4 py-2 text-xs"
            >
              <MessageCircle className="size-4" />
              Î¨∏Ïùò?òÍ∏∞
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
                      {qna.status === 'answered' ? '?µÎ??ÑÎ£å' : '?µÎ??ÄÍ∏?}
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
                        <span className="font-bold text-[#17211D]">Î∞±Ï°∞?§Î∏å??/span>
                        <span className="text-xs text-[#8A918B]">{formatDate(qna.answeredAt || qna.createdAt)}</span>
                      </div>
                      <p className="text-[#6F766F] whitespace-pre-wrap">{qna.answer}</p>
                    </div>
                  )}
                  
                  {qna.isSecret && !(user && (user.id === qna.userId || user.role === 'admin' || (user.role === 'partner' && user.managedBrandIds?.includes(qna.brandId || '')))) && (
                    <p className="mt-3 text-sm italic text-[#8A918B] pl-1">ÎπÑÎ?Í∏Ä?ÖÎãà??</p>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="?ÑÏßÅ ?±Î°ù??Î¨∏ÏùòÍ∞Ä ?ÜÏñ¥??"
              description="?ÅÌíà???Ä??Í∂ÅÍ∏à???êÏù¥ ?àÎã§Î©??∏ÌïòÍ≤??®Í≤®Ï£ºÏÑ∏??"
              actionLabel="Î°úÍ∑∏?∏ÌïòÍ≥?Î¨∏Ïùò?òÍ∏∞"
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
        product={inquiryProduct}
      />
    </>
  );
}
