'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MessageSquare, MessageCircle, AlertCircle, EyeOff } from 'lucide-react';
import { getQnaConfig, saveQnaConfig } from '@/lib/storage';
import { useMounted } from '@/lib/useMounted';
import PageHeader from '@/components/admin-new/common/PageHeader';
import SummaryStrip from '@/components/admin-new/common/SummaryStrip';
import Pagination from '@/components/admin-new/common/Pagination';
import LoadingState from '@/components/admin-new/common/LoadingState';
import ErrorState from '@/components/admin-new/common/ErrorState';
import QnaFilters from './QnaFilters';
import QnaDataTable from './QnaDataTable';
import QnaMobileCard from './QnaMobileCard';
import QnaDetailPanel from './QnaDetailPanel';
import type { QnA } from '@/types';
// QnaConfig 는 이 레포에서 @/types 가 아니라 콘센트 옆(@/lib/qna/config)에 산다 — storage.ts 와 동일 출처.
import type { QnaConfig } from '@/lib/qna/config';

export default function QnaListPage() {
  const mounted = useMounted();
  const [items, setItems] = useState<QnA[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('전체');
  const [visibilityFilter, setVisibilityFilter] = useState('전체');

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadQna = useCallback(async () => {
    try {
      setLoading(true);
      const config = await getQnaConfig();
      setItems(config.items || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      loadQna();
    });
  }, [loadQna]);

  const handleSave = async (updatedItem: QnA) => {
    const updatedItems = items.map((i) => (i.id === updatedItem.id ? updatedItem : i));
    setItems(updatedItems); // Optimistic UI
    
    const config: QnaConfig = { items: updatedItems };
    const result = await saveQnaConfig(config);
    
    if (!result.ok) {
      // Revert if failed
      setItems(items);
      alert('저장에 실패했습니다.');
    }
  };

  const filteredItems = useMemo(() => {
    let result = [...items].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (a) =>
          a.writerName.toLowerCase().includes(term) ||
          a.productName.toLowerCase().includes(term) ||
          a.question.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== '전체') {
      result = result.filter((a) => a.status === statusFilter);
    }
    
    if (visibilityFilter !== '전체') {
      if (visibilityFilter === 'public') {
        result = result.filter((a) => !a.isSecret && a.isVisible !== false);
      } else if (visibilityFilter === 'secret') {
        result = result.filter((a) => a.isSecret && a.isVisible !== false);
      } else if (visibilityFilter === 'hidden') {
        result = result.filter((a) => a.isVisible === false);
      }
    }

    return result;
  }, [items, searchTerm, statusFilter, visibilityFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  const paginatedItems = useMemo(() => {
    return filteredItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [filteredItems, currentPage, ITEMS_PER_PAGE]);

  // Handle page reset on filter change
  useEffect(() => {
    queueMicrotask(() => {
      setCurrentPage(1);
    });
  }, [searchTerm, statusFilter, visibilityFilter]);

  if (!mounted) return null;

  if (loading && items.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="상품 및 일반 문의 관리" description="고객들의 문의 내역을 확인하고 답변합니다." />
        <LoadingState message="문의 내역을 불러오는 중입니다..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="상품 및 일반 문의 관리" description="고객들의 문의 내역을 확인하고 답변합니다." />
        <ErrorState
          title="데이터를 불러오지 못했습니다"
          message={error.message || '알 수 없는 오류가 발생했습니다.'}
          onRetry={loadQna}
        />
      </div>
    );
  }

  const totalCount = items.length;
  const pendingCount = items.filter((a) => a.status === '답변대기').length;
  const hiddenCount = items.filter((a) => a.isVisible === false).length;

  const selectedItem = selectedId ? items.find((i) => i.id === selectedId) || null : null;

  return (
    <div className="flex h-[calc(100vh-6rem)] overflow-hidden -m-4 sm:-m-6 lg:-m-8">
      {/* Left List Area */}
      <div className={`flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 ${selectedItem ? 'hidden lg:block lg:w-2/3' : 'w-full'}`}>
        <PageHeader 
          title="상품 및 일반 문의 관리" 
          description="고객들의 상품 문의와 일반 문의 내역을 확인하고 답변합니다." 
        />

        <SummaryStrip
          items={[
            { label: '전체 문의', value: totalCount, icon: MessageSquare },
            { label: '답변 대기', value: pendingCount, icon: AlertCircle, highlight: pendingCount > 0 },
            { label: '답변 완료', value: totalCount - pendingCount, icon: MessageCircle },
            { label: '숨김 처리', value: hiddenCount, icon: EyeOff },
          ]}
        />

        <div className="space-y-4">
          <QnaFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            visibilityFilter={visibilityFilter}
            onVisibilityFilterChange={setVisibilityFilter}
          />

          {/* PC Table View */}
          <div className="hidden md:block">
            <QnaDataTable 
              items={paginatedItems} 
              isLoading={loading} 
              selectedId={selectedId || undefined}
              onSelect={setSelectedId}
            />
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {paginatedItems.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-md p-8 text-center text-gray-500 text-[14px]">
                검색 결과가 없습니다.
              </div>
            ) : (
              paginatedItems.map((item) => (
                <QnaMobileCard 
                  key={item.id} 
                  item={item} 
                  selectedId={selectedId || undefined}
                  onSelect={setSelectedId}
                />
              ))
            )}
          </div>

          {filteredItems.length > 0 && (
            <div className="pt-4 pb-8">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </div>

      {/* Right Detail Panel */}
      {selectedItem && (
        <div className="w-full lg:w-1/3 min-w-[320px] max-w-md h-full flex-shrink-0 z-20">
          <QnaDetailPanel 
            item={selectedItem} 
            onClose={() => setSelectedId(null)} 
            onSave={handleSave} 
          />
        </div>
      )}
    </div>
  );
}
