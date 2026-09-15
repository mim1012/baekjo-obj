'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowUp, ArrowDown, Trash2, Plus, X } from 'lucide-react';
import type { Product, Brand, Seller } from '@/types';
import { createAdminProductTag, createProduct, updateProduct, deleteProduct } from '@/lib/storage';
import {
  buildProductCreatePayload,
  buildProductUpdatePayload,
  type ProductFormState,
  type ProductOptionFormState,
} from '@/lib/products/formPayload';
import { useCategorySettings } from '@/components/providers/CategorySettingsProvider';
import { parseProductPetTypes, serializeProductPetTypes } from '@/lib/products/petTypes';
import { moveImage, normalizeImageOrder, setRepresentative } from '@/lib/products/imageOrder';
import type { ProductTagDefinition } from '@/lib/productTags/config';
import {
  disclosureDefinition,
  EMPTY_MADE_TO_ORDER_POLICY,
  isDisclosureComplete,
  PRODUCT_DISCLOSURE_CATEGORIES,
  PRODUCT_DISCLOSURE_SCHEMA_VERSION,
} from '@/lib/products/disclosures';

import PageHeader from '@/components/admin-new/common/PageHeader';
import FormField from '@/components/admin-new/common/FormField';
import SaveBar from '@/components/admin-new/common/SaveBar';
import ImageUploader from '@/components/admin-new/common/ImageUploader';

