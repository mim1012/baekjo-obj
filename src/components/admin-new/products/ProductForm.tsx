'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft, Trash2 } from 'lucide-react';
import type { Product, Brand, ProductOption } from '@/types';
import { createProduct, updateProduct, deleteProduct, type CreateProductInput, type UpdateProductInput } from '@/lib/storage';
import { useCategorySettings } from '@/components/providers/CategorySettingsProvider';

import PageHeader from '@/components/admin-new/common/PageHeader';
import FormField from '@/components/admin-new/common/FormField';
import SaveBar from '@/components/admin-new/common/SaveBar';
import ImageUploader from '@/components/admin-new/common/ImageUploader';

interface ProductFormProps {
  initialData?: Product | null;
  brands: Brand[];
}

type RequiredField = 'name' | 'brandId' | 'category' | 'lifestyleCategory' | 'image';

const REQUIRED_FIELDS: RequiredField[] = ['name', 'brandId', 'category', 'lifestyleCategory', 'image'];

const REQUIRED_LABELS: Record<RequiredField, string> = {
  name: '상품명',
  brandId: '브랜드',
  category: '스토어 카테고리',
  lifestyleCategory: '라이프스타일 분류',
  image: '대표 이미지',
};

function isRequiredField(field: keyof Product): field is RequiredField {
  return (REQUIRED_FIELDS as string[]).includes(field);
}

function requiredFieldError(field: RequiredField, value: unknown): string | null {
  const label = REQUIRED_LABELS[field];

  if (field === 'brandId') {
    return value ? null : `${label}를 선택해주세요.`;
  }

  const isEmpty = typeof value !== 'string' || value.trim().length === 0;
  if (!isEmpty) return null;

  if (field === 'name') return `${label}을(를) 입력해주세요.`;
  if (field === 'image') return `${label}을(를) 등록해주세요.`;
  return `${label}을(를) 선택해주세요.`;
}

function toUserMessage(err: unknown): string {
  const code = err instanceof Error ? err.message : String(err);

  switch (code) {
    case 'invalid-input':
      return '입력값을 확인해주세요. 필수 항목이 비었거나 형식이 올바르지 않습니다.';
    case 'invalid-brand':
      return '선택한 브랜드를 찾을 수 없습니다. 브랜드를 다시 선택해주세요.';
    case 'not-found':
      return '상품을 찾을 수 없습니다. 목록에서 다시 시도해주세요.';
    case 'unauthorized':
    case 'forbidden':
      return '권한이 없습니다. 다시 로그인해주세요.';
    // storage.ts(createProduct/updateProduct)는 네트워크 실패 시 'network'를 반환한다.
    // 'network-error'만 매핑돼 있어 네트워크 실패가 default('저장에 실패했습니다')로 샜다.
    case 'server-error':
    case 'network':
    case 'network-error':
      return '서버 오류로 저장하지 못했습니다. 잠시 후 다시 시도해주세요.';
    default:
      return '저장에 실패했습니다.';
  }
}

