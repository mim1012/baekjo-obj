// 관리자 상품 생성/수정 입력 검증. POST/PATCH 라우트가 공유한다.
// id/createdAt은 여기서 받지 않는다(서버 결정, mass-assignment 차단).
import type { Product, ProductOption } from '@/types';
import type { ProductInsertInput, ProductPatchInput } from '@/lib/products/repo';

const MAX_NAME = 200;
const MAX_SHORT_TEXT = 100;
const MAX_TEXT = 300;
const MAX_LONG_TEXT = 3000;
const MAX_URL = 500;
const MAX_ARRAY_ITEMS = 50;
const MAX_OPTIONS = 50;
const MAX_STOCK = 1_000_000;
const MAX_PRICE = 100_000_000;
const MAX_RATING = 5;
const MAX_REVIEW_COUNT = 10_000_000;
const PET_TYPES = new Set(['dog', 'cat', 'both']);

function isStr(v: unknown, min: number, max: number): v is string {
  return typeof v === 'string' && v.length >= min && v.length <= max;
}

function isOptStr(v: unknown, max: number): v is string | undefined {
  return v === undefined || isStr(v, 0, max);
}

function isNum(v: unknown, min: number, max: number): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
}

function isNullableNum(v: unknown, min: number, max: number): v is number | null {
  return v === null || isNum(v, min, max);
}

function isBool(v: unknown): v is boolean {
  return typeof v === 'boolean';
}

function isStrArray(v: unknown, maxItems: number, maxLen: number): v is string[] {
  if (!Array.isArray(v) || v.length > maxItems) return false;
  return v.every((item) => isStr(item, 0, maxLen));
}

function validateOption(raw: unknown): ProductOption | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (!isStr(o.id, 1, MAX_SHORT_TEXT)) return null;
  if (!isStr(o.name, 1, MAX_TEXT)) return null;
  if (!isNum(o.price, 0, MAX_PRICE)) return null;
  if (o.priceDiff !== undefined && !isNum(o.priceDiff, -MAX_PRICE, MAX_PRICE)) return null;
  if (!isNum(o.stock, 0, MAX_STOCK)) return null;
  return {
    id: o.id,
    name: o.name,
    price: o.price,
    stock: o.stock,
    ...(o.priceDiff !== undefined ? { priceDiff: o.priceDiff as number } : {}),
  };
}

function validateOptions(raw: unknown): ProductOption[] | null | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw) || raw.length > MAX_OPTIONS) return null;
  const options: ProductOption[] = [];
  for (const item of raw) {
    const option = validateOption(item);
    if (!option) return null;
    options.push(option);
  }
  return options;
}

export type ValidatedProductFields = Partial<Product>;

/**
 * body에서 허용 필드만 뽑아 검증한다. requireAll=true(생성)면 필수 필드 누락 시 실패,
 * false(수정)면 넘어온 필드만 검증하고 나머지는 건드리지 않는다.
 */