interface ProductFormProps {
  initialData?: Product | null;
  brands: Brand[];
  productTags: ProductTagDefinition[];
  sellers: Seller[];
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
    case 'product-compliance-incomplete':
      return '공개 상품은 검증 완료 판매자와 상품군별 필수정보를 모두 입력해야 합니다.';
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

interface SelectionCardGridProps {
  options: readonly string[];
  value: string | undefined;
  onChange: (value: string) => void;
  ariaLabel: string;
}

function SelectionCardGrid({ options, value, onChange, ariaLabel }: SelectionCardGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label={ariaLabel}>
      {options.map((option) => {
        const selected = option === value;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option)}
            className={`min-h-11 border px-3 py-2 text-left text-sm transition-colors ${
              selected
                ? 'border-[#2F3B34] bg-[#EDF0EC] font-semibold text-[#17201B]'
                : 'border-[#D1D0C8] bg-white text-[#59615B] hover:border-[#68776C] hover:bg-[#FAF9F5]'
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

/** initialData.options(숫자) → 폼 상태(문자열). 편집 중 빈칸/부분입력을 허용하려고 문자열로 든다. */
function toOptionRows(product?: Product | null): ProductOptionFormState[] {
  return (product?.options ?? []).map((o) => ({
    id: o.id,
    name: o.name,
    price: String(o.price),
    stock: String(o.stock),
  }));
}

export default function ProductForm({ initialData, brands, productTags, sellers }: ProductFormProps) {
  const router = useRouter();
  const { categorySettings } = useCategorySettings();
  const [tags, setTags] = useState<ProductTagDefinition[]>(productTags);
  const [newTagLabel, setNewTagLabel] = useState('');
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [tagFeedback, setTagFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const isEdit = !!initialData;
  const [draftId] = useState(() =>
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 15),
  );

  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    brandId: '',
    sellerId: '',
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
    ingredients: '',
    howToUse: '',
    deliveryEstimate: '',
    shippingNotice: '',
    returnNotice: '',
    sellerName: '',
    disclosure: {
      categoryCode: '',
      schemaVersion: PRODUCT_DISCLOSURE_SCHEMA_VERSION,
      values: {},
    },
    madeToOrderPolicy: EMPTY_MADE_TO_ORDER_POLICY,
    images: [],
    auditPoints: [],
    concernTags: [],
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

  // 반려동물 다중 선택. categorySettings.petTypes(관리자 설정)를 선택 목록으로 쓰고, 이미 저장된
  // 값이 그 목록 밖(설정에서 지워진 id 등)이면 "카테고리 목록에 없음" 항목으로 덧붙여 선택을
  // 잃지 않게 한다. 선택값은 항상 serializeProductPetTypes로 즉시 직렬화해 formData.petType(단일
  // 문자열)에 저장하므로 formPayload/validate는 이 필드를 그대로 문자열 하나로만 다룬다.
  const selectedPetTypeIds = parseProductPetTypes(formData.petType);
  const knownPetTypeIds = new Set(categorySettings.petTypes.map((item) => item.id));
  const selectablePetTypes = [
    ...categorySettings.petTypes,
    ...selectedPetTypeIds
      .filter((id) => !knownPetTypeIds.has(id))
      .map((id) => ({ id, label: `${id} (카테고리 목록에 없음)` })),
  ];

  const togglePetType = (id: string, checked: boolean) => {
    const selected = new Set(selectedPetTypeIds);
    if (checked) selected.add(id);
    else selected.delete(id);
    const ordered = selectablePetTypes.filter((item) => selected.has(item.id)).map((item) => item.id);
    handleChange('petType', serializeProductPetTypes(ordered));
  };

  /** formData(+옵션 상태)를 순수 payload 빌더가 받는 ProductFormState 로 모은다. */
  const toFormState = (): ProductFormState => ({
    name: formData.name,
    brandId: formData.brandId,
    sellerId: formData.sellerId,
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
    auditPoints: formData.auditPoints ?? [],
    concernTags: formData.concernTags ?? [],
    ingredients: formData.ingredients,
    howToUse: formData.howToUse,
    recommendedFor: formData.recommendedFor ?? [],
    caution: formData.caution ?? [],
    shippingFee: formData.shippingFee ?? null,
    deliveryEstimate: formData.deliveryEstimate,
    shippingNotice: formData.shippingNotice,
    returnNotice: formData.returnNotice,
    sellerName: formData.sellerName,
    disclosure: formData.disclosure,
    madeToOrderPolicy: formData.madeToOrderPolicy,
    isVisible: formData.isVisible,
    isBest: formData.isBest,
    isRecommended: formData.isRecommended,
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

    if (formData.isVisible) {
      const seller = sellers.find((candidate) => candidate.id === formData.sellerId);
      if (!seller || seller.status !== 'verified' || !isDisclosureComplete(formData.disclosure)) {
        setError('스토어에 공개하려면 검증 완료 판매자를 선택하고 상품군별 필수정보를 모두 입력해주세요.');
        return;
      }
    }

    setIsSaving(true);
    setError(null);

    try {
      const brandName = brands.find((b) => b.id === formData.brandId)?.name;
      const formState = toFormState();
      formState.sellerName = sellers.find((seller) => seller.id === formData.sellerId)?.displayName ?? '';

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
  const orderedImages = normalizeImageOrder(formData.image, images);
  const auditPoints = formData.auditPoints ?? [];
  const concernTags = formData.concernTags ?? [];
  const recommendedFor = formData.recommendedFor ?? [];
  const caution = formData.caution ?? [];
  const selectedBrand = brands.find((brand) => brand.id === formData.brandId);
  const selectedSeller = sellers.find((seller) => seller.id === formData.sellerId);

  const handleOrderedImagesChange = (next: string[]) => {
    const imageFields = setRepresentative(next, 0); // index<=0 → 승격 없이 순수 분리(ordered[0]→image)
    setFormData((prev) => ({ ...prev, ...imageFields }));
    if (fieldErrors.image && imageFields.image.trim()) {
      setFieldErrors((prev) => {
        const nextErrors = { ...prev };
        delete nextErrors.image;
        return nextErrors;
      });
    }
  };

  // 고민 태그 선택칸. 고객에게 보이는(isVisible) 태그만 빠른 선택으로 노출하고, 이 상품에 이미
  // 연결된 값이 그 목록 밖(숨김 처리됐거나 사전에 없는 값)이면 라벨을 최대한 찾아 덧붙여 보여준다
  // — petType 의 "카테고리 목록에 없음" 처리와 동일한 원칙(선택을 조용히 잃지 않는다).
  const visibleTagOptions = tags.filter((tag) => tag.isVisible);
  const tagLabelBySlug = new Map(tags.map((tag) => [tag.slug, tag.label] as const));
  const knownVisibleTagSlugs = new Set(visibleTagOptions.map((tag) => tag.slug));
  const selectableTags = [
    ...visibleTagOptions,
    ...concernTags
      .filter((slug) => !knownVisibleTagSlugs.has(slug))
      .map((slug) => ({
        slug,
        label: tagLabelBySlug.get(slug) ?? slug,
        isVisible: false,
        showInShopFilter: false,
      })),
  ];

  const toggleConcernTag = (slug: string, checked: boolean) => {
    handleChange('concernTags', checked ? [...concernTags, slug] : concernTags.filter((item) => item !== slug));
  };

  const handleCreateConcernTag = async () => {
    const label = newTagLabel.trim();
    if (!label) {
      setTagFeedback({ kind: 'error', text: '새 태그 이름을 입력해주세요.' });
      return;
    }
    setIsCreatingTag(true);
    setTagFeedback(null);
    try {
      const result = await createAdminProductTag(label);
      if (!result.ok || !result.tag) {
        const message =
          result.error === 'persistence-not-ready'
            ? '태그 저장용 DB가 아직 적용되지 않았습니다. DB 적용 후 다시 시도해주세요.'
            : result.error === 'invalid-input'
              ? '태그 이름은 1자 이상 50자 이하로 입력해주세요.'
              : result.error === 'unauthorized' || result.error === 'forbidden'
                ? '관리자 권한을 확인한 뒤 다시 시도해주세요.'
                : '태그를 등록하지 못했습니다. 잠시 후 다시 시도해주세요.';
        setTagFeedback({ kind: 'error', text: message });
        return;
      }

      const tag = result.tag;
      setTags((prev) => (prev.some((item) => item.slug === tag.slug) ? prev : [...prev, tag]));
      const alreadySelected = concernTags.includes(tag.slug);
      if (!alreadySelected) {
        handleChange('concernTags', [...concernTags, tag.slug]);
      }
      setNewTagLabel('');
      setTagFeedback({
        kind: 'success',
        text: alreadySelected
          ? `'${tag.label}' 태그는 이미 이 상품에 선택되어 있습니다. 상품 저장 버튼을 누르면 연결이 확정됩니다.`
          : result.created
            ? `'${tag.label}' 태그를 공용 목록에 등록하고 이 상품에 선택했습니다. 상품 저장 버튼을 누르면 연결이 확정됩니다.`
            : `이미 등록된 '${tag.label}' 태그를 이 상품에 선택했습니다. 상품 저장 버튼을 누르면 연결이 확정됩니다.`,
      });
    } catch {
      setTagFeedback({ kind: 'error', text: '태그를 등록하지 못했습니다. 잠시 후 다시 시도해주세요.' });
    } finally {
      setIsCreatingTag(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title={isEdit ? '상품 수정' : '새 상품 등록'}
        description={
          isEdit
            ? '실제 판매자·기본 정보·가격·옵션·상세 정보·배송 안내를 상품별로 수정합니다.'
            : '새 상품의 실제 판매자와 기본 정보, 상세페이지 노출 항목을 등록합니다.'
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
          <div id="product-brand-link" className="scroll-mt-24">
            <SectionCard
              title="상품 브랜드 연결"
              description="이 상품이 속한 브랜드를 선택합니다. 고객이 상품 카드의 BEST 옆 ‘자체 큐레이션 · 기준 보기’를 누르면 선택한 브랜드의 검토 기준으로 이동합니다."
            >
              <div className="space-y-4">
                <FormField label="이 상품의 브랜드" htmlFor="product-brand" required error={fieldErrors.brandId}>
                  <select
                    id="product-brand"
                    value={formData.brandId || ''}
                    onChange={(event) => handleChange('brandId', event.target.value)}
                    onBlur={() => handleBlur('brandId')}
                    aria-invalid={!!fieldErrors.brandId}
                    aria-describedby={fieldErrors.brandId ? 'product-brand-error' : undefined}
                    className={INPUT_CLASS}
                  >
                    <option value="">브랜드 선택</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </FormField>

                {selectedBrand ? (
                  <div className="rounded-md border border-[#DCE5DD] bg-[#F5F8F5] p-4 text-sm text-[#39463E]">
                    <p className="font-semibold text-[#17201B]">현재 연결 브랜드: {selectedBrand.name}</p>
                    <p className="mt-1 text-xs leading-5 text-[#68756C]">
                      저장 후 고객 상품카드의 큐레이션 기준 버튼이 이 브랜드 상세로 연결됩니다.
                    </p>
                  </div>
                ) : (
                  <p className="rounded-md border border-[#E8CF9E] bg-[#FFF9EC] p-3 text-sm text-[#7A4E1D]">
                    브랜드를 선택해야 상품을 저장하고 브랜드별 큐레이션 기준을 연결할 수 있습니다.
                  </p>
                )}
              </div>
            </SectionCard>
          </div>

          <div id="actual-seller" className="scroll-mt-24">
            <SectionCard
              title="실제 판매자 연결"
              description="이 상품의 판매 계약·배송·교환·반품을 책임지는 사업자를 선택합니다. 상품마다 서로 다른 판매자를 지정할 수 있습니다."
            >
              <div className="space-y-4">
                <FormField label="이 상품의 실제 판매자" htmlFor="product-seller" required>
                  <select
                    id="product-seller"
                    value={formData.sellerId ?? ''}
                    onChange={(event) => handleChange('sellerId', event.target.value)}
                    className={INPUT_CLASS}
                  >
                    <option value="" disabled>판매자 선택</option>
                    {sellers.map((seller) => (
                      <option key={seller.id} value={seller.id}>
                        {seller.displayName} · {seller.status === 'verified' ? '검증 완료' : seller.status === 'draft' ? '작성 중' : '판매 중지'}
                      </option>
                    ))}
                  </select>
                </FormField>

                {selectedSeller ? (
                  <div className="rounded-md border border-[#DCE5DD] bg-[#F5F8F5] p-4 text-sm text-[#39463E]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-[#17201B]">현재 연결: {selectedSeller.displayName}</p>
                        <p className="mt-1 text-xs text-[#68756C]">
                          {selectedSeller.legalName} · 사업자번호 {selectedSeller.businessRegistrationNumber}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${selectedSeller.status === 'verified' ? 'bg-[#E1EEE3] text-[#286138]' : selectedSeller.status === 'draft' ? 'bg-[#FFF2D8] text-[#8A5A10]' : 'bg-[#F8E2E2] text-[#9A3838]'}`}>
                        {selectedSeller.status === 'verified' ? '검증 완료' : selectedSeller.status === 'draft' ? '작성 중' : '판매 중지'}
                      </span>
                    </div>
                    {selectedSeller.status !== 'verified' && (
                      <p className="mt-3 text-xs font-medium text-[#8A5A10]">스토어에 공개하려면 판매자 관리에서 이 판매자를 검증 완료 상태로 바꿔야 합니다.</p>
                    )}
                  </div>
                ) : (
                  <p className="rounded-md border border-[#E8CF9E] bg-[#FFF9EC] p-3 text-sm text-[#7A4E1D]">
                    실제 판매자가 아직 지정되지 않았습니다. 스토어에 공개하기 전에 반드시 선택해주세요.
                  </p>
                )}

