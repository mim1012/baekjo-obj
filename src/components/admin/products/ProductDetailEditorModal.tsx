import React, { useState, useEffect } from 'react';
import type { Product, ProductDetailBlock } from '@/types';
import { X } from 'lucide-react';

interface ProductDetailEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (productId: string, data: { image: string; description: string; detailBlocks: ProductDetailBlock[] }) => Promise<void>;
  isSaving: boolean;
  product: Product | null;
}

export function ProductDetailEditorModal({
  isOpen,
  onClose,
  onSubmit,
  isSaving,
  product,
}: ProductDetailEditorModalProps) {
  const [image, setImage] = useState('');
  const [description, setDescription] = useState('');
  const [detailBlocks, setDetailBlocks] = useState<ProductDetailBlock[]>([]);

  useEffect(() => {
    if (isOpen && product) {
      // 선택된 상품이 바뀔 때 모달의 편집용 드래프트를 초기화한다.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setImage(product.image || '');
      setDescription(product.description || product.name);
      setDetailBlocks(product.detailBlocks || []);
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!image.trim() || !description.trim()) {
      alert('메인 썸네일 경로와 설명은 필수입니다.');
      return;
    }
    onSubmit(product.id, { image, description, detailBlocks });
  };

  const addTextBlock = () => {
    setDetailBlocks(prev => [...(prev || []), { type: 'text', content: '' }]);
  };

  const addImageBlock = () => {
    setDetailBlocks(prev => [...(prev || []), { type: 'image', src: '', alt: '' }]);
  };

  const updateBlock = (index: number, newBlock: ProductDetailBlock) => {
    setDetailBlocks(prev => {
      const newBlocks = [...(prev || [])];
      newBlocks[index] = newBlock;
      return newBlocks;
    });
  };

  const removeBlock = (index: number) => {
    setDetailBlocks(prev => {
      const newBlocks = [...(prev || [])];
      newBlocks.splice(index, 1);
      return newBlocks;
    });
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && (!detailBlocks || index === detailBlocks.length - 1)) return;
    setDetailBlocks(prev => {
      const newBlocks = [...(prev || [])];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      const temp = newBlocks[index];
      newBlocks[index] = newBlocks[targetIndex];
      newBlocks[targetIndex] = temp;
      return newBlocks;
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-5 border-b border-stone-100 bg-white flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-lg font-bold text-stone-900">상세 페이지 편집</h3>
            <p className="text-sm text-stone-500 mt-1">{product.name}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-50 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto bg-stone-50/30">
          <section className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">메인 썸네일 이미지 경로 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  className="w-full border border-stone-200 focus:border-stone-400 focus:ring-1 focus:ring-stone-400 rounded-xl px-4 py-2.5 text-sm transition-all"
                  placeholder="예: /products/p1.webp"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">한 줄 요약 설명 (Description) <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-stone-200 focus:border-stone-400 focus:ring-1 focus:ring-stone-400 rounded-xl px-4 py-2.5 text-sm transition-all"
                  placeholder="예: 관절과 뼈 건강을 돕는 영양식"
                />
              </div>
            </div>

            <div className="mt-6 border border-stone-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-stone-50 border-b border-stone-200 flex justify-between items-center">
                <span className="text-sm font-bold text-stone-800">본문 구성 블록 (옵션)</span>
                <div className="flex gap-2">
                  <button type="button" onClick={addTextBlock} className="px-3 py-1.5 text-xs font-medium bg-white border border-stone-200 rounded hover:bg-stone-100 transition-colors">
                    + 텍스트 추가
                  </button>
                  <button type="button" onClick={addImageBlock} className="px-3 py-1.5 text-xs font-medium bg-white border border-stone-200 rounded hover:bg-stone-100 transition-colors">
                    + 이미지 추가
                  </button>
                </div>
              </div>
              <div className="p-4 space-y-3 bg-white">
                {!detailBlocks || detailBlocks.length === 0 ? (
                  <div className="text-center py-6 text-sm text-stone-400">등록된 상세 블록이 없습니다.<br/>(미등록 시 메인 썸네일이 본문에도 표시됩니다)</div>
                ) : (
                  detailBlocks.map((block, idx) => (
                    <div key={idx} className="flex gap-3 items-start border border-stone-100 bg-stone-50/50 p-3 rounded-lg relative group">
                      <div className="flex flex-col gap-1 mt-1">
                        <button type="button" onClick={() => moveBlock(idx, 'up')} disabled={idx === 0} className="text-stone-400 hover:text-stone-700 disabled:opacity-30">▲</button>
                        <button type="button" onClick={() => moveBlock(idx, 'down')} disabled={(!detailBlocks || idx === detailBlocks.length - 1)} className="text-stone-400 hover:text-stone-700 disabled:opacity-30">▼</button>
                      </div>
                      <div className="flex-1 space-y-2">
                        {block.type === 'text' ? (
                          <>
                            <div className="text-xs font-semibold text-blue-600">텍스트 블록</div>
                            <textarea
                              value={block.content}
                              onChange={(e) => updateBlock(idx, { type: 'text', content: e.target.value })}
                              rows={3}
                              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all"
                              placeholder="본문 내용을 입력하세요"
                            />
                          </>
                        ) : (
                          <>
                            <div className="text-xs font-semibold text-emerald-600">이미지 블록</div>
                            <input
                              type="text"
                              value={block.src}
                              onChange={(e) => updateBlock(idx, { type: 'image', src: e.target.value, alt: block.alt })}
                              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm mb-2"
                              placeholder="이미지 URL (예: /products/detail/img1.webp)"
                            />
                            <input
                              type="text"
                              value={block.alt || ''}
                              onChange={(e) => updateBlock(idx, { type: 'image', src: block.src, alt: e.target.value })}
                              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
                              placeholder="대체 텍스트 (Alt)"
                            />
                          </>
                        )}
                      </div>
                      <button type="button" onClick={() => removeBlock(idx)} className="p-1.5 text-stone-400 hover:text-red-500 rounded bg-white border border-stone-200 hover:border-red-200 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
        
        <div className="px-6 py-5 border-t border-stone-100 bg-white flex justify-end gap-3 shrink-0">
          <button 
            type="button" 
            onClick={onClose} 
            disabled={isSaving}
            className="px-5 py-2.5 text-sm font-medium text-stone-600 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 hover:text-stone-900 transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button 
            type="submit" 
            disabled={isSaving} 
            className="px-5 py-2.5 text-sm font-medium text-white bg-stone-900 rounded-xl hover:bg-black transition-colors disabled:opacity-60 shadow-md shadow-stone-900/10"
          >
            {isSaving ? '저장 중...' : '상세 편집 완료'}
          </button>
        </div>
      </form>
    </div>
  );
}
