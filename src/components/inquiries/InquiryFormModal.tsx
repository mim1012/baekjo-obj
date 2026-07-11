'use client';

import { useState, useEffect } from 'react';
import { X, Lock, Unlock } from 'lucide-react';
import Image from 'next/image';

interface ProductInfo {
  id: string;
  name: string;
  image: string;
  brandName?: string;
  brandId: string;
}

interface InquiryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; content: string; isSecret: boolean; productId?: string; brandId?: string }) => void;
  initialData?: {
    title: string;
    content: string;
    isSecret: boolean;
  };
  product?: ProductInfo; // 상품 상세에서 띄울 때는 고정
  availableProducts?: ProductInfo[]; // 마이페이지에서 띄울 때 선택 가능 목록
}

export default function InquiryFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  product,
  availableProducts,
}: InquiryFormModalProps) {
  const [selectedProductId, setSelectedProductId] = useState<string>(product?.id || '');
  const [title, setTitle] = useState(initialData?.title || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [isSecret, setIsSecret] = useState(initialData?.isSecret || false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setSelectedProductId(product?.id || '');
      setTitle(initialData?.title || '');
      setContent(initialData?.content || '');
      setIsSecret(initialData?.isSecret || false);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, initialData, product]);

  if (!isOpen) return null;

  const selectedProduct = product || availableProducts?.find((p) => p.id === selectedProductId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct && !product) {
      alert('상품을 선택해주세요.');
      return;
    }
    if (!title.trim() || !content.trim()) {
      alert('제목과 내용을 모두 입력해주세요.');
      return;
    }
    
    onSubmit({ 
      title, 
      content, 
      isSecret,
      productId: selectedProduct?.id,
      brandId: selectedProduct?.brandId,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#EBE6DC] px-6 py-4">
          <h2 className="text-lg font-bold text-[#18231F]">{initialData ? '상품문의 수정' : '상품문의 작성'}</h2>
          <button onClick={onClose} className="rounded-full p-2 text-[#68716C] hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {product ? (
            // 상품 상세 모드: 읽기 전용 상품 정보
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
              </div>
            </div>
          ) : (
            // 마이페이지 모드: 상품 선택
            <div className="mb-6">
              <label className="mb-2 block text-sm font-semibold text-[#18231F]">문의하실 상품</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full rounded-lg border border-[#DED8CC] px-4 py-3 text-sm focus:border-[#18231F] focus:outline-none"
                disabled={!!initialData} // 수정 시 변경 불가
              >
                <option value="">상품을 선택해주세요</option>
                {availableProducts?.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.brandName}] {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mb-6">
            <label className="mb-2 block text-sm font-semibold text-[#18231F]">제목</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="문의 제목을 입력해주세요"
              className="w-full rounded-lg border border-[#DED8CC] px-4 py-3 text-sm focus:border-[#18231F] focus:outline-none"
            />
          </div>

          <div className="mb-6">
            <label className="mb-2 block text-sm font-semibold text-[#18231F]">내용</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="상품에 대해 궁금한 점을 남겨주세요."
              rows={5}
              className="w-full resize-none rounded-lg border border-[#DED8CC] px-4 py-3 text-sm focus:border-[#18231F] focus:outline-none"
            />
          </div>

          <div className="mb-8 flex items-center justify-between rounded-lg border border-[#DED8CC] p-4">
            <div>
              <p className="text-sm font-semibold text-[#18231F]">비밀글 설정</p>
              <p className="text-xs text-[#68716C]">체크하시면 작성자와 관리자만 볼 수 있어요.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsSecret(!isSecret)}
              className={`flex h-8 w-14 items-center rounded-full p-1 transition-colors ${
                isSecret ? 'bg-[#18231F]' : 'bg-[#DED8CC]'
              }`}
            >
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full bg-white transition-transform ${
                  isSecret ? 'translate-x-6' : 'translate-x-0'
                }`}
              >
                {isSecret ? <Lock className="h-3 w-3 text-[#18231F]" /> : <Unlock className="h-3 w-3 text-[#68716C]" />}
              </div>
            </button>
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
              disabled={!title.trim() || !content.trim() || (!selectedProduct && !product)}
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
