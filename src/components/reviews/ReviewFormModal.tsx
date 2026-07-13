'use client';

import { useState, useEffect } from 'react';
import { X, Star } from 'lucide-react';
import Image from 'next/image';

interface ReviewFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { rating: number; title: string; content: string }) => void | Promise<void>;
  initialData?: {
    rating: number;
    title: string;
    content: string;
  };
  product: {
    name: string;
    image: string;
    brandName?: string;
  };
  optionName?: string;
}

export default function ReviewFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  product,
  optionName,
}: ReviewFormModalProps) {
  const [rating, setRating] = useState(initialData?.rating || 5);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState(initialData?.title || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // 모달이 열릴 때마다 initialData prop 으로 폼을 재동기화한다(dad 동작 보존,
      // 부모가 매번 새 인스턴스를 마운트하지 않으므로 effect 로 동기화 — DB 전환 PR에서 재작업 예정).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRating(initialData?.rating || 5);
      setTitle(initialData?.title || '');
      setContent(initialData?.content || '');
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!content.trim()) {
      alert('내용을 입력해주세요.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit({ rating, title, content });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#EBE6DC] px-6 py-4">
          <h2 className="text-lg font-bold text-[#18231F]">{initialData ? '구매평 수정' : '구매평 작성'}</h2>
          <button onClick={onClose} className="rounded-full p-2 text-[#68716C] hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6 flex gap-4 rounded-xl bg-[#F8F6F0] p-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[#DED8CC] bg-white">
              {product.image ? (
                <Image src={product.image} alt={product.name} fill className="object-cover" />
              ) : (
                <div className="h-full w-full bg-gray-100" />
              )}
            </div>
            <div className="flex flex-col justify-center">
              {product.brandName && <span className="text-xs font-semibold text-[#68716C]">{product.brandName}</span>}
              <span className="mt-1 text-sm font-semibold text-[#18231F] line-clamp-1">{product.name}</span>
              {optionName && <span className="mt-1 text-xs text-[#68716C] line-clamp-1">{optionName}</span>}
            </div>
          </div>

          <div className="mb-6">
            <label className="mb-3 block text-sm font-semibold text-[#18231F]">상품은 어떠셨나요?</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="p-1 focus:outline-none"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= (hoverRating || rating)
                        ? 'fill-[#B99562] text-[#B99562]'
                        : 'fill-transparent text-[#DED8CC]'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="mb-2 block text-sm font-semibold text-[#18231F]">제목 (선택)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="구매평 제목을 입력해주세요"
              className="w-full rounded-lg border border-[#DED8CC] px-4 py-3 text-sm focus:border-[#18231F] focus:outline-none"
            />
          </div>

          <div className="mb-8">
            <label className="mb-2 block text-sm font-semibold text-[#18231F]">내용</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="다른 반려가족에게 도움이 되는 솔직한 후기를 남겨주세요. (최소 10자 이상)"
              rows={5}
              className="w-full resize-none rounded-lg border border-[#DED8CC] px-4 py-3 text-sm focus:border-[#18231F] focus:outline-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-[#DED8CC] py-3.5 text-sm font-semibold text-[#18231F] transition-colors hover:bg-[#F8F6F0]"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!content.trim() || isSubmitting}
              className="flex-1 rounded-lg bg-[#14211C] py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {initialData ? '수정 완료' : '등록하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
