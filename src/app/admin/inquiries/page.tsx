'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSessionUser, getAdminInquiries, answerProductInquiry, deleteAdminProductInquiry, getAdminProducts, getPublicProducts, STORAGE_EVENTS } from '@/lib/storage';
import { formatDate } from '@/lib/format';
import AdminResourcePage from '@/components/admin/AdminResourcePage';
import type { User, ProductInquiry, Product } from '@/types';
import { formatBrandDisplayName } from '@/lib/brands/presentation';

export default function AdminInquiriesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [inquiries, setInquiries] = useState<ProductInquiry[]>([]);
  // 정적 @/data/products 직접 import 대신 콘센트(getAdminProducts)로 로드(§4 drift 방지, 비노출 상품 포함).
  const [products, setProducts] = useState<Product[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [editingAnswerId, setEditingAnswerId] = useState<string | null>(null);
  const [answerSavingId, setAnswerSavingId] = useState<string | null>(null);

  // loadData 는 mount·STORAGE_EVENTS 리스너에서 독립적으로 재호출된다(단일 useEffect cleanup으로는
  // 못 잡는 범위) — 마지막 호출 번호만 신뢰해 먼저 시작했지만 늦게 응답한 요청이 최신 상태를
  // 덮어쓰지 않게 한다(last-response-wins 레이스 방지).
  const loadSeqRef = useRef(0);

  const loadData = useCallback(async () => {
    const currentUser = await getSessionUser();
    if (!currentUser || !['admin', 'partner'].includes(currentUser.role)) {
      router.replace('/');
      return;
    }
    setUser(currentUser);

    const seq = ++loadSeqRef.current;
    // /api/admin/products 는 requireAdmin() 전용 — partner 세션은 403(빈 배열)으로 조용히 깨진다.
    // TODO(RBAC): partner는 자기 브랜드 상품 전용 인가 엔드포인트로 교체(현 단계 partner 계정 미운영 — 최소 안전 폴백).
    const productsPromise = currentUser.role === 'admin' ? getAdminProducts() : getPublicProducts();
    productsPromise.then((products) => {
      if (loadSeqRef.current === seq) setProducts(products);
    });

    // 브랜드 스코프 필터링은 서버(/api/admin/inquiries)가 처리한다(§4 drift 방지) —
    // admin은 전체, partner는 TODO(RBAC) 반영 전까지 안전 폴백(빈 배열)을 받는다.
    getAdminInquiries().then((allInquiries) => {
      if (loadSeqRef.current !== seq) return;
      const sorted = [...allInquiries].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setInquiries(sorted);
    });
  }, [router]);

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
  }, [loadData]);

  if (!isMounted || !user) return null;

  const handleAnswerSubmit = async (inquiryId: string, answer: string) => {
    if (!answer.trim()) {
      alert('답변을 입력해주세요.');
      return false;
    }
    setAnswerSavingId(inquiryId);
    try {
      await answerProductInquiry(inquiryId, answer);
      setInquiries((current) => current.map((inquiry) => (
        inquiry.id === inquiryId
          ? { ...inquiry, answer: answer.trim(), status: 'answered', answeredAt: new Date().toISOString() }
          : inquiry
      )));
      setAnswerDrafts((current) => ({ ...current, [inquiryId]: answer.trim() }));
      setEditingAnswerId(null);
      alert('답변이 등록되었습니다.');
      return true;
    } catch (e) {
      alert(e instanceof Error ? e.message : '답변 등록에 실패했습니다.');
      return false;
    } finally {
      setAnswerSavingId(null);
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await deleteAdminProductInquiry(String(id));
      setInquiries((current) => current.filter((inquiry) => inquiry.id !== String(id)));
      return true;
    } catch {
      alert('문의 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      return false;
    }
  };

  // Convert inquiries to rows for AdminResourcePage
  const rows = inquiries.map((inq) => {
    const product = products.find(p => p.id === inq.productId);
    return {
      id: inq.id,
      brand: product?.brandName ? formatBrandDisplayName(product.brandName) : '알 수 없음',
      productName: product?.name || '알 수 없음',
      title: inq.title,
      writer: inq.userId,
      date: formatDate(inq.createdAt),
      status: inq.status === 'answered' ? '답변완료' : '답변대기',
    };
  });

  return (
    <div className="p-6">
      <AdminResourcePage
        title="상품문의 관리"
        description="고객이 상품상세에서 등록한 문의가 이곳에 모입니다. 답변 등록·수정·삭제는 저장 즉시 고객 화면에 반영됩니다."
        actionLabel=""
        affectedScreen="상품상세(/shop/상품번호)의 문의 탭과 고객 마이페이지"
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
        onDeleteRow={handleDelete}
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
                  <h4 className="font-semibold text-[#18231F]">{inq.title}</h4>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#68716C]">{inq.content}</p>
                </div>
              </div>

              <div className="h-px bg-gray-200" />

              {/* Answer Form */}
              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#B99562] text-sm font-bold text-white">
                  A
                </div>
                <div className="flex-1">
                  {inq.status === 'answered' && editingAnswerId !== inq.id ? (
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <span className="font-semibold text-[#18231F]">{inq.answeredBy || '백조오브제'}</span>
                        <span className="text-xs text-gray-500">{formatDate(inq.answeredAt || inq.createdAt)}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#68716C]">{inq.answer}</p>
                      <button
                        onClick={() => {
                          setAnswerDrafts((current) => ({ ...current, [inq.id]: inq.answer ?? '' }));
                          setEditingAnswerId(inq.id);
                        }}
                        className="mt-4 min-h-11 rounded border border-gray-300 px-4 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                      >
                        답변 수정하기
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <p className="text-xs font-semibold text-[#59615B]">
                        {inq.status === 'answered' ? '수정할 답변' : '등록할 답변'}
                      </p>
                      <textarea
                        aria-label={`${inq.title || '상품문의'} 답변`}
                        value={answerDrafts[inq.id] ?? inq.answer ?? ''}
                        onChange={(event) => setAnswerDrafts((current) => ({ ...current, [inq.id]: event.target.value }))}
                        placeholder="고객의 문의에 친절하게 답변해주세요."
                        rows={4}
                        className="w-full resize-none rounded border border-gray-300 p-3 text-sm focus:border-[#18231F] focus:outline-none"
                      />
                      <p className="text-xs text-[#7B827C]">저장하면 고객의 상품문의 내역에 바로 표시됩니다.</p>
                      <div className="flex justify-end gap-2">
                        {inq.status === 'answered' && (
                          <button
                            type="button"
                            onClick={() => setEditingAnswerId(null)}
                            className="min-h-11 rounded border border-gray-300 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                          >
                            취소
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={answerSavingId === inq.id}
                          onClick={() => handleAnswerSubmit(inq.id, answerDrafts[inq.id] ?? inq.answer ?? '')}
                          className="min-h-11 rounded bg-[#18231F] px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                        >
                          {answerSavingId === inq.id ? '저장 중…' : inq.status === 'answered' ? '수정 답변 저장' : '답변 등록하고 고객에게 반영'}
                        </button>
                      </div>
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
