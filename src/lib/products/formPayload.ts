// ProductForm 이 실제로 편집하는 필드만 서버로 보내기 위한 순수 페이로드 빌더.
// React 컴포넌트에서 분리해 단위 테스트(tests/products/form-payload.spec.ts)가 브라우저 없이
// payload 형태를 직접 검증할 수 있게 한다. BrandForm 의 formPayload.ts 와 같은 계약 원칙:
// `...formData` 암묵 스프레드 금지 — 폼이 편집 UI 를 가진 필드만 명시 화이트리스트로 담는다.
import type { Product, ProductOption } from '@/types';
import type { CreateProductInput, UpdateProductInput } from '@/lib/storage';

/**
 * ProductForm 이 편집 UI 를 가진 필드 화이트리스트(문서·테스트용).
 * 이 밖의 필드(detailBlocks·rating·reviewCount·concernTags 등)는 폼이 건드리지 않으므로
 * payload 에 담지 않는다 → updateProduct 가 read-modify-write 라 기존 값이 보존된다.
 * detailBlocks 는 별도 화면(ProductDetailEditor)이 소유하므로 여기서 절대 재전송하지 않는다.
 */
export const PRODUCT_FORM_FIELDS = [
  'name',
  'brandId',
  'brandName',
  'category',
  'lifestyleCategory',
  'petType',
  'summary',
  'description',
  'price',
  'salePrice',
  'stock',
  'image',
  'images',
  'options',
  'ingredients',
  'howToUse',
  'recommendedFor',
  'caution',
  'shippingFee',
  'deliveryEstimate',
  'shippingNotice',
  'returnNotice',
  'sellerName',
  'isMembersOnlyPrice',
  'isVisible',
  'isBest',
  'isRecommended',
] as const;

/** 옵션 하위 폼 상태. 값은 문자열(입력 그대로)로 들고 payload 단계에서 정규화한다. */
export interface ProductOptionFormState {
  id?: string;
  name: string;
  price: string;
  stock: string;
}

/** 문자열 배열에서 공백 항목을 제거해 실제 입력된 값만 남긴다(추천대상·주의사항·이미지 갤러리). */
function cleanStringList(items: string[]): string[] {
  return items.map((s) => s.trim()).filter((s) => s.length > 0);
}

/**
 * 옵션 폼 행 → ProductOption[]. name 이 비었거나 price/stock 이 숫자가 아니면 그 행은 버린다
 * (빈 옵션 행이 저장돼 구매 화면에 "이름 없는 옵션"이 뜨는 것을 막는다). id 는 기존 값을 쓰되
 * 없으면(신규 행) 안정적인 값을 부여한다 — 저장 후 재로드해도 같은 id 를 유지하기 위해서다.
 */
export function normalizeOptions(rows: ProductOptionFormState[]): ProductOption[] {
  const out: ProductOption[] = [];
  for (const row of rows) {
    const name = row.name.trim();
    if (name.length === 0) continue;
    const price = Number(row.price);
    const stock = Number(row.stock);
    if (!Number.isFinite(price) || price < 0) continue;
    if (!Number.isFinite(stock) || stock < 0 || !Number.isInteger(stock)) continue;
    out.push({
      id: (row.id ?? '').trim() || `opt-${out.length + 1}`,
      name,
      price,
      stock,
    });
  }
  return out;
}

/** 상세 폼의 편집 가능한 전체 상태(기본 + 봉인 해제 필드). */
export interface ProductFormState {
  name?: string;
  brandId?: string;
  category?: string;
  lifestyleCategory?: string;
  petType?: Product['petType'];
  ageGroup?: string;
  summary?: string;
  description?: string;
  price?: number | null;
  salePrice?: number | null;
  stock?: number;
  image?: string;
  images: string[];
  options: ProductOptionFormState[];
  ingredients?: string;
  howToUse?: string;
  recommendedFor: string[];
  caution: string[];
  shippingFee?: number | null;
  deliveryEstimate?: string;
  shippingNotice?: string;
  returnNotice?: string;
  sellerName?: string;
  isMembersOnlyPrice?: boolean;
  isVisible?: boolean;
  isBest?: boolean;
  isRecommended?: boolean;
}