export default function ProductForm({ initialData, brands }: ProductFormProps) {
  const router = useRouter();
  const { categorySettings } = useCategorySettings();
  const isEdit = !!initialData;
  const [draftId] = useState(() => 
    typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : Math.random().toString(36).substring(2, 15)
  );

  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    brandId: '',
    category: '',
    lifestyleCategory: '',
    petType: 'both',
    ageGroup: 'all',
    price: 0,
    salePrice: 0,
    stock: 0,
    image: '',
    isVisible: false,
    isBest: false,
    isRecommended: false,
    summary: '',
    description: '',
    ...initialData
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<RequiredField, string>>>({});

  const handleChange = (field: keyof Product, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (isRequiredField(field) && fieldErrors[field] && !requiredFieldError(field, value)) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleBlur = (field: RequiredField) => {
    const message = requiredFieldError(field, formData[field]);
    setFieldErrors(prev => {
      const next = { ...prev };
      if (message) {
        next[field] = message;
      } else {
        delete next[field];
      }
      return next;
    });
  };

  const handleSave = async () => {
    const nextFieldErrors: Partial<Record<RequiredField, string>> = {};
    for (const field of REQUIRED_FIELDS) {
      const message = requiredFieldError(field, formData[field]);
      if (message) nextFieldErrors[field] = message;
    }

    setFieldErrors(nextFieldErrors);

    const missingFields = REQUIRED_FIELDS.filter(field => nextFieldErrors[field]);
    if (missingFields.length > 0) {
      setError(`필수 항목을 채워주세요 — ${missingFields.map(f => REQUIRED_LABELS[f]).join(', ')}`);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const brandName = brands.find(b => b.id === formData.brandId)?.name;
      const salePrice = formData.salePrice ? formData.salePrice : null;

      // 이 폼은 자기가 편집하는 필드만 patch한다. `...formData`로 로드 시점 스냅샷을 통째로
      // 되보내면 detailBlocks(상세 에디터 소유)·options·images·rating 등 이 폼이 건드리지 않는
      // 필드까지 낡은 값으로 덮어써, 그 사이 다른 화면(상세 에디터)이 저장한 값이 사라진다.
      // 그래서 화면에 입력 컨트롤이 있는 필드만 명시적으로 골라 보낸다(암묵적 스프레드 금지).
      if (isEdit && initialData.id) {
        // 수정(PATCH)은 read-modify-write라 여기 없는 필드는 서버가 기존 값을 그대로 유지한다.
        // ageGroup은 폼에 UI가 없으므로 보내지 않는다(있으면 state 기본값 'all'로 덮어써버림).
        const payload = {
          name: formData.name,
          brandId: formData.brandId,
          brandName,
          category: formData.category,
          lifestyleCategory: formData.lifestyleCategory,
          petType: formData.petType,
          summary: formData.summary,
          description: formData.description,
          price: formData.price,
          salePrice,
          stock: formData.stock,
          isVisible: formData.isVisible,
          isRecommended: formData.isRecommended,
          isBest: formData.isBest,
          image: formData.image,
        } as UpdateProductInput;
        const { error: updateError } = await updateProduct(initialData.id, payload);
        if (updateError) throw new Error(updateError);
      } else {
        // 생성은 서버가 requireAll=true로 검증한다 — ageGroup은 폼에 입력 UI가 없지만 서버
        // 필수 필드이므로 state 기본값('all')을 명시적으로 포함해야 400을 피한다.
        // rating/reviewCount/concernTags 등은 CreateProductInput(=Omit<Product,'id'>) 타입상
        // 필수지만 이 폼엔 입력 UI가 없다 — 서버가 requireAll=true에서 기본값(0/[])을 채우므로
        // 보내지 않고 캐스팅으로 타입만 맞춘다.
        const payload = {
          name: formData.name ?? '',
          brandId: formData.brandId ?? '',
          brandName,
          category: formData.category ?? '',
          lifestyleCategory: formData.lifestyleCategory ?? '',
          petType: formData.petType ?? 'both',
          ageGroup: formData.ageGroup ?? 'all',
          summary: formData.summary,
          description: formData.description ?? '',
          price: formData.price ?? 0,
          salePrice,
          stock: formData.stock ?? 0,
          isVisible: formData.isVisible ?? false,
          isRecommended: formData.isRecommended ?? false,
          isBest: formData.isBest ?? false,
          image: formData.image ?? '',
        } as CreateProductInput;
        const { error: createError } = await createProduct(payload);
        if (createError) throw new Error(createError);
      }

      router.push('/admin/products');
      router.refresh();
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isEdit || !initialData?.id) return;
    if (!confirm('정말로 이 상품을 삭제하시겠습니까?')) return;
    
    try {
      const res = await deleteProduct(initialData.id);
      if (res.error) {
        alert(
          res.error === 'product-has-history'
            ? '리뷰/문의가 있는 상품은 삭제 대신 숨김 처리하세요.'
            : '상품 삭제에 실패했습니다.',
        );
        return;
      }
      router.push('/admin/products');
      router.refresh();
    } catch {
      alert('상품 삭제에 실패했습니다.');
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title={isEdit ? '상품 수정' : '새 상품 등록'}
        description={isEdit ? '선택한 상품의 기본 정보와 노출 설정을 수정합니다.' : '새로운 상품의 기본 정보와 이미지를 등록합니다.'}
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
        <div role="alert" aria-live="polite" className="p-4 bg-red-50 text-red-600 rounded-md border border-red-200 text-[13px] font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* 기본 정보 */}
          <div className="bg-white border border-gray-200 rounded-md p-6">
            <h3 className="text-[15px] font-semibold text-[#17201B] mb-5">기본 정보</h3>
            <div className="space-y-4">
              <FormField label="상품명" htmlFor="product-name" required error={fieldErrors.name}>
                <input
                  id="product-name"
                  type="text"
                  value={formData.name || ''}
                  onChange={e => handleChange('name', e.target.value)}
                  onBlur={() => handleBlur('name')}
                  aria-invalid={!!fieldErrors.name}
                  aria-describedby={fieldErrors.name ? 'product-name-error' : undefined}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] focus:border-[#17201B] focus:ring-1 focus:ring-[#17201B] outline-none"
                  placeholder="예: 강아지 알러지 케어 사료 2kg"
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="브랜드" htmlFor="product-brand" required error={fieldErrors.brandId}>
                  <select
                    id="product-brand"
                    value={formData.brandId || ''}
                    onChange={e => handleChange('brandId', e.target.value)}
                    onBlur={() => handleBlur('brandId')}
                    aria-invalid={!!fieldErrors.brandId}
                    aria-describedby={fieldErrors.brandId ? 'product-brand-error' : undefined}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] focus:border-[#17201B] focus:ring-1 focus:ring-[#17201B] outline-none"
                  >
                    <option value="">브랜드 선택</option>
                    {brands.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </FormField>

                <FormField label="스토어 카테고리" htmlFor="product-category" required error={fieldErrors.category}>
                  <select
                    id="product-category"
                    value={formData.category || ''}
                    onChange={e => handleChange('category', e.target.value)}
                    onBlur={() => handleBlur('category')}
                    aria-invalid={!!fieldErrors.category}
                    aria-describedby={fieldErrors.category ? 'product-category-error' : undefined}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] focus:border-[#17201B] focus:ring-1 focus:ring-[#17201B] outline-none"
                  >
                    <option value="">카테고리 선택</option>
                    {categorySettings.productCategories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="반려동물">
                  <select
                    value={formData.petType || 'both'}
                    onChange={e => handleChange('petType', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] focus:border-[#17201B] focus:ring-1 focus:ring-[#17201B] outline-none"
                  >
                    <option value="both">공용</option>
                    <option value="dog">강아지 전용</option>
                    <option value="cat">고양이 전용</option>
                  </select>
                </FormField>

                <FormField label="라이프스타일 분류" htmlFor="product-lifestyle" required error={fieldErrors.lifestyleCategory}>
                  <select
                    id="product-lifestyle"
                    value={formData.lifestyleCategory || ''}
                    onChange={e => handleChange('lifestyleCategory', e.target.value)}
                    onBlur={() => handleBlur('lifestyleCategory')}
                    aria-invalid={!!fieldErrors.lifestyleCategory}
                    aria-describedby={fieldErrors.lifestyleCategory ? 'product-lifestyle-error' : undefined}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] focus:border-[#17201B] focus:ring-1 focus:ring-[#17201B] outline-none"
                  >
                    <option value="">선택</option>
                    {categorySettings.lifestyleCategories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </FormField>
              </div>

              <FormField label="한 줄 설명">
                <input 
                  type="text" 
                  value={formData.summary || ''} 
                  onChange={e => handleChange('summary', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] focus:border-[#17201B] focus:ring-1 focus:ring-[#17201B] outline-none"
                  placeholder="상품 카드에 노출될 짧은 설명"
                />
              </FormField>

              <FormField label="간단 텍스트 상세">
                <textarea 
                  value={formData.description || ''} 
                  onChange={e => handleChange('description', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] h-24 focus:border-[#17201B] focus:ring-1 focus:ring-[#17201B] outline-none resize-none"
                  placeholder="간단한 상세 설명 (선택 — 상세페이지 에디터로 본문을 만들 거라면 비워두세요)"
                />
              </FormField>
            </div>
          </div>

          {/* 가격 및 재고 */}
          <div className="bg-white border border-gray-200 rounded-md p-6">
            <h3 className="text-[15px] font-semibold text-[#17201B] mb-5">가격 및 재고</h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="판매가 (원)" required>
                <input 
                  type="number" 
                  min="0"
                  value={formData.price || 0} 
                  onChange={e => handleChange('price', Number(e.target.value))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] focus:border-[#17201B] focus:ring-1 focus:ring-[#17201B] outline-none"
                />
              </FormField>
              <FormField label="할인가 (원)">
                <input 
                  type="number" 
                  min="0"
                  value={formData.salePrice || 0} 
                  onChange={e => handleChange('salePrice', Number(e.target.value))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] focus:border-[#17201B] focus:ring-1 focus:ring-[#17201B] outline-none"
                />
              </FormField>
              <FormField label="재고 (개)">
                <input 
                  type="number" 
                  min="0"
                  value={formData.stock || 0} 
                  onChange={e => handleChange('stock', Number(e.target.value))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] focus:border-[#17201B] focus:ring-1 focus:ring-[#17201B] outline-none"
                />
              </FormField>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* 노출 상태 */}
          <div className="bg-white border border-gray-200 rounded-md p-6">
            <h3 className="text-[15px] font-semibold text-[#17201B] mb-5">노출 상태</h3>
            <div className="space-y-4">
              <label className="flex items-center justify-between p-3 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50">
                <span className="text-[14px] font-medium text-[#17201B]">스토어 노출</span>
                <input 
                  type="checkbox" 
                  checked={formData.isVisible || false}
                  onChange={e => handleChange('isVisible', e.target.checked)}
                  className="w-4 h-4 text-[#17201B] border-gray-300 rounded focus:ring-[#17201B]"
                />
              </label>
              
              <label className="flex items-center justify-between p-3 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50">
                <span className="text-[14px] font-medium text-[#17201B]">추천 상품 (MD)</span>
                <input 
                  type="checkbox" 
                  checked={formData.isRecommended || false}
                  onChange={e => handleChange('isRecommended', e.target.checked)}
                  className="w-4 h-4 text-[#17201B] border-gray-300 rounded focus:ring-[#17201B]"
                />
              </label>
              
              <label className="flex items-center justify-between p-3 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50">
                <span className="text-[14px] font-medium text-[#17201B]">베스트 상품</span>
                <input 
                  type="checkbox" 
                  checked={formData.isBest || false}
                  onChange={e => handleChange('isBest', e.target.checked)}
                  className="w-4 h-4 text-[#17201B] border-gray-300 rounded focus:ring-[#17201B]"
                />
              </label>
            </div>
          </div>

          {/* 대표 이미지 */}
          <div className="bg-white border border-gray-200 rounded-md p-6">
            <h3 className="text-[15px] font-semibold text-[#17201B] mb-5">대표 이미지</h3>
            <ImageUploader 
              value={formData.image || ''}
              onChange={(url) => handleChange('image', url)}
              domain="product"
              usage="main"
              entityId={isEdit ? initialData.id : undefined}
              draftId={!isEdit ? draftId : undefined}
              aspectRatio="1/1"
              height="240px"
              description="정사각형(1:1) 비율, 최소 600x600px 권장"
            />
          </div>

          {/* 관리 작업 */}
          {isEdit && (
            <div className="bg-white border border-red-200 rounded-md p-6">
              <h3 className="text-[15px] font-semibold text-red-600 mb-2">위험 영역</h3>
              <p className="text-[12px] text-gray-500 mb-4">
                상품을 삭제하면 복구할 수 없으며 주문 내역 등에서 문제가 발생할 수 있습니다. 
                대신 노출 상태를 변경하는 것을 권장합니다.
              </p>
              <button
                onClick={handleDelete}
                className="w-full py-2 border border-red-200 text-red-600 font-medium text-[13px] rounded hover:bg-red-50 flex items-center justify-center gap-2"
              >
                <Trash2 size={16} /> 상품 영구 삭제
              </button>
            </div>
          )}
        </div>
      </div>

      <SaveBar
        isVisible={true}
        onSave={handleSave}
        onCancel={() => router.back()}
        saveLabel={isEdit ? '수정 사항 저장' : '등록 완료'}
        cancelLabel="취소"
        isSaving={isSaving}
      />
    </div>
  );
}
