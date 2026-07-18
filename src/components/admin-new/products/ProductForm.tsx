'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, Plus, X } from 'lucide-react';
import type { Product, Brand } from '@/types';
import { createProduct, updateProduct, deleteProduct } from '@/lib/storage';
import {
  buildProductCreatePayload,
  buildProductUpdatePayload,
  type ProductFormState,
  type ProductOptionFormState,
} from '@/lib/products/formPayload';
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

/** 조사를 필드마다 확정해 둔다 — 라벨에 `을(를)`을 붙이면 "분류을(를)"처럼 어색해진다. */
const REQUIRED_MESSAGES: Record<RequiredField, string> = {
  name: '상품명을 입력해주세요.',
  brandId: '브랜드를 선택해주세요.',
  category: '스토어 카테고리를 선택해주세요.',
  lifestyleCategory: '라이프스타일 분류를 선택해주세요.',
  image: '대표 이미지를 등록해주세요.',
};

function requiredFieldError(field: RequiredField, value: unknown): string | null {
  if (field === 'brandId') {
    return value ? null : REQUIRED_MESSAGES.brandId;
  }

  const isEmpty = typeof value !== 'string' || value.trim().length === 0;
  return isEmpty ? REQUIRED_MESSAGES[field] : null;
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
    case 'server-error':
    case 'network':
    case 'network-error':
      return '서버 오류로 저장하지 못했습니다. 잠시 후 다시 시도해주세요.';
    default:
      return '저장에 실패했습니다.';
  }
}

const INPUT_CLASS =
  'w-full border border-gray-300 rounded px-3 py-2 text-[14px] focus:border-[#17201B] focus:ring-1 focus:ring-[#17201B] outline-none';

/** initialData.options(숫자) → 폼 상태(문자열). 편집 중 빈칸/부분입력을 허용하려고 문자열로 든다. */
function toOptionRows(product?: Product | null): ProductOptionFormState[] {
  return (product?.options ?? []).map((o) => ({
    id: o.id,
    name: o.name,
    price: String(o.price),
    stock: String(o.stock),
  }));
}

