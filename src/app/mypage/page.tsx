'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, FileText, Heart, User, ChevronRight, MessageCircle, Star, Settings, ShoppingBag, Truck, Lock } from 'lucide-react';
import { getMyOrders, getMyInsuranceApplications, getWishlist, getCurrentUser, getPublicProducts, getQnaConfig } from '@/lib/storage';
import { reviews } from '@/data/reviews';
import { formatPrice, formatDate } from '@/lib/format';
import { useMounted } from '@/lib/useMounted';
import type { InsuranceApplication, Order, Product, QnA } from '@/types';
import PasswordChangeSection from '@/components/mypage/PasswordChangeSection';
import EmailVerifyBanner from '@/components/mypage/EmailVerifyBanner';

export default function MyPage() {
  const mounted = useMounted();
  // 주문은 서버(세션 기준 내 주문)에서 비동기로 불러온다. 세션이 없으면 빈 배열.
  // 로딩 중과 '주문 없음'을 구분해야 주문 있는 회원에게 빈 상태가 잠깐 노출되지 않는다.
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  // 관심 상품 조인용 카탈로그. 위시리스트 자체는 localStorage(동기)라 orders 와 별도로 로딩 관리.
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  // 보험 신청은 세션 기준 내 신청만(getMyInsuranceApplications). orders 와 동일한 비동기 로딩 패턴.
  const [insuranceApps, setInsuranceApps] = useState<InsuranceApplication[]>([]);
  const [insuranceLoading, setInsuranceLoading] = useState(true);
  // 상품문의는 콘센트(getQnaConfig)로 DB 싱글턴 config 를 읽는다(정적 @/data/qna 직접 참조 제거 — §4).
  const [qnaItems, setQnaItems] = useState<QnA[]>([]);

  useEffect(() => {
    let cancelled = false;
    getMyOrders().then((list) => {
      if (cancelled) return;
      const sorted = [...list].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setOrders(sorted);
      setOrdersLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getMyInsuranceApplications().then((list) => {
      if (cancelled) return;
      const sorted = [...list].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setInsuranceApps(sorted);
      setInsuranceLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
    let cancelled = false;
    getQnaConfig().then((config) => {
      if (cancelled) return;
      setQnaItems(config.items);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!mounted) return null;

  const wishlistedIds = getWishlist();
  const wishlist = productsLoading ? [] : products.filter((product) => wishlistedIds.includes(product.id));
  const currentUser = getCurrentUser();
  // 소셜 가입 시 이메일 미제공이면 내부용 플레이스홀더가 저장된다 → 화면에 노출 금지.
  const isPlaceholderEmail = currentUser?.email.endsWith('@placeholder.baekjo') ?? false;
  const providerLabel =
    currentUser?.provider === 'kakao' ? '카카오' : currentUser?.provider === 'naver' ? '네이버' : null;
  return (
    <div className="bg-[#F4F2EC] min-h-dvh py-12">
      <div className="site-container">
        <h1 className="text-2xl font-bold text-[#202521] mb-8">마이페이지</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-sm shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-[#E4E8E3] flex items-center justify-center text-[#2F3B34]">
                {currentUser?.profileImage ? (
                  // 외부(카카오/네이버) 프로필 URL이라 next/image 도메인 설정 없이 img 사용
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={currentUser.profileImage} alt="프로필 사진" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-8 w-8" />
                )}
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">{currentUser?.name ?? '백조고객'}님</div>
                <div className="text-sm text-[#68776C] font-medium">
                  {currentUser ? (isPlaceholderEmail ? '이메일 미등록' : currentUser.email) : '로그인 후 맞춤 정보를 확인하세요'}
                </div>
                {providerLabel && (
                  <span className="mt-1 inline-block rounded-full bg-[#E4E8E3] px-2 py-0.5 text-[10px] font-semibold text-[#2F3B34]">
                    {providerLabel}로 연결된 계정
                  </span>
                )}
              </div>
            </div>

            <div className="bg-white rounded-sm shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-gray-900">
                나의 쇼핑
              </div>
              <ul className="divide-y divide-gray-100">
                <li><Link href="#orders" className="flex items-center gap-2 p-4 text-sm text-gray-600 hover:bg-gray-50 hover:text-[#2F3B34]"><Package className="size-4" />주문내역</Link></li>
                <li><Link href="#orders" className="flex items-center gap-2 p-4 text-sm text-gray-600 hover:bg-gray-50 hover:text-[#2F3B34]"><Truck className="size-4" />배송조회</Link></li>
                <li><Link href="/cart" className="flex items-center gap-2 p-4 text-sm text-gray-600 hover:bg-gray-50 hover:text-[#2F3B34]"><ShoppingBag className="size-4" />장바구니</Link></li>
                <li><Link href="#insurance" className="block p-4 text-sm text-gray-600 hover:bg-gray-50 hover:text-[#2F3B34]">보험 분석 내역</Link></li>
                <li><Link href="#wishlist" className="block p-4 text-sm text-gray-600 hover:bg-gray-50 hover:text-[#2F3B34]">관심 상품</Link></li>
                <li><Link href="#reviews" className="flex items-center gap-2 p-4 text-sm text-gray-600 hover:bg-gray-50 hover:text-[#2F3B34]"><Star className="size-4" />구매평 관리</Link></li>
                <li><Link href="#qna" className="flex items-center gap-2 p-4 text-sm text-gray-600 hover:bg-gray-50 hover:text-[#2F3B34]"><MessageCircle className="size-4" />상품문의 관리</Link></li>
                <li><Link href="#profile" className="flex items-center gap-2 p-4 text-sm text-gray-600 hover:bg-gray-50 hover:text-[#2F3B34]"><Settings className="size-4" />회원정보 수정</Link></li>
                {currentUser && currentUser.provider !== 'kakao' && currentUser.provider !== 'naver' && (
                  <li><Link href="#password" className="flex items-center gap-2 p-4 text-sm text-gray-600 hover:bg-gray-50 hover:text-[#2F3B34]"><Lock className="size-4" />비밀번호 변경</Link></li>
                )}
              </ul>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">

            {currentUser &&
              (!currentUser.provider || currentUser.provider === 'email') &&
              currentUser.emailVerified === false && <EmailVerifyBanner />}

            {/* Orders */}
            <section id="orders" className="bg-white p-8 rounded-sm shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-[#202521] flex items-center">
                  <Package className="mr-2 h-5 w-5 text-[#2F3B34]" /> 최근 주문 내역
                </h2>
              </div>
              
              {ordersLoading ? (
                <div className="py-10 text-center text-gray-400 bg-gray-50 rounded-sm">주문 내역을 불러오는 중…</div>
              ) : orders.length === 0 ? (
                <div className="py-10 text-center text-gray-500 bg-gray-50 rounded-sm">주문 내역이 없습니다.</div>
              ) : (
                <div className="space-y-4">
                  {orders.map(order => (
                    <div key={order.id} className="border border-gray-100 rounded-sm p-5">
                      <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-3 text-sm">
                        <span className="font-bold text-gray-900">{formatDate(order.createdAt)}</span>
                        <Link href="#" className="text-gray-500 hover:text-[#2F3B34] flex items-center">
                          상세보기 <ChevronRight className="ml-1 h-4 w-4" />
                        </Link>
                      </div>
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex gap-4 py-2">
                          <div className="h-16 w-16 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-400">이미지</div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{item.productName}</div>
                            <div className="text-sm text-gray-500 mt-1">{item.optionName ? `${item.optionName} / ` : ''}{item.quantity}개</div>
                            <div className="font-bold text-[#2F3B34] mt-1">{formatPrice(item.price * item.quantity)}</div>
                          </div>
                          <div className="flex items-center justify-center">
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#E4E8E3] text-[#2F3B34]">
                              {order.orderStatus}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Insurance Applications */}
            <section id="insurance" className="bg-white p-8 rounded-sm shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-[#202521] flex items-center">
                  <FileText className="mr-2 h-5 w-5 text-[#2F3B34]" /> 보험 분석 내역
                </h2>
              </div>
              
              {insuranceLoading ? (
                <div className="py-10 text-center text-gray-400 bg-gray-50 rounded-sm">보험 분석 내역을 불러오는 중…</div>
              ) : insuranceApps.length === 0 ? (
                <div className="py-10 text-center text-gray-500 bg-gray-50 rounded-sm">보험 분석 신청 내역이 없습니다.</div>
              ) : (
                <div className="space-y-4">
                  {insuranceApps.map(app => (
                    <div key={app.id} className="border border-gray-100 rounded-sm p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">{formatDate(app.createdAt)} 신청</div>
                        <div className="font-bold text-gray-900">{app.petName} ({app.petBreed}, {app.petAge}살)</div>
                        <div className="text-sm text-gray-600 mt-1 line-clamp-1">{app.concerns || '특별한 건강 고민 없음'}</div>
                      </div>
                      <div>
                        <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-[#E7E4DC] text-[#68776C]">
                          {app.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Wishlist */}
            <section id="wishlist" className="bg-white p-8 rounded-sm shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-[#202521] flex items-center">
                  <Heart className="mr-2 h-5 w-5 text-[#2F3B34]" /> 관심 상품
                </h2>
              </div>
              
              {productsLoading ? (
                <div className="py-10 text-center text-gray-400 bg-gray-50 rounded-sm">불러오는 중…</div>
              ) : wishlist.length === 0 ? (
                <div className="py-10 text-center text-gray-500 bg-gray-50 rounded-sm">관심 상품이 없습니다.</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {wishlist.map(product => (
                    <div key={product.id} className="border border-gray-100 rounded-sm p-3 flex flex-col">
                      <div className="aspect-square bg-gray-100 rounded-lg mb-3"></div>
                      <Link href={`/shop/${product.id}`} className="font-medium text-sm text-gray-900 hover:text-[#2F3B34] line-clamp-2">
                        {product.name}
                      </Link>
                      <div className="font-bold text-[#2F3B34] mt-2">
                        {product.price !== null && product.price !== undefined 
                          ? formatPrice(product.salePrice || product.price!)
                          : <span className="text-[#A65348] text-xs">가격 확인 필요</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section id="reviews" className="border border-gray-100 bg-white p-8 shadow-sm">
              <h2 className="flex items-center text-lg font-bold text-[#202521]">
                <Star className="mr-2 size-5 text-[#2F3B34]" /> 구매평 관리
              </h2>
              <div className="mt-6 divide-y divide-gray-100 border-t border-gray-100">
                {reviews.slice(0, 3).map((review) => (
                  <div key={review.id} className="flex items-center justify-between gap-5 py-4 text-sm">
                    <div>
                      <p className="line-clamp-1 text-gray-800">{review.content}</p>
                      <p className="mt-1 text-xs text-gray-400">{review.breed} · 별점 {review.rating}</p>
                    </div>
                    <Link href={`/shop/${review.productId}#tab-5`} className="shrink-0 text-xs font-semibold text-[#2F3B34]">보기</Link>
                  </div>
                ))}
              </div>
            </section>

            <section id="qna" className="border border-gray-100 bg-white p-8 shadow-sm">
              <h2 className="flex items-center text-lg font-bold text-[#202521]">
                <MessageCircle className="mr-2 size-5 text-[#2F3B34]" /> 상품문의 관리
              </h2>
              <div className="mt-6 divide-y divide-gray-100 border-t border-gray-100">
                {qnaItems.map((qna) => (
                  <div key={qna.id} className="flex items-center justify-between gap-5 py-4 text-sm">
                    <div>
                      <p className="text-gray-800">{qna.question}</p>
                      <p className="mt-1 text-xs text-gray-400">{qna.productName}</p>
                    </div>
                    <span className="shrink-0 border border-gray-200 px-2 py-1 text-[10px] font-semibold text-gray-600">{qna.status}</span>
                  </div>
                ))}
              </div>
            </section>

            <section id="profile" className="border border-gray-100 bg-white p-8 shadow-sm">
              <h2 className="flex items-center text-lg font-bold text-[#202521]">
                <Settings className="mr-2 size-5 text-[#2F3B34]" /> 회원정보 수정
              </h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="text-xs text-gray-500">이름<input defaultValue={currentUser?.name ?? ''} className="mt-2 w-full border border-gray-200 px-4 py-3 text-sm" /></label>
                <label className="text-xs text-gray-500">연락처<input defaultValue={currentUser?.phone ?? ''} className="mt-2 w-full border border-gray-200 px-4 py-3 text-sm" /></label>
                <label className="text-xs text-gray-500">품종<input defaultValue={currentUser?.breed ?? ''} className="mt-2 w-full border border-gray-200 px-4 py-3 text-sm" /></label>
                <label className="text-xs text-gray-500">주요 고민<input defaultValue={currentUser?.mainConcern ?? ''} className="mt-2 w-full border border-gray-200 px-4 py-3 text-sm" /></label>
              </div>
              <button type="button" className="mt-5 min-h-11 bg-[#2F3B34] px-5 text-sm font-semibold text-white">변경사항 저장</button>
            </section>

            {currentUser && currentUser.provider !== 'kakao' && currentUser.provider !== 'naver' && (
              <PasswordChangeSection />
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
