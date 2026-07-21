'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Star, EyeOff, MessageSquare } from 'lucide-react';
import {
  getAdminProductReviews,
  setAdminReviewStatus,
  deleteAdminReview,
} from '@/lib/storage';
import { formatDate } from '@/lib/format';
import PageHeader from '@/components/admin-new/common/PageHeader';
import SummaryStrip from '@/components/admin-new/common/SummaryStrip';
import LoadingState from '@/components/admin-new/common/LoadingState';
import ErrorState from '@/components/admin-new/common/ErrorState';
import Badge from '@/components/admin-new/common/Badge';
import ConfirmDialog from '@/components/admin-new/common/ConfirmDialog';
import type { AdminProductReview } from '@/types';

type PendingAction = { type: 'hide' | 'show' | 'delete'; id: string } | null;

/**
 * 구매평(product_reviews) moderation — 전시 후기(ShowcaseReviewsTab)와 별개 도메인.
 * 실제 구매 회원이 작성한 리뷰를 노출/숨김 전환하거나 악성 후기를 삭제한다.
 * 별점 집계(products.rating/review_count)는 DB 트리거(0070)가 자동 갱신하므로 이 화면은
 * status 전환·삭제만 다루고 별점 재계산 UI는 없다.
 */
export default function PurchaseReviewsPanel() {
  const [items, setItems] = useState<AdminProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pending, setPending] = useState<PendingAction>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const reviews = await getAdminProductReviews();
      setItems(reviews);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    load();
  }, [load]);

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(
      (review) =>
        review.productName.toLowerCase().includes(term) ||
        review.content.toLowerCase().includes(term) ||
        (review.title ?? '').toLowerCase().includes(term),
    );
  }, [items, searchTerm]);

  const totalCount = items.length;
  const publishedCount = items.filter((r) => r.status === 'published').length;
  const hiddenCount = items.filter((r) => r.status === 'hidden').length;

  const requestToggle = (review: AdminProductReview) => {
    setPending({ type: review.status === 'published' ? 'hide' : 'show', id: review.id });
  };

  const requestDelete = (review: AdminProductReview) => {
    setPending({ type: 'delete', id: review.id });
  };

  const handleConfirm = async () => {
    if (!pending || busy) return;
    setBusy(true);
    try {
      if (pending.type === 'delete') {
        const { ok } = await deleteAdminReview(pending.id);
        if (ok) {
          setItems((prev) => prev.filter((r) => r.id !== pending.id));
        } else {
          window.alert('삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.');
        }
      } else {
        const nextStatus = pending.type === 'hide' ? 'hidden' : 'published';
        const { ok } = await setAdminReviewStatus(pending.id, nextStatus);
        if (ok) {
          setItems((prev) =>
            prev.map((r) => (r.id === pending.id ? { ...r, status: nextStatus } : r)),
          );
        } else {
          window.alert('상태 변경에 실패했습니다. 잠시 후 다시 시도해 주세요.');
        }
      }
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  if (loading && items.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="구매평 관리" description="회원이 작성한 실제 구매평을 노출/숨김 전환하거나 삭제합니다." />
        <LoadingState message="구매평을 불러오는 중입니다..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="구매평 관리" description="회원이 작성한 실제 구매평을 노출/숨김 전환하거나 삭제합니다." />
        <ErrorState
          title="데이터를 불러오지 못했습니다"
          message={error.message || '알 수 없는 오류가 발생했습니다.'}
          onRetry={handleRetry}
        />
      </div>
    );
  }

  const pendingReview = pending ? items.find((r) => r.id === pending.id) : null;

  return (
    <div className="space-y-6">
      <PageHeader title="구매평 관리" description="회원이 작성한 실제 구매평을 노출/숨김 전환하거나 삭제합니다. 별점·리뷰수는 노출(published) 구매평만 자동 집계됩니다." />

      <SummaryStrip
        items={[
          { label: '전체 구매평', value: totalCount, icon: MessageSquare },
          { label: '노출중', value: publishedCount, icon: Star },
          { label: '숨김 처리', value: hiddenCount, icon: EyeOff, highlight: hiddenCount > 0 },
        ]}
      />

      <div className="bg-white border border-gray-200 rounded-md p-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="상품명, 작성 내용 검색"
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2F3B34]/20"
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-md overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
              <th className="px-4 py-3 font-medium">상품</th>
              <th className="px-4 py-3 font-medium">별점</th>
              <th className="px-4 py-3 font-medium">내용</th>
              <th className="px-4 py-3 font-medium">상태</th>
              <th className="px-4 py-3 font-medium">작성일</th>
              <th className="px-4 py-3 font-medium text-right">관리</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  구매평이 없습니다.
                </td>
              </tr>
            ) : (
              filteredItems.map((review) => (
                <tr key={review.id} className="border-b border-gray-100 last:border-0 align-top">
                  <td className="px-4 py-3 font-medium text-[#17201B]">{review.productName}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      <Star size={14} className="fill-amber-400 text-amber-400" />
                      {review.rating}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-sm">
                    {review.title && <div className="font-medium text-[#17201B] mb-0.5">{review.title}</div>}
                    <div className="text-gray-600 line-clamp-2">{review.content}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      label={review.status === 'published' ? '노출중' : '숨김'}
                      variant={review.status === 'published' ? 'success' : 'warning'}
                    />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500">{formatDate(review.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => requestToggle(review)}
                        className="px-2.5 py-1 text-[12px] font-medium border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                      >
                        {review.status === 'published' ? '숨기기' : '노출하기'}
                      </button>
                      <button
                        type="button"
                        onClick={() => requestDelete(review)}
                        className="px-2.5 py-1 text-[12px] font-medium border border-red-200 rounded-md text-[#A65348] hover:bg-red-50"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        isOpen={pending !== null}
        title={
          pending?.type === 'delete'
            ? '구매평을 삭제할까요?'
            : pending?.type === 'hide'
              ? '구매평을 숨길까요?'
              : '구매평을 다시 노출할까요?'
        }
        description={
          pending?.type === 'delete'
            ? `${pendingReview?.productName ?? ''} 구매평을 삭제하면 되돌릴 수 없습니다.`
            : pending?.type === 'hide'
              ? `${pendingReview?.productName ?? ''} 구매평이 공개 화면에서 숨겨지고 별점 집계에서 제외됩니다.`
              : `${pendingReview?.productName ?? ''} 구매평이 다시 공개되고 별점 집계에 포함됩니다.`
        }
        confirmText={pending?.type === 'delete' ? '삭제' : '확인'}
        isDestructive={pending?.type === 'delete'}
        onConfirm={handleConfirm}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
