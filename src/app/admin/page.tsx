'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package, ShoppingCart, FileText, ChevronRight, BadgeCheck, PanelsTopLeft, Home } from 'lucide-react';
import { 
  getAdminDashboardSummary, 
  getAdminProducts,
} from '@/lib/storage';
import type { AdminDashboardSummary, Product } from '@/types';
import PageHeader from '@/components/admin-new/common/PageHeader';
import SummaryStrip from '@/components/admin-new/common/SummaryStrip';
import LoadingState from '@/components/admin-new/common/LoadingState';
import ErrorState from '@/components/admin-new/common/ErrorState';
import { formatPrice } from '@/lib/format';
import { useMounted } from '@/lib/useMounted';

interface ProductStats {
  total: number;
  visible: number;
  recommended: number;
  best: number;
  outOfStock: number;
  missingPrice: number;
  missingImage: number;
  missingDetail: number;
  recentMissing: Product[];
}

export default function AdminDashboard() {
  const mounted = useMounted();
  const router = useRouter();
  
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [productStats, setProductStats] = useState<ProductStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, products] = await Promise.all([
        getAdminDashboardSummary(),
        getAdminProducts()
      ]);

      if (!summaryRes.ok) {
        throw new Error(summaryRes.message || '데이터를 불러오지 못했습니다.');
      }

      setSummary(summaryRes.data);

      // 상품 통계 계산
      let outOfStock = 0;
      let missingPrice = 0;
      let missingImage = 0;
      let missingDetail = 0;
      let visible = 0;
      let recommended = 0;
      let best = 0;
      
      const recentMissing: Product[] = [];

      products.forEach(p => {
        let isMissingInfo = false;

        if (p.isVisible) visible++;
        if (p.isRecommended) recommended++;
        if (p.isBest) best++;
        
        if (p.stock <= 0) {
          outOfStock++;
          isMissingInfo = true;
        }
        
        // 가격이 없거나 0 이하
        if (p.price === null || p.price === undefined || p.price <= 0) {
          missingPrice++;
          isMissingInfo = true;
        }
        
        // 대표 이미지 없음
        if (!p.image || p.image.trim() === '') {
          missingImage++;
          isMissingInfo = true;
        }

        // 상세페이지 미작성 (detailBlocks 가 비어있고 description도 비어있으면)
        const hasDetailBlocks = p.detailBlocks && p.detailBlocks.length > 0;
        const hasDescription = p.description && p.description.trim() !== '';
        if (!hasDetailBlocks && !hasDescription) {
          missingDetail++;
          isMissingInfo = true;
        }

        // 최근 누락 상품 (상위 5개 수집)
        if (isMissingInfo && recentMissing.length < 5) {
          recentMissing.push(p);
        }
      });

      setProductStats({
        total: products.length,
        visible,
        recommended,
        best,
        outOfStock,
        missingPrice,
        missingImage,
        missingDetail,
        recentMissing
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : '네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, []);

  if (!mounted || loading) {
    return <LoadingState message="대시보드 데이터를 불러오는 중입니다..." />;
  }

  if (error || !summary || !productStats) {
    return <ErrorState message={error || '데이터를 불러오지 못했습니다.'} onRetry={fetchData} />;
  }

  const navigateToProducts = (params: Record<string, string>) => {
    const search = new URLSearchParams(params).toString();
    router.push(`/admin/products?${search}`);
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      pending: '대기',
      reviewing: '검토 중',
      active: '완료',
      rejected: '반려'
    };
    return map[status] || status;
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="대시보드" 
        description="홈페이지 수정은 전체 화면 관리에서 시작하고, 아래에서는 오늘 처리할 주문·상품·회원 업무를 확인합니다."
      />

      <section className="grid gap-px border border-[#D8C4A3] bg-[#D8C4A3] md:grid-cols-[1.25fr_0.75fr]">
        <div className="bg-[#17211D] p-6 text-white sm:p-8">
          <p className="text-xs font-bold tracking-[0.16em] text-[#D8C4A3]">홈페이지를 바꾸려면</p>
          <h2 className="mt-3 text-2xl font-bold">고객 화면 이름부터 찾으세요.</h2>
          <p className="mt-3 max-w-2xl break-keep text-sm leading-6 text-white/75">
            전체 화면 관리에는 보험을 제외한 실제 고객 화면과 각 화면의 등록·수정·삭제 위치가 연결되어 있습니다.
          </p>
          <Link href="/admin/pages" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded bg-white px-5 text-sm font-bold text-[#17211D] hover:bg-[#F3EEE6]">
            <PanelsTopLeft className="size-4" /> 전체 화면 관리 열기
          </Link>
        </div>
        <div className="flex flex-col justify-center bg-[#FAF8F3] p-6 sm:p-8">
          <p className="text-xs font-bold text-[#6F766F]">홈 첫 화면만 바로 수정</p>
          <p className="mt-2 break-keep text-sm leading-6 text-[#59615B]">대표 배너·바로가기·추천 영역을 편집하고 게시합니다.</p>
          <Link href="/admin/settings" className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 border border-[#D8D6CE] bg-white px-4 text-sm font-bold text-[#17211D] hover:border-[#A8742E]">
            <Home className="size-4" /> 홈 화면 편집
          </Link>
        </div>
      </section>

      {/* 상단 Summary Strip */}
      <SummaryStrip 
        items={[
          { label: '전체 상품', value: productStats.total, onClick: () => navigateToProducts({}) },
          { label: '노출 상품', value: productStats.visible, onClick: () => navigateToProducts({ isVisible: 'true' }) },
          { label: '추천 상품', value: productStats.recommended, onClick: () => navigateToProducts({ isRecommended: 'true' }) },
          { label: '베스트 상품', value: productStats.best, onClick: () => navigateToProducts({ isBest: 'true' }) },
          { label: '품절', value: productStats.outOfStock, highlight: productStats.outOfStock > 0, onClick: () => navigateToProducts({ missing: 'stock' }) },
          { label: '가격 미등록', value: productStats.missingPrice, highlight: productStats.missingPrice > 0, onClick: () => navigateToProducts({ missing: 'price' }) },
          { label: '이미지 미등록', value: productStats.missingImage, highlight: productStats.missingImage > 0, onClick: () => navigateToProducts({ missing: 'image' }) },
          { label: '상세 미작성', value: productStats.missingDetail, highlight: productStats.missingDetail > 0, onClick: () => navigateToProducts({ missing: 'detail' }) },
        ]}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* 정보 누락 / 품절 상품 (운영 처리 영역) */}
        <div className="bg-white border border-gray-200 rounded-md overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center bg-[#F7F8F6]">
            <h3 className="text-[15px] font-semibold text-[#17201B] flex items-center gap-2">
              <Package size={18} className="text-[#A65348]" />
              조치 필요 상품 (최근 등록)
            </h3>
            <Link 
              href="/admin/products?missing=any" 
              className="text-[13px] text-gray-500 hover:text-[#17201B] flex items-center"
            >
              전체보기 <ChevronRight size={14} />
            </Link>
          </div>
          <div className="p-0 flex-1">
            {productStats.recentMissing.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-gray-500 text-[13px]">
                <BadgeCheck className="w-8 h-8 text-[#2F7A4F] mb-2 opacity-50" />
                조치가 필요한 상품이 없습니다.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {productStats.recentMissing.map(p => {
                  const issues = [];
                  if (p.stock <= 0) issues.push('품절');
                  if (!p.price || p.price <= 0) issues.push('가격 미등록');
                  if (!p.image) issues.push('이미지 미등록');
                  
                  const hasDetailBlocks = p.detailBlocks && p.detailBlocks.length > 0;
                  const hasDescription = p.description && p.description.trim() !== '';
                  if (!hasDetailBlocks && !hasDescription) issues.push('상세 미작성');

                  return (
                    <li key={p.id} className="p-4 hover:bg-gray-50 flex items-start gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded border border-gray-200 shrink-0 bg-cover bg-center" style={{ backgroundImage: p.image ? `url(${p.image})` : 'none' }}>
                        {!p.image && <div className="w-full h-full flex items-center justify-center text-gray-300 text-[10px]">No Img</div>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link href={`/admin/products/${p.id}`} className="text-[14px] font-medium text-[#17201B] hover:underline truncate block">
                          {p.name}
                        </Link>
                        <p className="text-[12px] text-gray-500 mt-1 truncate">{p.categoryName || p.category}</p>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        {issues.map((issue, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-[#FDF2F2] text-[#A65348] border border-[#F8D7D7] rounded-full text-[11px] font-medium">
                            {issue}
                          </span>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* 최근 주문 */}
        <div className="bg-white border border-gray-200 rounded-md overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center bg-[#F7F8F6]">
            <h3 className="text-[15px] font-semibold text-[#17201B] flex items-center gap-2">
              <ShoppingCart size={18} className="text-[#2F3B34]" />
              최근 주문
            </h3>
            <Link 
              href="/admin/orders" 
              className="text-[13px] text-gray-500 hover:text-[#17201B] flex items-center"
            >
              전체보기 <ChevronRight size={14} />
            </Link>
          </div>
          <div className="p-0 flex-1">
            {summary.recentOrders.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-gray-500 text-[13px]">
                최근 주문 내역이 없습니다.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {summary.recentOrders.slice(0, 5).map(order => (
                  <li key={order.id} className="p-4 hover:bg-gray-50 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-[#17201B] truncate">{order.customerName}</p>
                      <p className="text-[12px] text-gray-500 truncate mt-0.5">{order.orderNumber}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[14px] font-bold text-[#17201B]">{formatPrice(order.totalAmount)}</p>
                      <p className={`text-[12px] mt-0.5 ${order.status.includes('완료') ? 'text-green-600' : 'text-orange-500'}`}>
                        {order.status}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* 제휴/회원가입 승인 (옵션) */}
        <div className="bg-white border border-gray-200 rounded-md overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center bg-[#F7F8F6]">
            <h3 className="text-[15px] font-semibold text-[#17201B] flex items-center gap-2">
              <FileText size={18} className="text-[#2F3B34]" />
              가입 승인 대기
            </h3>
            <Link 
              href="/admin/members" 
              className="text-[13px] text-gray-500 hover:text-[#17201B] flex items-center"
            >
              전체보기 <ChevronRight size={14} />
            </Link>
          </div>
          <div className="p-0 flex-1">
            {summary.recentApplications.filter(a => a.status === 'pending' || a.status === 'reviewing').length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-gray-500 text-[13px]">
                승인 대기 중인 회원이 없습니다.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {summary.recentApplications
                  .filter(a => a.status === 'pending' || a.status === 'reviewing')
                  .slice(0, 5)
                  .map(app => (
                  <li key={app.id} className="p-4 hover:bg-gray-50 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-[#17201B] truncate">{app.companyName || app.name}</p>
                      <p className="text-[12px] text-gray-500 truncate mt-0.5">
                        {app.role === 'partner' ? '입점업체' : app.role === 'insurance' ? '보험사' : 'B2B 회원'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[12px] text-orange-600 font-medium">{getStatusLabel(app.status)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
