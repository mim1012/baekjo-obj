'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, getProductInquiries, answerProductInquiry, getAdminProducts, STORAGE_EVENTS } from '@/lib/storage';
import { formatDate } from '@/lib/format';
import AdminResourcePage from '@/components/admin/AdminResourcePage';
import type { User, ProductInquiry, Product } from '@/types';

/**
 * 이 화면은 레거시 QnA 뷰(question/writerName/editable)와 같은 모양으로 문의를 렌더한다.
 * ProductInquiry 자체엔 없는 필드라 선택 필드로만 확장(값 없으면 undefined, 기존 동작 그대로).
 * _tempAnswer 는 답변 textarea 임시값을 위한 로컬 전용 필드(스토리지에 저장되지 않음).
 */
type AdminInquiryRow = ProductInquiry & {
  question?: string;
  writerName?: string;
  editable?: boolean;
  _tempAnswer?: string;
};

export default function AdminInquiriesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [inquiries, setInquiries] = useState<AdminInquiryRow[]>([]);
  // 정적 @/data/products 직접 import 대신 콘센트(getAdminProducts)로 로드(§4 drift 방지, 비노출 상품 포함).
  const [products, setProducts] = useState<Product[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  const loadData = () => {
    const currentUser = getCurrentUser();
    if (!currentUser || !['admin', 'partner'].includes(currentUser.role)) {
      router.replace('/');
      return;
    }
    setUser(currentUser);
    getAdminProducts().then(setProducts);

    const allInquiries = getProductInquiries();

    // 파트너인 경우 자기 브랜드 문의만 볼 수 있음
    let filteredInquiries = allInquiries;
    if (currentUser.role === 'partner') {
      const managedBrandIds = currentUser.managedBrandIds || [];
      filteredInquiries = allInquiries.filter(i => managedBrandIds.includes(i.brandId));
    }

    // Sort by latest
    filteredInquiries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setInquiries(filteredInquiries);
  };

  useEffect(() => {
    // mount 감지 + 클라이언트 전용 스토리지 로딩(SSR-hydration 불일치 방지) — dad 동작 보존,
    // DB 전환 PR에서 마운트 판정 로직 자체를 재작업할 예정.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
    loadData();

    const handleStorageChange = () => loadData();
    window.addEventListener(STORAGE_EVENTS.INQUIRIES_CHANGED, handleStorageChange);

    return () => {
      window.removeEventListener(STORAGE_EVENTS.INQUIRIES_CHANGED, handleStorageChange);
    };
  }, [router]);

  if (!isMounted || !user) return null;

  const handleAnswerSubmit = (inquiryId: string, answer: string) => {
    if (!answer.trim()) {
      alert('답변을 입력해주세요.');
      return;
    }
    answerProductInquiry(inquiryId, answer, user.name);
    alert('답변이 등록되었습니다.');
  };

  // Convert inquiries to rows for AdminResourcePage
  const rows = inquiries.map((inq) => {
    const product = products.find(p => p.id === inq.productId);
    return {
      id: inq.id,
      brand: product?.brandName || '알 수 없음',
      productName: product?.name || '알 수 없음',
      title: inq.title || inq.question || '',
      writer: inq.userId || inq.writerName || 'Unknown',
      date: formatDate(inq.createdAt),
      status: inq.status === 'answered' ? '답변완료' : '답변대기',
    };
  });

  return (
    <div className="p-6">
      <AdminResourcePage
        title="상품문의 관리"
        description="입점업체 및 관리자가 고객의 상품문의를 확인하고 답변합니다."
        actionLabel=""
        searchPlaceholder="문의 내역 검색..."
        filters={['전체 상태', '답변대기', '답변완료']}
        columns={[
          { key: 'brand', label: '브랜드' },
          { key: 'productName', label: '상품명' },
          { key: 'title', label: '제목' },
          { key: 'writer', label: '작성자' },
          { key: 'date', label: '작성일' },
          { key: 'status', label: '상태' },
        ]}
        rows={rows}
        renderExpandedRow={(row) => {
          const inq = inquiries.find(i => i.id === row.id);
          if (!inq) return null;

          return (
            <div className="flex flex-col gap-6 rounded-lg bg-gray-50 p-6">
              {/* Question */}
              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#18231F] text-sm font-bold text-white">
                  Q
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-[#18231F]">{inq.title || inq.question}</h4>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#68716C]">{inq.content || inq.question}</p>
                </div>
              </div>

              <div className="h-px bg-gray-200" />

              {/* Answer Form */}
              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#B99562] text-sm font-bold text-white">
                  A
                </div>
                <div className="flex-1">
                  {inq.status === 'answered' ? (
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <span className="font-semibold text-[#18231F]">{inq.answeredBy || '백조오브제'}</span>
                        <span className="text-xs text-gray-500">{formatDate(inq.answeredAt || inq.createdAt)}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#68716C]">{inq.answer}</p>
                      {inq.editable !== false && (
                        <button
                          onClick={() => {
                            const newAnswer = prompt('답변을 수정하시겠습니까?', inq.answer);
                            if (newAnswer !== null && newAnswer.trim() !== '') {
                              handleAnswerSubmit(inq.id, newAnswer);
                            }
                          }}
                          className="mt-4 rounded border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                        >
                          답변 수정하기
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <textarea
                        defaultValue={inq.answer || ''}
                        onChange={(e) => inq._tempAnswer = e.target.value}
                        placeholder="고객의 문의에 친절하게 답변해주세요."
                        rows={4}
                        className="w-full resize-none rounded border border-gray-300 p-3 text-sm focus:border-[#18231F] focus:outline-none"
                      />
                      <button
                        onClick={() => handleAnswerSubmit(inq.id, inq._tempAnswer || '')}
                        className="self-end rounded bg-[#18231F] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                      >
                        답변 등록하기
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}
