'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ProductInquiry, Product } from '@/types';
import { formatDate } from '@/lib/format';
import Pagination from './Pagination';
import EmptyState from '@/components/common/EmptyState';
import { MessageCircle, Edit2, Trash2, Lock } from 'lucide-react';

interface InquiriesSectionProps {
  inquiries: ProductInquiry[];
  products: Product[];
  onWriteInquiry: () => void;
  onEditInquiry: (inquiry: ProductInquiry, product: Product) => void;
  onDeleteInquiry: (inquiryId: string) => void;
}

const ITEMS_PER_PAGE = 20;

export default function InquiriesSection({
  inquiries,
  products,
  onWriteInquiry,
  onEditInquiry,
  onDeleteInquiry,
}: InquiriesSectionProps) {
  const [subTab, setSubTab] = useState<'all' | 'waiting' | 'answered'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 작성한 문의 정렬
  const sortedInquiries = [...inquiries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const filteredInquiries = sortedInquiries.filter((inquiry) => {
    if (subTab === 'waiting') return inquiry.status === 'waiting';
    if (subTab === 'answered') return inquiry.status === 'answered';
    return true;
  });

  const totalItems = filteredInquiries.length;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = filteredInquiries.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleSubTabChange = (tab: 'all' | 'waiting' | 'answered') => {
    setSubTab(tab);
    setCurrentPage(1);
    setExpandedId(null);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <section>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#18231F]">상품문의 관리</h2>
        </div>
        <button onClick={onWriteInquiry} className="mp-btn-primary">
          문의 작성하기
        </button>
      </div>

      <div className="mb-6 flex rounded-lg border border-[#DED8CC] bg-[#F8F6F0] p-1">
        <button
          onClick={() => handleSubTabChange('all')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
            subTab === 'all'
              ? 'bg-white text-[#18231F] shadow-sm'
              : 'text-[#68716C] hover:text-[#18231F]'
          }`}
        >
          전체 ({sortedInquiries.length})
        </button>
        <button
          onClick={() => handleSubTabChange('waiting')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
            subTab === 'waiting'
              ? 'bg-white text-[#18231F] shadow-sm'
              : 'text-[#68716C] hover:text-[#18231F]'
          }`}
        >
          답변 대기 ({sortedInquiries.filter(i => i.status === 'waiting').length})
        </button>
        <button
          onClick={() => handleSubTabChange('answered')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
            subTab === 'answered'
              ? 'bg-white text-[#18231F] shadow-sm'
              : 'text-[#68716C] hover:text-[#18231F]'
          }`}
        >
          답변 완료 ({sortedInquiries.filter(i => i.status === 'answered').length})
        </button>
      </div>

      {totalItems === 0 ? (
        <EmptyState
          icon={<MessageCircle className="h-8 w-8 text-[#68716C]" />}
          title="등록한 상품문의가 없어요."
          description="상품에 대해 궁금한 점이 있다면 언제든 문의해주세요."
          actionLabel="문의 작성하기"
          actionHref="#"
        />
      ) : (
        <div className="flex flex-col gap-4">
          {paginatedItems.map((inquiry) => {
            const product = products.find((p) => p.id === inquiry.productId);
            const canOpenProduct = Boolean(product && product.isVisible !== false);
            const isExpanded = expandedId === inquiry.id;

            return (
              <div key={inquiry.id} className="mypage-card flex flex-col p-0 overflow-hidden">
                <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-4">
                    {canOpenProduct ? (
                      <Link href={`/shop/${inquiry.productId}`} className="shrink-0">
                        <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-[#EBE6DC] bg-white">
                          {product?.image && (
                            <Image src={product.image} alt={product.name} fill className="object-cover" />
                          )}
                        </div>
                      </Link>
                    ) : (
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[#EBE6DC] bg-white">
                        {product?.image && (
                          <Image src={product.image} alt={product.name} fill className="object-cover" />
                        )}
                      </div>
                    )}
                    <div className="flex flex-col justify-center">
                      <div className="mb-1 flex items-center gap-2">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            inquiry.status === 'answered'
                              ? 'bg-[#18231F] text-white'
                              : 'bg-[#F2EEE5] text-[#68716C]'
                          }`}
                        >
                          {inquiry.status === 'answered' ? '답변완료' : '답변대기'}
                        </span>
                        <span className="font-editorial text-xs text-[#68716C]">{formatDate(inquiry.createdAt)}</span>
                      </div>
                      {canOpenProduct ? (
                        <Link href={`/shop/${inquiry.productId}`} className="text-sm font-semibold text-[#18231F] line-clamp-1 hover:underline">
                          {product?.name || '알 수 없는 상품'}
                        </Link>
                      ) : (
                        <span className="text-sm font-semibold text-[#18231F] line-clamp-1">{product?.name || '알 수 없는 상품'}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                    {inquiry.status === 'waiting' && product && (
                      <button
                        onClick={() => onEditInquiry(inquiry, product)}
                        className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[#68716C] transition-colors hover:bg-gray-100"
                      >
                        <Edit2 className="h-3 w-3" />
                        수정
                      </button>
                    )}
                    <button
                      onClick={() => onDeleteInquiry(inquiry.id)}
                      className="flex items-center gap-1 rounded px-2 py-1 text-xs text-red-500 transition-colors hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" />
                      삭제
                    </button>
                  </div>
                </div>

                <div 
                  className={`border-t border-[#EBE6DC] px-6 py-4 cursor-pointer transition-colors hover:bg-[#FBF9F4] ${isExpanded ? 'bg-[#FBF9F4]' : ''}`}
                  onClick={() => toggleExpand(inquiry.id)}
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 font-editorial text-sm font-bold text-[#B99562]">Q</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {inquiry.isSecret && <Lock className="h-3.5 w-3.5 text-[#68716C]" />}
                        <h4 className="text-sm font-semibold text-[#18231F]">{inquiry.title}</h4>
                      </div>
                      <p className={`mt-2 text-sm leading-relaxed text-[#68716C] ${isExpanded ? '' : 'line-clamp-2'}`}>
                        {inquiry.content}
                      </p>
                    </div>
                  </div>
                </div>

                {isExpanded && inquiry.status === 'answered' && inquiry.answer && (
                  <div className="bg-[#F2EEE5] px-6 py-5">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 font-editorial text-sm font-bold text-[#18231F]">A</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-[#18231F]">백조오브제</h4>
                          <span className="font-editorial text-xs text-[#68716C]">{formatDate(inquiry.answeredAt || inquiry.updatedAt)}</span>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#18231F]">
                          {inquiry.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Pagination
        currentPage={currentPage}
        totalItems={totalItems}
        itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={setCurrentPage}
      />
    </section>
  );
}
