'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, GripVertical, Image as ImageIcon, Type, Trash2, Plus } from 'lucide-react';
import type { Product, ProductDetailBlock } from '@/types';
import { updateProduct } from '@/lib/storage';

import PageHeader from '@/components/admin-new/common/PageHeader';
import SaveBar from '@/components/admin-new/common/SaveBar';
import ImageUploader from '@/components/admin-new/common/ImageUploader';

interface ProductDetailEditorProps {
  product: Product;
}

export default function ProductDetailEditor({ product }: ProductDetailEditorProps) {
  const router = useRouter();
  
  // 기본적으로 빈 배열이 아니면 복사해서 사용, 없으면 빈 배열
  const [blocks, setBlocks] = useState<ProductDetailBlock[]>(
    product.detailBlocks && product.detailBlocks.length > 0 
      ? [...product.detailBlocks] 
      : []
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddText = () => {
    setBlocks([...blocks, { type: 'text', content: '' }]);
  };

  const handleAddImage = () => {
    setBlocks([...blocks, { type: 'image', src: '' }]);
  };

  const handleUpdateBlock = (index: number, updated: ProductDetailBlock) => {
    const newBlocks = [...blocks];
    newBlocks[index] = updated;
    setBlocks(newBlocks);
  };

  const handleRemoveBlock = (index: number) => {
    setBlocks(blocks.filter((_, i) => i !== index));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newBlocks = [...blocks];
    const temp = newBlocks[index - 1];
    newBlocks[index - 1] = newBlocks[index];
    newBlocks[index] = temp;
    setBlocks(newBlocks);
  };

  const handleMoveDown = (index: number) => {
    if (index === blocks.length - 1) return;
    const newBlocks = [...blocks];
    const temp = newBlocks[index + 1];
    newBlocks[index + 1] = newBlocks[index];
    newBlocks[index] = temp;
    setBlocks(newBlocks);
  };

  const handleSave = async () => {
    // 빈 블록 검증 (내용이 없거나 이미지가 없는 블록 필터링)
    const validBlocks = blocks.filter(b => {
      if (b.type === 'text') return b.content.trim().length > 0;
      if (b.type === 'image') return b.src.trim().length > 0;
      // 알 수 없는 타입 보존 (요구사항)
      return true;
    });

    setIsSaving(true);
    setError(null);

    try {
      const { error: updateError } = await updateProduct(product.id, {
        detailBlocks: validBlocks
      });

      if (updateError) throw new Error(updateError);
      
      router.push('/admin/products');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 h-full flex flex-col">
      <PageHeader
        title={`${product.name} 상세페이지 편집`}
        description="상품 상세페이지를 구성하는 텍스트/이미지 블록을 편집합니다."
      >
        <button 
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-200 text-[#17201B] font-medium text-[13px] rounded bg-white hover:bg-gray-50 flex items-center gap-2"
        >
          <ArrowLeft size={16} /> 돌아가기
        </button>
      </PageHeader>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-md border border-red-200 text-[13px] font-medium">
          {error}
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
        {/* 왼쪽: 에디터 영역 */}
        <div className="flex flex-col bg-white border border-gray-200 rounded-md overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h3 className="font-semibold text-[#17201B]">콘텐츠 블록</h3>
            <div className="flex gap-2">
              <button 
                onClick={handleAddText}
                className="px-3 py-1.5 bg-white border border-gray-300 rounded text-[12px] font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-1.5"
              >
                <Type size={14} /> 텍스트 추가
              </button>
              <button 
                onClick={handleAddImage}
                className="px-3 py-1.5 bg-white border border-gray-300 rounded text-[12px] font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-1.5"
              >
                <ImageIcon size={14} /> 이미지 추가
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {blocks.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
                <LayoutTemplate size={48} className="mb-4 text-gray-200" />
                <p className="text-[14px]">아직 추가된 블록이 없습니다.</p>
                <p className="text-[12px] mt-1">상단 버튼을 눌러 텍스트나 이미지를 추가하세요.</p>
              </div>
            ) : (
              blocks.map((block, index) => (
                <div key={index} className="flex gap-3 bg-gray-50 p-4 rounded-md border border-gray-200 group relative">
                  {/* 드래그 핸들 (시각적 효과만) */}
                  <div className="flex flex-col items-center justify-center gap-2 text-gray-300 cursor-move">
                    <GripVertical size={20} />
                  </div>
                  
                  {/* 블록 내용 */}
                  <div className="flex-1 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[12px] font-bold text-gray-500 uppercase tracking-wider">
                        {block.type === 'text' ? 'Text Block' : 'Image Block'}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleMoveUp(index)} disabled={index === 0} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 text-gray-500">
                          ↑
                        </button>
                        <button onClick={() => handleMoveDown(index)} disabled={index === blocks.length - 1} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 text-gray-500">
                          ↓
                        </button>
                        <div className="w-px h-4 bg-gray-300 mx-1"></div>
                        <button onClick={() => handleRemoveBlock(index)} className="p-1 hover:bg-red-100 rounded text-red-500">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    {block.type === 'text' ? (
                      <textarea
                        value={block.content}
                        onChange={(e) => handleUpdateBlock(index, { type: 'text', content: e.target.value })}
                        placeholder="텍스트를 입력하세요. HTML 마크업도 가능합니다."
                        className="w-full h-32 p-3 text-[14px] border border-gray-300 rounded focus:border-gray-500 focus:ring-0 outline-none resize-none"
                      />
                    ) : block.type === 'image' ? (
                      <div className="space-y-3">
                        <ImageUploader
                          value={block.src}
                          onChange={(url) => handleUpdateBlock(index, { type: 'image', src: url, alt: block.alt })}
                          domain="product"
                          usage="detail"
                          entityId={product.id}
                          height="160px"
                        />
                        <input
                          type="text"
                          value={block.alt || ''}
                          onChange={(e) => handleUpdateBlock(index, { type: 'image', src: block.src, alt: e.target.value })}
                          placeholder="이미지 설명 (대체 텍스트)"
                          className="w-full p-2 text-[13px] border border-gray-300 rounded focus:border-gray-500 outline-none"
                        />
                      </div>
                    ) : (
                      <div className="p-4 bg-yellow-50 text-yellow-800 text-[13px] border border-yellow-200 rounded">
                        지원하지 않는 블록 타입입니다. 저장 시 이 블록의 원본 데이터는 보존됩니다.
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 오른쪽: 미리보기 영역 */}
        <div className="flex flex-col bg-white border border-gray-200 rounded-md overflow-hidden relative">
          <div className="p-4 border-b border-gray-200 bg-[#17201B] text-white flex justify-between items-center">
            <h3 className="font-semibold">실시간 미리보기</h3>
            <span className="text-[12px] text-gray-400 font-editorial">Preview</span>
          </div>
          
          <div className="flex-1 overflow-y-auto bg-[#FAFAFA] p-0 flex justify-center">
            {/* 스마트폰 비율 컨테이너 */}
            <div className="w-full max-w-[420px] bg-white min-h-full shadow-sm">
              {blocks.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-[13px]">
                  미리보기가 여기에 표시됩니다.
                </div>
              ) : (
                <div className="w-full">
                  {blocks.map((block, i) => {
                    if (block.type === 'text') {
                      return (
                        <div 
                          key={i} 
                          className="px-5 py-6 text-[15px] leading-relaxed text-gray-800 break-words"
                          dangerouslySetInnerHTML={{ __html: block.content || '<p class="text-gray-300 italic">빈 텍스트 블록</p>' }}
                        />
                      );
                    } else if (block.type === 'image') {
                      const src = block.src;
                      if (!src) return <div key={i} className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400 text-[12px]">이미지 없음</div>;
                      // eslint-disable-next-line @next/next/no-img-element
                      return <img key={i} src={src} alt={block.alt || ''} className="w-full h-auto block" />;
                    } else {
                      return <div key={i} className="hidden">Unknown Block</div>;
                    }
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <SaveBar
        isVisible={true}
        onSave={handleSave}
        onCancel={() => router.back()}
        saveLabel="상세페이지 저장"
        cancelLabel="취소"
        isSaving={isSaving}
      />
    </div>
  );
}

import { LayoutTemplate } from 'lucide-react';