export function validateProductFields(
  body: unknown,
  requireAll: boolean,
): ValidatedProductFields | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const out: ValidatedProductFields = {};

  if (b.brandId !== undefined) {
    if (!isStr(b.brandId, 1, MAX_SHORT_TEXT)) return null;
    out.brandId = b.brandId;
  } else if (requireAll) return null;

  if (b.name !== undefined) {
    if (!isStr(b.name, 1, MAX_NAME)) return null;
    out.name = b.name;
  } else if (requireAll) return null;

  if (b.price !== undefined) {
    if (!isNullableNum(b.price, 0, MAX_PRICE)) return null;
    out.price = b.price;
  } else if (requireAll) return null;

  if (b.salePrice !== undefined) {
    if (!isNullableNum(b.salePrice, 0, MAX_PRICE)) return null;
    out.salePrice = b.salePrice;
  }

  if (b.rating !== undefined) {
    if (!isNum(b.rating, 0, MAX_RATING)) return null;
    out.rating = b.rating;
  } else if (requireAll) {
    out.rating = 0;
  }

  if (b.reviewCount !== undefined) {
    if (!isNum(b.reviewCount, 0, MAX_REVIEW_COUNT) || !Number.isInteger(b.reviewCount)) return null;
    out.reviewCount = b.reviewCount;
  } else if (requireAll) {
    out.reviewCount = 0;
  }

  if (b.category !== undefined) {
    if (!isStr(b.category, 1, MAX_TEXT)) return null;
    out.category = b.category;
  } else if (requireAll) return null;

  if (b.categorySlug !== undefined) {
    if (b.categorySlug !== null && !isStr(b.categorySlug, 0, MAX_SHORT_TEXT)) return null;
    out.categorySlug = b.categorySlug === null ? undefined : b.categorySlug;
  }

  if (b.categoryName !== undefined) {
    if (!isOptStr(b.categoryName, MAX_TEXT)) return null;
    out.categoryName = b.categoryName;
  }

  if (b.lifestyleCategory !== undefined) {
    if (!isStr(b.lifestyleCategory, 1, MAX_TEXT)) return null;
    out.lifestyleCategory = b.lifestyleCategory;
  } else if (requireAll) return null;

  if (b.concernTags !== undefined) {
    if (!isStrArray(b.concernTags, MAX_ARRAY_ITEMS, MAX_SHORT_TEXT)) return null;
    out.concernTags = b.concernTags;
  } else if (requireAll) {
    out.concernTags = [];
  }

  if (b.relatedConcernSlugs !== undefined) {
    if (!isStrArray(b.relatedConcernSlugs, MAX_ARRAY_ITEMS, MAX_SHORT_TEXT)) return null;
    out.relatedConcernSlugs = b.relatedConcernSlugs;
  }

  if (b.petType !== undefined) {
    if (typeof b.petType !== 'string' || !PET_TYPES.has(b.petType)) return null;
    out.petType = b.petType as Product['petType'];
  } else if (requireAll) return null;

  if (b.ageGroup !== undefined) {
    if (!isStr(b.ageGroup, 1, MAX_SHORT_TEXT)) return null;
    out.ageGroup = b.ageGroup;
  } else if (requireAll) return null;

  if (b.image !== undefined) {
    if (!isStr(b.image, 1, MAX_URL)) return null;
    out.image = b.image;
  } else if (requireAll) return null;

  if (b.images !== undefined) {
    if (!isStrArray(b.images, MAX_ARRAY_ITEMS, MAX_URL)) return null;
    out.images = b.images;
  }

  const options = validateOptions(b.options);
  if (options === null) return null;
  if (options !== undefined) out.options = options;

  if (b.stock !== undefined) {
    if (!isNum(b.stock, 0, MAX_STOCK) || !Number.isInteger(b.stock)) return null;
    out.stock = b.stock;
  } else if (requireAll) return null;

  if (b.summary !== undefined) {
    if (!isOptStr(b.summary, MAX_TEXT)) return null;
    out.summary = b.summary;
  }

  if (b.description !== undefined) {
    if (!isStr(b.description, 1, MAX_LONG_TEXT)) return null;
    out.description = b.description;
  } else if (requireAll) return null;

  if (b.shippingNotice !== undefined) {
    if (!isOptStr(b.shippingNotice, MAX_TEXT)) return null;
    out.shippingNotice = b.shippingNotice;
  }

  if (b.tags !== undefined) {
    if (!isStrArray(b.tags, MAX_ARRAY_ITEMS, MAX_SHORT_TEXT)) return null;
    out.tags = b.tags;
  }

  if (b.brandName !== undefined) {
    if (!isOptStr(b.brandName, MAX_NAME)) return null;
    out.brandName = b.brandName;
  }

  if (b.isMembersOnlyPrice !== undefined) {
    if (!isBool(b.isMembersOnlyPrice)) return null;
    out.isMembersOnlyPrice = b.isMembersOnlyPrice;
  }

  if (b.auditPoints !== undefined) {
    if (!isStrArray(b.auditPoints, MAX_ARRAY_ITEMS, MAX_TEXT)) return null;
    out.auditPoints = b.auditPoints;
  }

  if (b.recommendedFor !== undefined) {
    if (!isStrArray(b.recommendedFor, MAX_ARRAY_ITEMS, MAX_TEXT)) return null;
    out.recommendedFor = b.recommendedFor;
  }

  if (b.caution !== undefined) {
    if (!isStrArray(b.caution, MAX_ARRAY_ITEMS, MAX_TEXT)) return null;
    out.caution = b.caution;
  }

  if (b.ingredients !== undefined) {
    if (!isOptStr(b.ingredients, MAX_TEXT)) return null;
    out.ingredients = b.ingredients;
  }

  if (b.howToUse !== undefined) {
    if (!isOptStr(b.howToUse, MAX_TEXT)) return null;
    out.howToUse = b.howToUse;
  }

  if (b.shippingFee !== undefined) {
    if (!isNum(b.shippingFee, 0, MAX_PRICE)) return null;
    out.shippingFee = b.shippingFee;
  }

  if (b.isVisible !== undefined) {
    if (!isBool(b.isVisible)) return null;
    out.isVisible = b.isVisible;
  } else if (requireAll) {
    out.isVisible = true;
  }

  if (b.isBest !== undefined) {
    if (!isBool(b.isBest)) return null;
    out.isBest = b.isBest;
  } else if (requireAll) {
    out.isBest = false;
  }

  if (b.isRecommended !== undefined) {
    if (!isBool(b.isRecommended)) return null;
    out.isRecommended = b.isRecommended;
  } else if (requireAll) {
    out.isRecommended = false;
  }

  // salePrice는 price보다 클 수 없다. 이 패스는 body에 함께 넘어온 값만 교차검증한다
  // (patch에서 price를 안 건드리고 salePrice만 보내는 경우는 DB의 기존 price와 비교할 수
  // 없어 여기서는 건너뛴다 — updateProduct의 read-modify-write에서 최종 값으로 합쳐진다).
  if (out.salePrice !== undefined && out.price !== undefined) {
    if (out.price === null) return null;
    if (out.salePrice !== null && out.salePrice > out.price) return null;
  }

  return out;
}

export function toInsertInput(fields: ValidatedProductFields): ProductInsertInput | null {
  // requireAll=true 경로를 거쳤다는 전제 — 필수 필드가 비어있으면 호출자 실수이므로 null.
  if (
    fields.brandId === undefined ||
    fields.name === undefined ||
    fields.price === undefined ||
    fields.category === undefined ||
    fields.lifestyleCategory === undefined ||
    fields.petType === undefined ||
    fields.ageGroup === undefined ||
    fields.image === undefined ||
    fields.stock === undefined ||
    fields.description === undefined
  ) {
    return null;
  }
  return fields as ProductInsertInput;
}

export function toPatchInput(fields: ValidatedProductFields): ProductPatchInput {
  return fields;
}