                <Link href="/admin/sellers" className="inline-flex text-sm font-semibold text-[#9A5B20] underline underline-offset-4">
                  판매자 정보 등록·수정하기
                </Link>
              </div>
            </SectionCard>
          </div>

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

              <FormField label="스토어 카테고리" htmlFor="product-category" required error={fieldErrors.category}>
                <SelectionCardGrid
                  options={categorySettings.productCategories}
                  value={formData.category}
                  onChange={(value) => handleChange('category', value)}
                  ariaLabel="스토어 카테고리 선택"
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="반려동물">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="반려동물 선택">
                    {selectablePetTypes.map((petType) => {
                      const checked = selectedPetTypeIds.includes(petType.id);
                      return (
                        <label
                          key={petType.id}
                          className={`flex min-h-11 items-center gap-2 border px-3 py-2 text-sm transition-colors ${
                            checked
                              ? 'border-[#2F3B34] bg-[#EDF0EC] font-semibold text-[#17201B]'
                              : 'border-[#D1D0C8] bg-white text-[#59615B] hover:border-[#68776C] hover:bg-[#FAF9F5]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => togglePetType(petType.id, event.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-[#17201B] focus:ring-[#17201B]"
                          />
                          <span>{petType.label}</span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-[12px] text-[#8A918B]">현재 {selectedPetTypeIds.length}개 선택</p>
                </FormField>

                <FormField label="라이프스타일 분류" htmlFor="product-lifestyle" required error={fieldErrors.lifestyleCategory}>
                  <SelectionCardGrid
                    options={categorySettings.lifestyleCategories}
                    value={formData.lifestyleCategory}
                    onChange={(value) => handleChange('lifestyleCategory', value)}
                    ariaLabel="라이프스타일 분류 선택"
                  />
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
              <FormField label="상품 검증 포인트">
                <ArrayEditor
                  items={auditPoints}
                  onChange={(next) => handleChange('auditPoints', next)}
                  addLabel="검증 포인트 추가"
                  itemLabel="검증 포인트"
                  placeholder="예: 원료 출처와 제조 정보를 확인했어요"
                  maxItems={50}
                />
              </FormField>
              <FormField
                label="상품 카드에 보이는 고민 태그"
                description="홈·스토어·브랜드의 상품 카드에서 가격 아래 둥근 배지로 보입니다. 기존 태그는 아래에서 바로 선택하고, 목록에 없으면 새 태그를 등록하면 이 상품에도 자동 선택됩니다."
              >
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {selectableTags.map((tag) => {
                    const selected = concernTags.includes(tag.slug);
                    return (
                      <button
                        key={tag.slug}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggleConcernTag(tag.slug, !selected)}
                        className={`min-h-11 border px-3 py-2 text-left text-sm transition-colors ${
                          selected
                            ? 'border-[#2F3B34] bg-[#EDF0EC] font-semibold text-[#17201B]'
                            : 'border-[#D1D0C8] bg-white text-[#59615B] hover:border-[#68776C] hover:bg-[#FAF9F5]'
                        }`}
                      >
                        {selected ? '✓ ' : '+ '}{tag.label}
                      </button>
                    );
                  })}
                </div>
                {selectableTags.length === 0 && (
                  <p className="text-sm text-[#8A918B]">등록된 태그가 없습니다. 아래에서 새 태그를 등록해주세요.</p>
                )}

                <div className="mt-3 rounded border border-[#D7DCD7] bg-white p-4">
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
                      value={newTagLabel}
                      onChange={(event) => {
                        setNewTagLabel(event.target.value);
                        if (tagFeedback) setTagFeedback(null);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          void handleCreateConcernTag();
                        }
                      }}
                      className={INPUT_CLASS}
                      placeholder="예: 알레르기"
                    />
                    <button
                      type="button"
                      onClick={() => void handleCreateConcernTag()}
                      disabled={isCreatingTag || !newTagLabel.trim()}
                      className="min-h-10 shrink-0 rounded bg-[#17201B] px-4 text-[13px] font-semibold text-white hover:bg-[#2A3630] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {isCreatingTag ? '등록 중…' : '등록하고 이 상품에 선택'}
                    </button>
                  </div>
                  {tagFeedback && (
                    <p
                      role={tagFeedback.kind === 'error' ? 'alert' : 'status'}
                      className={`mt-2 text-[12px] font-medium ${
                        tagFeedback.kind === 'error' ? 'text-red-600' : 'text-emerald-700'
                      }`}
                    >
                      {tagFeedback.text}
                    </p>
                  )}
                </div>
                <Link
                  href="/admin/products/tags"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex min-h-10 items-center border border-[#D1D0C8] bg-white px-3 text-xs font-semibold text-[#2F3B34] hover:bg-[#F3EEE6]"
                >
                  전체 태그 이름 수정·삭제·순서 변경
                </Link>
              </FormField>
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

          {/* 상품정보제공고시 */}
          <SectionCard title="상품군별 필수정보" description="상품군을 고르면 고객에게 반드시 보여야 할 항목이 나타납니다. 공개 전 모든 항목을 채워야 합니다.">
            <div className="space-y-4">
              <FormField label="상품군" htmlFor="product-disclosure-category" required>
                <select
                  id="product-disclosure-category"
                  value={formData.disclosure?.categoryCode ?? ''}
                  onChange={(event) => handleChange('disclosure', {
                    categoryCode: event.target.value,
                    schemaVersion: PRODUCT_DISCLOSURE_SCHEMA_VERSION,
                    values: {},
                  })}
                  className={INPUT_CLASS}
                >
                  <option value="">상품군 선택</option>
                  {PRODUCT_DISCLOSURE_CATEGORIES.map((category) => <option key={category.code} value={category.code}>{category.label}</option>)}
                </select>
              </FormField>
              {disclosureDefinition(formData.disclosure?.categoryCode)?.fields.map((field) => (
                <FormField key={field.key} label={field.label} htmlFor={`product-disclosure-${field.key}`} required>
                  <textarea
                    id={`product-disclosure-${field.key}`}
                    value={formData.disclosure?.values[field.key] ?? ''}
                    onChange={(event) => handleChange('disclosure', {
                      categoryCode: formData.disclosure?.categoryCode ?? '',
                      schemaVersion: PRODUCT_DISCLOSURE_SCHEMA_VERSION,
                      values: { ...formData.disclosure?.values, [field.key]: event.target.value },
                    })}
                    className={`${INPUT_CLASS} min-h-20 resize-y`}
                    placeholder={field.placeholder}
                  />
                </FormField>
              ))}
            </div>
          </SectionCard>

          {/* 주문제작 정책 */}
          <SectionCard title="주문제작 정책" description="주문제작 상품이면 켜고 제작·검수·사진 처리 기준을 정확히 입력합니다. 결제 단계에서 별도 동의를 받습니다.">
            <div className="space-y-4">
              <ToggleRow label="주문제작 상품" checked={formData.madeToOrderPolicy?.active ?? false} onChange={(active) => handleChange('madeToOrderPolicy', { ...(formData.madeToOrderPolicy ?? EMPTY_MADE_TO_ORDER_POLICY), active })} />
              {formData.madeToOrderPolicy?.active && ([
                ['productionPeriod', '제작 기간', '예: 결제 완료 후 최대 3개월'],
                ['proofMethod', '시안·제작 확인 방법', '예: 카카오톡 채널로 사진 전달'],
                ['revisionCount', '무상 수정 횟수', '예: 시안 단계 1회'],
                ['revisionScope', '수정 가능 범위', '예: 배치·문구 조정, 제작 시작 후 변경 불가'],
                ['photoPurpose', '사진 이용 목적', '제작 진행 확인 및 완성품 검수'],
                ['photoRetentionPeriod', '사진 보관 기간', '예: 배송 완료 후 30일'],
                ['photoDeletionMethod', '사진 파기 방법', '예: 기간 만료 후 복구 불가능하게 삭제'],
                ['cancellationRestriction', '취소 제한 시점·사유', '예: 고객 시안 승인 또는 제작 시작 후 단순변심 취소 제한'],
              ] as const).map(([key, label, placeholder]) => (
                <FormField key={key} label={label} htmlFor={`product-made-to-order-${key}`} required>
                  <textarea id={`product-made-to-order-${key}`} value={formData.madeToOrderPolicy?.[key] ?? ''} onChange={(event) => handleChange('madeToOrderPolicy', { ...(formData.madeToOrderPolicy ?? EMPTY_MADE_TO_ORDER_POLICY), [key]: event.target.value })} className={`${INPUT_CLASS} min-h-20 resize-y`} placeholder={placeholder} />
                </FormField>
              ))}
            </div>
          </SectionCard>

          {/* 배송 안내 */}
          <SectionCard title="배송 안내" description="상세페이지 하단 구매 정보에 노출됩니다.">
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
                label="BEST · 자체 큐레이션 표시"
                checked={formData.isBest || false}
                onChange={(v) => handleChange('isBest', v)}
              />
              <p className="rounded bg-[#F7F8F6] px-3 py-2 text-xs leading-5 text-[#59615B]">
                켜면 고객 상품카드에 BEST 배지와 선택한 브랜드의 검토 기준으로 가는 ‘자체 큐레이션 · 기준 보기’ 링크가 함께 표시됩니다.
              </p>
            </div>
          </SectionCard>

          {/* 상품 이미지 순서 — 1번이 공개 상품 카드와 상세 첫 화면의 대표 이미지 */}
          <SectionCard
            title="상품 이미지 순서"
            description="1번 사진이 상품 카드와 상품 상세 첫 화면의 대표 이미지입니다. 위·아래 버튼으로 순서를 바꾸거나 원하는 사진을 바로 대표로 지정할 수 있습니다."
          >
            <ProductImageOrderEditor
              images={orderedImages}
              onChange={handleOrderedImagesChange}
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

/**
 * 1번을 대표 이미지로 저장하는 통합 상품 이미지 순서 편집기. ordered[0]이 대표(image), 나머지가
 * 갤러리(images)다 — 상위(ProductForm)가 normalizeImageOrder로 합쳐 넘기고, setRepresentative/
 * moveImage(둘 다 순수 함수, tests/products/product-image-order.spec.ts)로만 순서를 바꾼다.
 */
function ProductImageOrderEditor({
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
  const move = (idx: number, direction: 'up' | 'down') => onChange(moveImage(images, idx, direction));
  const promote = (idx: number) => {
    const fields = setRepresentative(images, idx);
    onChange([fields.image, ...fields.images]);
  };

  const lastEmpty = images.length > 0 && images[images.length - 1].trim() === '';

  return (
    <div className="space-y-3">
      {images.map((img, idx) => (
        <div key={idx} className="rounded-md border border-gray-200 bg-gray-50 p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-gray-800">{idx + 1}번 사진</span>
              {idx === 0 && (
                <span className="rounded-full bg-[#173C32] px-2.5 py-1 text-[11px] font-semibold text-white">
                  대표 이미지
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {idx > 0 && img.trim() && (
                <button
                  type="button"
                  onClick={() => promote(idx)}
                  className="mr-1 min-h-9 rounded border border-[#173C32] bg-white px-3 text-[12px] font-semibold text-[#173C32] hover:bg-[#F1F5F3]"
                >
                  대표로 지정
                </button>
              )}
              <button
                type="button"
                onClick={() => move(idx, 'up')}
                disabled={idx === 0 || !img.trim() || !images[idx - 1]?.trim()}
                aria-label={`${idx + 1}번 이미지 위로 이동`}
                className="inline-flex size-9 items-center justify-center rounded border border-gray-200 bg-white text-gray-600 disabled:opacity-30"
              >
                <ArrowUp size={16} />
              </button>
              <button
                type="button"
                onClick={() => move(idx, 'down')}
                disabled={idx === images.length - 1 || !img.trim() || !images[idx + 1]?.trim()}
                aria-label={`${idx + 1}번 이미지 아래로 이동`}
                className="inline-flex size-9 items-center justify-center rounded border border-gray-200 bg-white text-gray-600 disabled:opacity-30"
              >
                <ArrowDown size={16} />
              </button>
              <button
                type="button"
                onClick={() => remove(idx)}
                aria-label={idx === 0 ? '대표 이미지 삭제' : `갤러리 이미지 ${idx} 삭제`}
                className="inline-flex size-9 items-center justify-center rounded border border-gray-200 bg-white text-gray-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          <ImageUploader
            value={img}
            onChange={(url) => update(idx, url)}
            domain="product"
            usage={idx === 0 ? 'main' : 'detail'}
            entityId={entityId}
            draftId={draftId}
            aspectRatio="1/1"
            height={idx === 0 ? '240px' : '140px'}
            description={idx === 0 ? '정사각형(1:1) 비율, 최소 600x600px 권장' : undefined}
          />
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