export default function ProductForm({ initialData, brands }: ProductFormProps) {
  const router = useRouter();
  const { categorySettings } = useCategorySettings();
  const isEdit = !!initialData;
  const [draftId] = useState(() =>
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 15),
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
    isMembersOnlyPrice: false,
    pointsEnabled: false,
    summary: '',
    description: '',
    ingredients: '',
    howToUse: '',
    deliveryEstimate: '',
    shippingNotice: '',
    returnNotice: '',
    sellerName: '',
    images: [],
    recommendedFor: [],
    caution: [],
    ...initialData,
  });

  // 옵션은 price/stock 을 입력 중 문자열로 다뤄야 해 formData 와 별도 상태로 든다.
  const [optionRows, setOptionRows] = useState<ProductOptionFormState[]>(() => toOptionRows(initialData));

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<RequiredField, string>>>({});

  const handleChange = (field: keyof Product, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (isRequiredField(field) && fieldErrors[field] && !requiredFieldError(field, value)) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleBlur = (field: RequiredField) => {
    const message = requiredFieldError(field, formData[field]);
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (message) {
        next[field] = message;
      } else {
        delete next[field];
      }
      return next;
    });
  };

  /** formData(+옵션 상태)를 순수 payload 빌더가 받는 ProductFormState 로 모은다. */
  const toFormState = (): ProductFormState => ({
    name: formData.name,
    brandId: formData.brandId,
    category: formData.category,
    lifestyleCategory: formData.lifestyleCategory,
    petType: formData.petType,
    ageGroup: formData.ageGroup,
    summary: formData.summary,
    description: formData.description,
    price: formData.price,
    salePrice: formData.salePrice,
    stock: formData.stock,
    image: formData.image,
    images: formData.images ?? [],
    options: optionRows,
    ingredients: formData.ingredients,
    howToUse: formData.howToUse,
    recommendedFor: formData.recommendedFor ?? [],
    caution: formData.caution ?? [],
    shippingFee: formData.shippingFee ?? null,
    deliveryEstimate: formData.deliveryEstimate,
    shippingNotice: formData.shippingNotice,
    returnNotice: formData.returnNotice,
    sellerName: formData.sellerName,
    isMembersOnlyPrice: formData.isMembersOnlyPrice,
    isVisible: formData.isVisible,
    isBest: formData.isBest,
    isRecommended: formData.isRecommended,
    pointsEnabled: formData.pointsEnabled,
    pointsRate: formData.pointsRate,
  });

  const handleSave = async () => {
    const nextFieldErrors: Partial<Record<RequiredField, string>> = {};
    for (const field of REQUIRED_FIELDS) {
      const message = requiredFieldError(field, formData[field]);
      if (message) nextFieldErrors[field] = message;
    }

    setFieldErrors(nextFieldErrors);

    const missingFields = REQUIRED_FIELDS.filter((field) => nextFieldErrors[field]);
    if (missingFields.length > 0) {
      setError(`필수 항목을 채워주세요 — ${missingFields.map((f) => REQUIRED_LABELS[f]).join(', ')}`);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const brandName = brands.find((b) => b.id === formData.brandId)?.name;
      const formState = toFormState();

      // payload 는 순수 빌더가 화이트리스트로만 구성한다(`...formData` 암묵 스프레드 금지).
      // detailBlocks(상세 에디터 소유)·rating 등은 담기지 않아 read-modify-write 로 보존된다.
      if (isEdit && initialData.id) {
        const payload = buildProductUpdatePayload(formState, brandName);
        const { error: updateError } = await updateProduct(initialData.id, payload);
        if (updateError) throw new Error(updateError);
      } else {
        const payload = buildProductCreatePayload(formState, brandName);
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

  const images = formData.images ?? [];
  const recommendedFor = formData.recommendedFor ?? [];
  const caution = formData.caution ?? [];

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title={isEdit ? '상품 수정' : '새 상품 등록'}
        description={
          isEdit
            ? '기본 정보·가격·옵션·상세 정보·배송 안내까지 상세페이지에 노출되는 모든 항목을 수정합니다.'
            : '새 상품의 기본 정보와 상세페이지 노출 항목을 등록합니다.'
        }
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
        <div
          role="alert"
          aria-live="polite"
          className="p-4 bg-red-50 text-red-600 rounded-md border border-red-200 text-[13px] font-medium"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* 기본 정보 */}
          <SectionCard title="기본 정보">
            <div className="space-y-4">
              <FormField label="상품명" htmlFor="product-name" required error={fieldErrors.name}>
                <input
                  id="product-name"
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => handleChange('name', e.target.value)}
                  onBlur={() => handleBlur('name')}
                  aria-invalid={!!fieldErrors.name}
                  aria-describedby={fieldErrors.name ? 'product-name-error' : undefined}
                  className={INPUT_CLASS}
                  placeholder="예: 강아지 알러지 케어 사료 2kg"
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="브랜드" htmlFor="product-brand" required error={fieldErrors.brandId}>
                  <select
                    id="product-brand"
                    value={formData.brandId || ''}
                    onChange={(e) => handleChange('brandId', e.target.value)}
                    onBlur={() => handleBlur('brandId')}
                    aria-invalid={!!fieldErrors.brandId}
                    aria-describedby={fieldErrors.brandId ? 'product-brand-error' : undefined}
                    className={INPUT_CLASS}
                  >
                    <option value="">브랜드 선택</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="스토어 카테고리" htmlFor="product-category" required error={fieldErrors.category}>
                  <select
                    id="product-category"
                    value={formData.category || ''}
                    onChange={(e) => handleChange('category', e.target.value)}
                    onBlur={() => handleBlur('category')}
                    aria-invalid={!!fieldErrors.category}
                    aria-describedby={fieldErrors.category ? 'product-category-error' : undefined}
                    className={INPUT_CLASS}
                  >
                    <option value="">카테고리 선택</option>
                    {categorySettings.productCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="반려동물">
                  <select
                    value={formData.petType || 'both'}
                    onChange={(e) => handleChange('petType', e.target.value)}
                    className={INPUT_CLASS}
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
                    onChange={(e) => handleChange('lifestyleCategory', e.target.value)}
                    onBlur={() => handleBlur('lifestyleCategory')}
                    aria-invalid={!!fieldErrors.lifestyleCategory}
                    aria-describedby={fieldErrors.lifestyleCategory ? 'product-lifestyle-error' : undefined}
                    className={INPUT_CLASS}
                  >
                    <option value="">선택</option>
                    {categorySettings.lifestyleCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <FormField label="한 줄 설명">
                <input
                  type="text"
                  value={formData.summary || ''}
                  onChange={(e) => handleChange('summary', e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="상품 카드에 노출될 짧은 설명"
                />
              </FormField>

              <FormField label="간단 텍스트 상세">
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => handleChange('description', e.target.value)}
                  className={`${INPUT_CLASS} h-24 resize-none`}
                  placeholder="간단한 상세 설명 (선택 — 상세페이지 에디터로 본문을 만들 거라면 비워두세요)"
                />
              </FormField>
            </div>
          </SectionCard>

          {/* 가격 및 재고 */}
          <SectionCard title="가격 및 재고">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="판매가 (원)" required>
                <input
                  type="number"
                  min="0"
                  value={formData.price || ''}
                  onChange={(e) => handleChange('price', Number(e.target.value))}
                  className={INPUT_CLASS}
                />
              </FormField>
              <FormField label="할인가 (원)">
                <input
                  type="number"
                  min="0"
                  value={formData.salePrice || ''}
                  onChange={(e) => handleChange('salePrice', Number(e.target.value))}
                  className={INPUT_CLASS}
                />
              </FormField>
              <FormField label="재고 (개)">
                <input
                  type="number"
                  min="0"
                  value={formData.stock || ''}
                  onChange={(e) => handleChange('stock', Number(e.target.value))}
                  className={INPUT_CLASS}
                />
              </FormField>
              <FormField label="배송비 (원)">
                <input
                  type="number"
                  min="0"
                  value={formData.shippingFee ?? ''}
                  onChange={(e) =>
                    handleChange('shippingFee', e.target.value === '' ? undefined : Number(e.target.value))
                  }
                  className={INPUT_CLASS}
                  placeholder="미입력 시 기존/기본값 유지 · 0 = 무료배송"
                />
              </FormField>
            </div>
            <label className="mt-4 flex items-center justify-between p-3 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50">
              <span className="text-[14px] font-medium text-[#17201B]">회원 전용가 (비회원에게 가격 숨김)</span>
              <input
                type="checkbox"
                checked={formData.isMembersOnlyPrice || false}
                onChange={(e) => handleChange('isMembersOnlyPrice', e.target.checked)}
                className="w-4 h-4 text-[#17201B] border-gray-300 rounded focus:ring-[#17201B]"
              />
            </label>
            <label className="mt-2 flex items-center justify-between p-3 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50">
              <span className="text-[14px] font-medium text-[#17201B]">적립금 지급</span>
              <input
                type="checkbox"
                checked={formData.pointsEnabled || false}
                // 해제 상태에서는 pointsRate 를 payload 에 싣지 않는다.
                // 서버 updateProduct 는 pointsEnabled=false 패치를 받으면 기존 detail.pointsRate 를 제거해
                // "체크는 꺼졌는데 DB에는 5%가 남아 재활성화 때 되살아나는" 불일치를 막는다.
                onChange={(e) => handleChange('pointsEnabled', e.target.checked)}
                className="w-4 h-4 text-[#17201B] border-gray-300 rounded focus:ring-[#17201B]"
              />
            </label>
            {formData.pointsEnabled && (
              <FormField label="적립률 (%)">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={formData.pointsRate ?? ''}
                  onChange={(e) =>
                    handleChange('pointsRate', e.target.value === '' ? undefined : Number(e.target.value))
                  }
                  className={INPUT_CLASS}
                  placeholder="상품금액 기준. 배송비 제외"
                />
                <p className="mt-1 text-[12px] text-[#9AA39B]">
                  적립 지급은 구매확정 기능 구현 후 동작합니다(현재는 설정만 저장).
                </p>
              </FormField>
            )}
          </SectionCard>

          {/* 상품 옵션 */}
          <SectionCard
            title="상품 옵션"
            description="옵션을 추가하면 구매 화면에 선택 목록으로 노출됩니다. 이름이 빈 행은 저장되지 않습니다."
          >
            <OptionEditor rows={optionRows} onChange={setOptionRows} />
          </SectionCard>

          {/* 상세 정보 */}
          <SectionCard
            title="상세 정보"
            description="상품 상세페이지의 정보 카드에 노출됩니다. 비워두면 기본 안내 문구가 대신 표시됩니다."
          >
            <div className="space-y-4">
              <FormField label="성분/원재료">
                <textarea
                  value={formData.ingredients || ''}
                  onChange={(e) => handleChange('ingredients', e.target.value)}
                  className={`${INPUT_CLASS} h-20 resize-none`}
                  placeholder="예: 닭고기 40%, 현미, 연어오일…"
                />
              </FormField>
              <FormField label="급여/사용 방법">
                <textarea
                  value={formData.howToUse || ''}
                  onChange={(e) => handleChange('howToUse', e.target.value)}
                  className={`${INPUT_CLASS} h-20 resize-none`}
                  placeholder="예: 체중 5kg 기준 하루 60g, 2회 나눠 급여"
                />
              </FormField>
              <FormField label="이런 반려동물에게 추천">
                <ArrayEditor
                  items={recommendedFor}
                  onChange={(next) => handleChange('recommendedFor', next)}
                  addLabel="추천 대상 추가"
                  itemLabel="추천 대상"
                  placeholder="예: 알러지가 있는 반려견"
                  maxItems={50}
                />
              </FormField>
              <FormField label="주의사항">
                <ArrayEditor
                  items={caution}
                  onChange={(next) => handleChange('caution', next)}
                  addLabel="주의사항 추가"
                  itemLabel="주의사항"
                  placeholder="예: 개봉 후 냉장 보관, 2주 이내 급여"
                  maxItems={50}
                />
              </FormField>
            </div>
          </SectionCard>

          {/* 배송/판매자 안내 */}
          <SectionCard title="배송·판매자 안내" description="상세페이지 하단 구매 정보에 노출됩니다.">
            <div className="space-y-4">
              <FormField label="출고 예정 안내">
                <input
                  type="text"
                  value={formData.deliveryEstimate || ''}
                  onChange={(e) => handleChange('deliveryEstimate', e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="예: 오후 2시 이전 주문 시 당일 출고"
                />
              </FormField>
              <FormField label="배송 유의사항">
                <input
                  type="text"
                  value={formData.shippingNotice || ''}
                  onChange={(e) => handleChange('shippingNotice', e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="예: 제주/도서산간 추가 배송비"
                />
              </FormField>
              <FormField label="교환/반품 안내">
                <input
                  type="text"
                  value={formData.returnNotice || ''}
                  onChange={(e) => handleChange('returnNotice', e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="예: 단순 변심 시 수령 후 7일 이내"
                />
              </FormField>
              <FormField label="판매자명">
                <input
                  type="text"
                  value={formData.sellerName || ''}
                  onChange={(e) => handleChange('sellerName', e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="예: 백조오브제"
                />
              </FormField>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          {/* 노출 상태 */}
          <SectionCard title="노출 상태">
            <div className="space-y-4">
              <ToggleRow
                label="스토어 노출"
                checked={formData.isVisible || false}
                onChange={(v) => handleChange('isVisible', v)}
              />
              <ToggleRow
                label="추천 상품 (MD)"
                checked={formData.isRecommended || false}
                onChange={(v) => handleChange('isRecommended', v)}
              />
              <ToggleRow
                label="베스트 상품"
                checked={formData.isBest || false}
                onChange={(v) => handleChange('isBest', v)}
              />
            </div>
          </SectionCard>

          {/* 대표 이미지 */}
          <SectionCard title="대표 이미지">
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
          </SectionCard>

          {/* 추가 이미지 갤러리 */}
          <SectionCard
            title="추가 이미지 갤러리"
            description="대표 이미지 외에 상세페이지 갤러리에 함께 노출됩니다."
          >
            <GalleryEditor
              images={images}
              onChange={(next) => handleChange('images', next)}
              entityId={isEdit ? initialData.id : undefined}
              draftId={!isEdit ? draftId : undefined}
            />
          </SectionCard>

          {/* 관리 작업 */}
          {isEdit && (
            <div className="bg-white border border-red-200 rounded-md p-6">
              <h3 className="text-[15px] font-semibold text-red-600 mb-2">위험 영역</h3>
              <p className="text-[12px] text-gray-500 mb-4">
                상품을 삭제하면 복구할 수 없으며 주문 내역 등에서 문제가 발생할 수 있습니다. 대신 노출 상태를
                변경하는 것을 권장합니다.
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

/* ── 재사용 소품 ─────────────────────────────────────────────── */

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-md p-6">
      <h3 className="text-[15px] font-semibold text-[#17201B] mb-1">{title}</h3>
      {description ? (
        <p className="text-[12px] text-gray-500 mb-5">{description}</p>
      ) : (
        <div className="mb-5" />
      )}
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between p-3 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50">
      <span className="text-[14px] font-medium text-[#17201B]">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 text-[#17201B] border-gray-300 rounded focus:ring-[#17201B]"
      />
    </label>
  );
}

/** 문자열 목록 편집기(추천 대상·주의사항). append/remove만, 재정렬 없음(인덱스 key 안정). */
function ArrayEditor({
  items,
  onChange,
  placeholder,
  addLabel,
  itemLabel,
  maxItems,
}: {
  items: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  addLabel: string;
  itemLabel?: string;
  maxItems?: number;
}) {
  const update = (idx: number, value: string) => {
    onChange(items.map((item, i) => (i === idx ? value : item)));
  };
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));
  const add = () => onChange([...items, '']);

  const atMax = maxItems !== undefined && items.length >= maxItems;
  const lastEmpty = items.length > 0 && items[items.length - 1].trim() === '';
  const addDisabled = atMax || lastEmpty;

  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <input
            type="text"
            value={item}
            onChange={(e) => update(idx, e.target.value)}
            className={INPUT_CLASS}
            placeholder={placeholder}
            aria-label={itemLabel ? `${itemLabel} ${idx + 1}` : undefined}
          />
          <button
            type="button"
            onClick={() => remove(idx)}
            aria-label={itemLabel ? `${itemLabel} ${idx + 1} 삭제` : '항목 삭제'}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        disabled={addDisabled}
        className="flex items-center gap-1.5 text-[13px] font-medium text-[#17201B] hover:underline disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline"
      >
        <Plus size={14} />
        {addLabel}
      </button>
      {atMax && <p className="text-[12px] text-gray-400">최대 {maxItems}개까지 추가할 수 있습니다.</p>}
    </div>
  );
}

/** 옵션 행 편집기. 이름·가격만 입력받는다(재고는 상품 단위 — 옵션별 재고는 시스템이 사용하지 않음).
 *  이름이 빈 행은 저장 단계에서 버려진다. */
function OptionEditor({
  rows,
  onChange,
}: {
  rows: ProductOptionFormState[];
  onChange: (next: ProductOptionFormState[]) => void;
}) {
  const update = (idx: number, patch: Partial<ProductOptionFormState>) => {
    onChange(rows.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  };
  const remove = (idx: number) => onChange(rows.filter((_, i) => i !== idx));
  const add = () => onChange([...rows, { name: '', price: '' }]);

  const lastEmpty = rows.length > 0 && rows[rows.length - 1].name.trim() === '';

  return (
    <div className="space-y-3">
      {rows.map((row, idx) => (
        <div key={row.id ?? idx} className="flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-[12px] text-gray-500 mb-1">옵션명</label>
            <input
              type="text"
              value={row.name}
              onChange={(e) => update(idx, { name: e.target.value })}
              className={INPUT_CLASS}
              placeholder="예: 2kg"
              aria-label={`옵션 ${idx + 1} 이름`}
            />
          </div>
          <div className="w-28">
            <label className="block text-[12px] text-gray-500 mb-1">가격 (원)</label>
            <input
              type="number"
              min="0"
              value={row.price}
              onChange={(e) => update(idx, { price: e.target.value })}
              className={INPUT_CLASS}
              aria-label={`옵션 ${idx + 1} 가격`}
            />
          </div>
          <button
            type="button"
            onClick={() => remove(idx)}
            aria-label={`옵션 ${idx + 1} 삭제`}
            className="p-2 mb-0.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        disabled={lastEmpty}
        className="flex items-center gap-1.5 text-[13px] font-medium text-[#17201B] hover:underline disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline"
      >
        <Plus size={14} /> 옵션 추가
      </button>
    </div>
  );
}

/** 추가 이미지 갤러리 편집기. 슬롯마다 ImageUploader, 빈 URL 은 저장 단계에서 버려진다. */
function GalleryEditor({
  images,
  onChange,
  entityId,
  draftId,
}: {
  images: string[];
  onChange: (next: string[]) => void;
  entityId?: string;
  draftId?: string;
}) {
  const update = (idx: number, url: string) => {
    onChange(images.map((img, i) => (i === idx ? url : img)));
  };
  const remove = (idx: number) => onChange(images.filter((_, i) => i !== idx));
  const add = () => onChange([...images, '']);

  const lastEmpty = images.length > 0 && images[images.length - 1].trim() === '';

  return (
    <div className="space-y-3">
      {images.map((img, idx) => (
        <div key={idx} className="flex items-start gap-2">
          <div className="flex-1">
            <ImageUploader
              value={img}
              onChange={(url) => update(idx, url)}
              domain="product"
              usage="detail"
              entityId={entityId}
              draftId={draftId}
              height="140px"
            />
          </div>
          <button
            type="button"
            onClick={() => remove(idx)}
            aria-label={`갤러리 이미지 ${idx + 1} 삭제`}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        disabled={lastEmpty}
        className="flex items-center gap-1.5 text-[13px] font-medium text-[#17201B] hover:underline disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline"
      >
        <Plus size={14} /> 이미지 추가
      </button>
    </div>
  );
}