/**
 * 폼 상태에서 편집 가능한 봉인 해제 필드만 공통으로 담는다(create/update 공유).
 * - 배열(images·recommendedFor·caution)은 새 배열로 복사하고 공백 항목을 제거한다.
 * - options 는 normalizeOptions 로 유효 행만 남긴다.
 * - 텍스트(ingredients·howToUse·배송/판매자 안내)는 trim 해 담되 빈 문자열도 그대로 실어
 *   **지우기**를 지원한다(BrandForm officialUrl 과 동일 규칙). 서버 validate 가 빈 문자열을
 *   허용하고 splitProductInput 이 ''(≠undefined)를 detail 에 써 기존 값을 덮으므로 실제로 지워진다.
 * - salePrice 0 은 null 로(할인 없음). shippingFee 는 값이 유효할 때만 담는다(미입력=기존값 보존).
 * - isMembersOnlyPrice 는 boolean 으로 항상 담는다.
 */
function buildEditableFields(form: ProductFormState): Partial<Product> {
  const fields: Partial<Product> = {
    name: form.name,
    brandId: form.brandId,
    category: form.category,
    lifestyleCategory: form.lifestyleCategory,
    petType: form.petType,
    summary: form.summary,
    description: form.description,
    price: form.price ?? null,
    salePrice: form.salePrice ? form.salePrice : null,
    stock: form.stock,
    image: form.image,
    images: cleanStringList(form.images),
    options: normalizeOptions(form.options),
    ingredients: form.ingredients?.trim() ?? '',
    howToUse: form.howToUse?.trim() ?? '',
    recommendedFor: cleanStringList(form.recommendedFor),
    caution: cleanStringList(form.caution),
    deliveryEstimate: form.deliveryEstimate?.trim() ?? '',
    shippingNotice: form.shippingNotice?.trim() ?? '',
    returnNotice: form.returnNotice?.trim() ?? '',
    sellerName: form.sellerName?.trim() ?? '',
    isMembersOnlyPrice: form.isMembersOnlyPrice ?? false,
    isVisible: form.isVisible ?? false,
    isBest: form.isBest ?? false,
    isRecommended: form.isRecommended ?? false,
  };

  // shippingFee 는 숫자일 때만 담는다. null/undefined(미입력)면 키를 빼 기존/기본값을 보존한다
  // (validate 가 shippingFee 를 non-null number 로만 받으므로 null 을 실으면 400 이 된다).
  if (typeof form.shippingFee === 'number' && Number.isFinite(form.shippingFee)) {
    fields.shippingFee = form.shippingFee;
  }

  return fields;
}

/**
 * 수정(PATCH) payload. read-modify-write 라 여기 담지 않은 필드(detailBlocks·rating 등)는
 * 서버가 기존 값을 유지한다. brandName 은 선택된 brandId 로부터 파생해 넘긴다.
 */
export function buildProductUpdatePayload(
  form: ProductFormState,
  brandName: string | undefined,
): UpdateProductInput {
  return {
    ...buildEditableFields(form),
    brandName,
  } as UpdateProductInput;
}

/**
 * 생성(POST) payload. 서버가 requireAll=true 로 검증하므로 필수 필드를 명시적으로 채운다.
 * ageGroup 은 폼에 입력 UI 가 없지만 서버 필수라 상태 기본값('all')을 포함한다.
 * rating/reviewCount/concernTags 등 폼에 UI 없는 필수 필드는 서버가 requireAll 기본값을 채운다.
 */
export function buildProductCreatePayload(
  form: ProductFormState,
  brandName: string | undefined,
): CreateProductInput {
  return {
    ...buildEditableFields(form),
    brandName,
    ageGroup: form.ageGroup ?? 'all',
  } as CreateProductInput;
}
