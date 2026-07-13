import React, { useState, useEffect } from 'react';
import type { Brand, Product } from '@/types';
import { X } from 'lucide-react';
import { concerns } from '@/data/concerns';

export interface ProductFormData {
  name: string;
  brandId: string;
  category: string;
  lifestyleCategory: string;
  price: string;
  petType: 'dog' | 'cat' | 'both';
  ageGroup: string;
  concernTags: string[];
  isRecommended: boolean;
  isBest: boolean;
}

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProductFormData, isEdit: boolean) => Promise<void>;
  isSaving: boolean;
  editingProduct: Product | null;
  brands: Brand[];
  categories: string[];
  lifestyleCategories: string[];
  defaultBrandId?: string;
  defaultCategory?: string;
  defaultLifestyleCategory?: string;
}

const emptyForm: ProductFormData = {
  name: '',
  brandId: '',
  category: '',
  lifestyleCategory: '',
  price: '',
  petType: 'both',
  ageGroup: 'all',
  concernTags: [],
  isRecommended: false,
  isBest: false,
};

const petOptions = [
  { id: 'both', label: '공용 (전체)' },
  { id: 'dog', label: '강아지' },
  { id: 'cat', label: '고양이' },
];

const ageOptions = [
  { id: 'all', label: '전체 연령' },
  { id: 'puppy', label: '어린 강아지·고양이' },
  { id: 'adult', label: '성견·성묘' },
  { id: 'senior', label: '나이 든 아이' },
];

