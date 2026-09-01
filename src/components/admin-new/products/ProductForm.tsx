'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, Plus, X } from 'lucide-react';
import type { Product, Brand } from '@/types';
import { createAdminProductTag, createProduct, updateProduct, deleteProduct } from '@/lib/storage';
import {
  buildProductCreatePayload,
  buildProductUpdatePayload,
  type ProductFormState,
  type ProductOptionFormState,
} from '@/lib/products/formPayload';
import { useCategorySettings } from '@/components/providers/CategorySettingsProvider';
import { useProductTagSettings } from '@/components/providers/ProductTagSettingsProvider';

import PageHeader from '@/components/admin-new/common/PageHeader';
import FormField from '@/components/admin-new/common/FormField';
import SaveBar from '@/components/admin-new/common/SaveBar';
import ImageUploader from '@/components/admin-new/common/ImageUploader';

interface ProductFormProps {
  initialData?: Product | null;
  brands: Brand[];
}

type RequiredField = 'name' | 'brandId' | 'category' | 'image';

const REQUIRED_FIELDS: RequiredField[] = ['name', 'brandId', 'category', 'image'];

const REQUIRED_LABELS: Record<RequiredField, string> = {
  name: '상품명',
  brandId: '브랜드',
  category: '스토어 카테고리',
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
  const { items: productTags, reload: reloadProductTags } = useProductTagSettings();
  const productTagSuggestions = productTags
    .filter((tag) => tag.isVisible)
    .map((tag) => ({ value: tag.slug, label: tag.label }));
  const isEdit = !!initialData;
  React.useEffect(() => {
    void reloadProductTags();
  }, [reloadProductTags]);
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
    summary: '',
    description: '',
    deliveryEstimate: '',
    shippingNotice: '',
    returnNotice: '',
    sellerName: '',
    images: [],
    concernTags: [],
    recommendedFor: [],
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
    categorySlug: formData.categorySlug,
    // lifestyle_category DB 컬럼은 기존 데이터 호환을 위해 유지하되 직원에게 중복 분류를
    // 요구하지 않는다. 스토어 카테고리 연결값을 같은 내부값으로 자동 저장한다.
    lifestyleCategory: formData.categorySlug || formData.category,
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
    concernTags: formData.concernTags ?? [],
    recommendedFor: formData.recommendedFor ?? [],
    shippingFee: formData.shippingFee ?? null,
    deliveryEstimate: formData.deliveryEstimate,
    shippingNotice: formData.shippingNotice,
    returnNotice: formData.returnNotice,
    sellerName: formData.sellerName,
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
  const concernTags = formData.concernTags ?? [];
  const recommendedFor = formData.recommendedFor ?? [];

  const handleCreateConcernTag = async (label: string): Promise<string> => {
    const result = await createAdminProductTag(label);
    if (!result.ok || !result.tag) {
      if (result.error === 'persistence-not-ready') {
        throw new Error('태그 저장용 DB가 아직 적용되지 않았습니다. DB 적용 후 바로 등록할 수 있습니다.');
      }
      if (result.error === 'invalid-input') {
        throw new Error('태그 이름은 1자 이상 50자 이하로 입력해 주세요.');
      }
      if (result.error === 'unauthorized' || result.error === 'forbidden') {
        throw new Error('관리자 권한을 확인한 뒤 다시 시도해 주세요.');
      }
      throw new Error('태그를 등록하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }

    const alreadySelected = concernTags.includes(result.tag.slug);
    await reloadProductTags();
    if (!alreadySelected) {
      handleChange(
        'concernTags',
        Array.from(new Set([...concernTags.filter((item) => item.trim()), result.tag.slug])),
      );
    }

    if (alreadySelected) return `‘${result.tag.label}’ 태그는 이미 이 상품에 선택되어 있습니다. 상품 저장 버튼을 누르면 연결이 확정됩니다.`;
    return result.created
      ? `‘${result.tag.label}’ 태그를 공용 목록에 등록하고 이 상품에 선택했습니다. 상품 저장 버튼을 누르면 연결이 확정됩니다.`
      : `이미 등록된 ‘${result.tag.label}’ 태그를 이 상품에 선택했습니다. 상품 저장 버튼을 누르면 연결이 확정됩니다.`;
  };

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title={isEdit ? '상품 수정' : '새 상품 등록'}
        description={
          isEdit
            ? '기본 정보·가격·옵션·상세 정보·배송 안내를 수정합니다. 노출·추천·베스트는 상품 진열에서만 관리합니다.'
            : '새 상품 정보를 등록합니다. 등록 직후에는 숨김 상태이며, 검수 후 상품 진열에서 노출합니다.'
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
          <SectionCard
            title="기본 정보"
            description="각 입력칸 아래에서 고객 화면의 정확한 반영 위치를 확인할 수 있습니다. 고객 화면에 표시되지 않는 내부 입력칸은 두지 않습니다."
          >
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
                    value={formData.categorySlug || formData.category || ''}
                    onChange={(e) => {
                      handleChange('category', e.target.value);
                      handleChange('categorySlug', e.target.value);
                      handleChange('lifestyleCategory', e.target.value);
                    }}
                    onBlur={() => handleBlur('category')}
                    aria-invalid={!!fieldErrors.category}
                    aria-describedby={fieldErrors.category ? 'product-category-error' : undefined}
                    className={INPUT_CLASS}
                  >
                    <option value="">카테고리 선택</option>
                    {categorySettings.productCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <div>
                <FormField label="반려동물" htmlFor="product-pet-type" description="상품 카테고리 관리 → 반려동물 필터에서 항목을 추가하거나 순서를 바꿀 수 있습니다.">
                  <select
                    id="product-pet-type"
                    value={formData.petType || 'both'}
                    onChange={(e) => handleChange('petType', e.target.value)}
                    className={INPUT_CLASS}
                  >
                    <option value="both">강아지·고양이 공용</option>
                    {categorySettings.petTypes.map((petType) => (
                      <option key={petType.id} value={petType.id}>{petType.label} 전용</option>
                    ))}
                  </select>
                </FormField>
              </div>

              <FormField
                label="상품 상세 → 상품 이야기 첫 설명"
                description="표시 위치: 고객 상품 상세 → 상품 정보 탭 → ‘상품 이야기’ → ‘일상에서 이렇게 만나보세요.’ 제목 바로 아래입니다. 상품 카드에는 표시되지 않습니다."
              >
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => handleChange('description', e.target.value)}
                  className={`${INPUT_CLASS} h-24 resize-none`}
                  placeholder="예: 산책 후 발과 털을 부드럽게 관리하는 데일리 케어 상품입니다."
                />
                {isEdit && initialData?.id && (
                  <a
                    href={`/shop/${initialData.id}#story`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex min-h-10 items-center border border-[#D1D0C8] bg-white px-3 text-xs font-semibold text-[#2F3B34] hover:bg-[#F3EEE6]"
                  >
                    고객 화면에서 이 위치 확인
                  </a>
                )}
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
          </SectionCard>

          {/* 상품 옵션 */}
          <SectionCard
            title="상품 옵션"
            description="옵션을 추가하면 구매 화면에 선택 목록으로 노출됩니다. 이름이 빈 행은 저장되지 않습니다."
          >
            <OptionEditor rows={optionRows} onChange={setOptionRows} />
          </SectionCard>

          {/* 공개 화면 연결 */}
          <SectionCard
            title="공개 화면 연결"
            description="실제 고객 화면에 연결되는 항목만 관리합니다."
          >
            <div className="space-y-4">
              <FormField
                label="상품 카드에 보이는 고민 태그"
                description="홈·스토어·브랜드의 상품 카드에서 가격 아래 둥근 배지로 보입니다. 배변·생활·피부 같은 단어를 선택합니다. 기존 태그는 빠른 선택으로 고르고, 목록에 없으면 바로 아래에서 새 태그를 등록하면 이 상품에도 자동 선택됩니다."
              >
                <ArrayEditor
                  items={concernTags}
                  onChange={(next) => handleChange('concernTags', next)}
                  addLabel="태그 선택칸 추가"
                  itemLabel="고민 태그"
                  placeholder="아래 빠른 선택에서 고르거나 직접 입력"
                  suggestions={productTagSuggestions}
                  onCreateSuggestion={handleCreateConcernTag}
                  maxItems={50}
                />
                <a
                  href="/admin/products/tags"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex min-h-10 items-center border border-[#D1D0C8] bg-white px-3 text-xs font-semibold text-[#2F3B34] hover:bg-[#F3EEE6]"
                >
                  전체 태그 이름 수정·삭제·순서 변경
                </a>
              </FormField>
              <FormField
                label="전문가 콘텐츠 연결"
                description="‘전체 화면 공통 영역’에서 전문가 칼럼을 켜고 게시한 경우에만 고객 화면에 사용됩니다. 이 상품을 보여줄 관점을 선택하며, 상품 자체의 공개 여부와 추천 상태는 ‘상품 진열’에서 따로 켜야 합니다."
              >
                <div className="grid gap-2 sm:grid-cols-3">
                  {([
                    ['veterinary', '수의사 관점'],
                    ['nutrition', '영양 관점'],
                    ['lifestyle', '행동·생활 관점'],
                  ] as const).map(([value, label]) => (
                    <label key={value} className="flex items-start gap-3 rounded border border-gray-200 bg-white p-4 text-[14px] text-[#17201B]">
                      <input
                        type="checkbox"
                        checked={recommendedFor.includes(value)}
                        onChange={(event) =>
                          handleChange(
                            'recommendedFor',
                            event.target.checked
                              ? Array.from(new Set([...recommendedFor, value]))
                              : recommendedFor.filter((item) => item !== value),
                          )
                        }
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#17201B] focus:ring-[#17201B]"
                      />
                      <span>
                        <span className="block font-medium">{label}</span>
                        <span className="mt-1 block text-[12px] leading-5 text-[#68756D]">연결 화면: /experts</span>
                      </span>
                    </label>
                  ))}
                </div>
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
            description="상세 상단 갤러리용 이미지입니다. 이미지와 텍스트를 섞은 본문은 상세페이지 편집에서 구성합니다."
          >
            <GalleryEditor
              images={images}
              onChange={(next) => handleChange('images', next)}
              entityId={isEdit ? initialData.id : undefined}
              draftId={!isEdit ? draftId : undefined}
            />
            {isEdit && (
              <button
                type="button"
                onClick={() => router.push(`/admin/products/${initialData.id}/editor`)}
                className="mt-4 flex h-11 w-full items-center justify-center rounded border border-[#17201B] bg-white text-[13px] font-semibold text-[#17201B] transition-colors hover:bg-[#F4F2EC]"
              >
                상세페이지 본문 편집하기
              </button>
            )}
          </SectionCard>

          {/* 관리 작업 */}
          {isEdit && (
            <div className="bg-white border border-red-200 rounded-md p-6">
              <h3 className="text-[15px] font-semibold text-red-600 mb-2">위험 영역</h3>
              <p className="text-[12px] text-gray-500 mb-4">
                상품을 삭제하면 복구할 수 없으며 주문 내역 등에서 문제가 발생할 수 있습니다. 삭제 대신 상품
                진열에서 스토어 노출을 숨김 처리하는 것을 권장합니다.
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

/** 상품 카드 고민 태그 목록 편집기. append/remove만, 재정렬 없음(인덱스 key 안정). */
function ArrayEditor({
  items,
  onChange,
  placeholder,
  addLabel,
  itemLabel,
  maxItems,
  suggestions,
  onCreateSuggestion,
}: {
  items: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  addLabel: string;
  itemLabel?: string;
  maxItems?: number;
  suggestions?: ReadonlyArray<{ value: string; label: string }>;
  onCreateSuggestion?: (label: string) => Promise<string>;
}) {
  const [newSuggestionLabel, setNewSuggestionLabel] = useState('');
  const [isCreatingSuggestion, setIsCreatingSuggestion] = useState(false);
  const [suggestionFeedback, setSuggestionFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const update = (idx: number, value: string) => {
    onChange(items.map((item, i) => (i === idx ? value : item)));
  };
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));
  const add = () => onChange([...items, '']);

  const atMax = maxItems !== undefined && items.length >= maxItems;
  const lastEmpty = items.length > 0 && items[items.length - 1].trim() === '';
  const addDisabled = atMax || lastEmpty;

  const createSuggestion = async () => {
    const label = newSuggestionLabel.trim();
    if (!label) {
      setSuggestionFeedback({ kind: 'error', text: '새 태그 이름을 입력해 주세요.' });
      return;
    }
    if (!onCreateSuggestion || isCreatingSuggestion || atMax) return;

    setIsCreatingSuggestion(true);
    setSuggestionFeedback(null);
    try {
      const message = await onCreateSuggestion(label);
      setNewSuggestionLabel('');
      setSuggestionFeedback({ kind: 'success', text: message });
    } catch (error) {
      setSuggestionFeedback({
        kind: 'error',
        text: error instanceof Error ? error.message : '태그를 등록하지 못했습니다.',
      });
    } finally {
      setIsCreatingSuggestion(false);
    }
  };

  return (
    <div className="space-y-2">
      {suggestions?.length ? (
        <div className="rounded border border-[#D7DCD7] bg-[#F7F8F5] p-3">
          <p className="mb-2 text-[12px] font-medium text-[#59615B]">빠른 선택</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => {
              const selected = items.includes(suggestion.value);
              return (
                <button
                  key={suggestion.value}
                  type="button"
                  disabled={selected || atMax}
                  onClick={() => onChange([...items.filter((item) => item.trim()), suggestion.value])}
                  className={`min-h-10 rounded-full border px-3 text-[12px] font-medium transition-colors ${
                    selected
                      ? 'border-[#17201B] bg-[#17201B] text-white'
                      : 'border-[#C9CEC9] bg-white text-[#3F4942] hover:border-[#17201B]'
                  } disabled:cursor-default`}
                >
                  {selected ? '✓ ' : '+ '}{suggestion.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      {onCreateSuggestion ? (
        <div className="rounded border border-[#D7DCD7] bg-white p-4">
          <label htmlFor="new-product-tag" className="block text-[13px] font-semibold text-[#17201B]">
            목록에 없는 새 태그 등록
          </label>
          <p className="mt-1 text-[12px] leading-5 text-[#68756D]">
            고객에게 보일 이름만 입력하세요. 등록하면 공용 태그 목록에 저장되고 이 상품에도 바로 선택됩니다.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              id="new-product-tag"
              type="text"
              maxLength={50}
              value={newSuggestionLabel}
              onChange={(event) => {
                setNewSuggestionLabel(event.target.value);
                if (suggestionFeedback) setSuggestionFeedback(null);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void createSuggestion();
                }
              }}
              className={INPUT_CLASS}
              placeholder="예: 알레르기"
              aria-describedby="new-product-tag-help"
            />
            <button
              type="button"
              onClick={() => void createSuggestion()}
              disabled={isCreatingSuggestion || atMax || !newSuggestionLabel.trim()}
              className="min-h-10 shrink-0 rounded bg-[#17201B] px-4 text-[13px] font-semibold text-white hover:bg-[#2A3630] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isCreatingSuggestion ? '등록 중…' : '등록하고 이 상품에 선택'}
            </button>
          </div>
          <p id="new-product-tag-help" className="mt-2 text-[12px] text-[#68756D]">
            새 태그는 공용 목록에 즉시 저장됩니다. 이 상품과의 연결은 화면 아래 상품 저장 버튼을 눌러야 확정됩니다. 스토어 필터 노출 여부는 아래 전체 태그 관리에서 정합니다.
          </p>
          {suggestionFeedback && (
            <p
              role={suggestionFeedback.kind === 'error' ? 'alert' : 'status'}
              className={`mt-2 text-[12px] font-medium ${
                suggestionFeedback.kind === 'error' ? 'text-red-600' : 'text-emerald-700'
              }`}
            >
              {suggestionFeedback.text}
            </p>
          )}
        </div>
      ) : null}
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2">
          {suggestions?.length ? (
            <select
              value={item}
              onChange={(event) => update(idx, event.target.value)}
              className={INPUT_CLASS}
              aria-label={itemLabel ? `${itemLabel} ${idx + 1}` : undefined}
            >
              <option value="">고민을 선택해 주세요</option>
              {suggestions.map((suggestion) => (
                <option key={suggestion.value} value={suggestion.value}>{suggestion.label}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={item}
              onChange={(e) => update(idx, e.target.value)}
              className={INPUT_CLASS}
              placeholder={placeholder}
              aria-label={itemLabel ? `${itemLabel} ${idx + 1}` : undefined}
            />
          )}
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