export function ProductFormModal({
  isOpen,
  onClose,
  onSubmit,
  isSaving,
  editingProduct,
  brands,
  categories,
  lifestyleCategories,
  defaultBrandId,
  defaultCategory,
  defaultLifestyleCategory,
}: ProductFormModalProps) {
  const [form, setForm] = useState<ProductFormData>(emptyForm);

  useEffect(() => {
    if (isOpen) {
      if (editingProduct) {
        // 모달이 열릴 때 선택 상품을 독립된 폼 드래프트로 초기화한다.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setForm({
          name: editingProduct.name,
          brandId: editingProduct.brandId,
          category: editingProduct.category,
          lifestyleCategory: editingProduct.lifestyleCategory ?? '',
          price: editingProduct.price !== null && editingProduct.price !== undefined ? String(editingProduct.price) : '',
          petType: editingProduct.petType || 'both',
          ageGroup: editingProduct.ageGroup || 'all',
          concernTags: editingProduct.concernTags || [],
          isRecommended: editingProduct.isRecommended || false,
          isBest: editingProduct.isBest || false,
        });
      } else {
        setForm({
          name: '',
          brandId: defaultBrandId || brands[0]?.id || '',
          category: defaultCategory || categories[0] || '',
          lifestyleCategory: defaultLifestyleCategory || '',
          price: '',
          petType: 'both',
          ageGroup: 'all',
          concernTags: [],
          isRecommended: false,
          isBest: false,
        });
      }
    }
  }, [isOpen, editingProduct, brands, categories, defaultBrandId, defaultCategory, defaultLifestyleCategory]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.brandId || !form.category) {
      alert('상품명, 브랜드, 카테고리는 필수입니다.');
      return;
    }
    onSubmit(form, !!editingProduct);
  };

  const toggleConcern = (slug: string) => {
    setForm((prev) => {
      const tags = prev.concernTags || [];
      const isSelected = tags.includes(slug);
      if (isSelected) {
        return { ...prev, concernTags: tags.filter(t => t !== slug) };
      } else {
        return { ...prev, concernTags: [...tags, slug] };
      }
    });
  };



  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-5 border-b border-stone-100 bg-white flex justify-between items-center shrink-0">
          <h3 className="text-lg font-bold text-stone-900">{editingProduct ? '상품 수정' : '새 상품 등록'}</h3>
          <button type="button" onClick={onClose} className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-50 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-8 overflow-y-auto bg-stone-50/30">
          
          {/* A. 큐레이션 영역 (샵 메인 노출 제어) */}
          <section className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm">
            <h4 className="text-sm font-bold text-stone-900 mb-4 flex items-center gap-2">
              <span className="bg-[#A8742E] w-1.5 h-4 rounded-full inline-block"></span>
              전시 및 큐레이션 지정 (샵 메인 노출 제어)
            </h4>
            <div className="flex gap-6">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${form.isRecommended ? 'bg-[#A8742E]' : 'bg-stone-200'}`}>
                  <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${form.isRecommended ? 'translate-x-4' : ''}`}></div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-stone-800">에디터 추천 상품</div>
                  <div className="text-xs text-stone-500">상단 베이지색 추천 영역에 노출됩니다.</div>
                </div>
                <input type="checkbox" className="hidden" checked={form.isRecommended} onChange={(e) => setForm({...form, isRecommended: e.target.checked})} />
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${form.isBest ? 'bg-stone-900' : 'bg-stone-200'}`}>
                  <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${form.isBest ? 'translate-x-4' : ''}`}></div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-stone-800">BEST 상품</div>
                  <div className="text-xs text-stone-500">전체 상품 목록에서 BEST 뱃지를 부여합니다.</div>
                </div>
                <input type="checkbox" className="hidden" checked={form.isBest} onChange={(e) => setForm({...form, isBest: e.target.checked})} />
              </label>
            </div>
          </section>

          {/* B. 기본 정보 영역 */}
          <section className="space-y-4">
            <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <span className="bg-stone-400 w-1.5 h-4 rounded-full inline-block"></span>
              기본 정보
            </h4>
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1.5">상품명 <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-stone-200 focus:border-stone-400 focus:ring-1 focus:ring-stone-400 rounded-xl px-4 py-2.5 text-sm transition-all"
                placeholder="예: 시그니처 연어 사료 2kg"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">브랜드 <span className="text-red-500">*</span></label>
                <select
                  required
                  value={form.brandId}
                  onChange={(e) => setForm({ ...form, brandId: e.target.value })}
                  className="w-full border border-stone-200 focus:border-stone-400 focus:ring-1 focus:ring-stone-400 rounded-xl px-4 py-2.5 text-sm bg-white transition-all"
                >
                  <option value="" disabled>브랜드 선택...</option>
                  {brands?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">판매가(원)</label>
                <input
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full border border-stone-200 focus:border-stone-400 focus:ring-1 focus:ring-stone-400 rounded-xl px-4 py-2.5 text-sm transition-all"
                  placeholder="비워두면 '가격 미등록'"
                />
              </div>
            </div>
          </section>
          
          {/* C. 대분류 카테고리 (가로 필터 연동) */}
          <section className="space-y-4">
            <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <span className="bg-stone-400 w-1.5 h-4 rounded-full inline-block"></span>
              대분류 카테고리 (가로 탭 연동)
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">일반 카테고리 <span className="text-red-500">*</span></label>
                <select
                  required
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full border border-stone-200 focus:border-stone-400 focus:ring-1 focus:ring-stone-400 rounded-xl px-4 py-2.5 text-sm bg-white transition-all"
                >
                  <option value="" disabled>카테고리 선택...</option>
                  {categories?.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">라이프스타일 카테고리</label>
                <select
                  value={form.lifestyleCategory}
                  onChange={(e) => setForm({ ...form, lifestyleCategory: e.target.value })}
                  className="w-full border border-stone-200 focus:border-stone-400 focus:ring-1 focus:ring-stone-400 rounded-xl px-4 py-2.5 text-sm bg-white transition-all"
                >
                  <option value="">(해당 없음)</option>
                  {lifestyleCategories?.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* D. 상세 필터(태그) 지정 (좌측 사이드바 연동) */}
          <section className="space-y-5">
            <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2 mb-2">
              <span className="bg-stone-400 w-1.5 h-4 rounded-full inline-block"></span>
              상세 필터/태그 지정 (좌측 사이드바 연동)
            </h4>

            <div className="grid grid-cols-2 gap-6">
              {/* 반려동물 */}
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">반려동물 유형</label>
                <div className="flex gap-2">
                  {petOptions.map(opt => (
                    <label key={opt.id} className="cursor-pointer">
                      <input type="radio" name="petType" className="hidden" checked={form.petType === opt.id} onChange={() => setForm({...form, petType: opt.id as ProductFormData['petType']})} />
                      <div className={`px-4 py-2 text-sm rounded-lg border font-medium transition-colors ${form.petType === opt.id ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'}`}>
                        {opt.label}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* 연령대 */}
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">연령대</label>
                <div className="flex flex-wrap gap-2">
                  {ageOptions.map(opt => (
                    <label key={opt.id} className="cursor-pointer">
                      <input type="radio" name="ageGroup" className="hidden" checked={form.ageGroup === opt.id} onChange={() => setForm({...form, ageGroup: opt.id})} />
                      <div className={`px-4 py-2 text-sm rounded-lg border font-medium transition-colors ${form.ageGroup === opt.id ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'}`}>
                        {opt.label}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* 고민 태그 */}
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">고민 태그 (다중 선택)</label>
              <div className="flex flex-wrap gap-2">
                {concerns?.map(c => {
                  const isSelected = form.concernTags?.includes(c.slug);
                  return (
                    <label key={c.slug} className="cursor-pointer">
                      <input type="checkbox" className="hidden" checked={isSelected} onChange={() => toggleConcern(c.slug)} />
                      <div className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${isSelected ? 'bg-[#17211D] text-white border-[#17211D]' : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'}`}>
                        {c.title}
                      </div>
                    </label>
                  );
                })}
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
            {isSaving ? '저장 중...' : editingProduct ? '수정 완료' : '등록 완료'}
          </button>
        </div>
      </form>
    </div>
  );
}
