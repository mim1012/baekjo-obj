// 관리자 상품 생성/수정 입력 검증. POST/PATCH 라우트가 공유한다.
// id/createdAt은 여기서 받지 않는다(서버 결정, mass-assignment 차단).
import type { Product, ProductOption, ProductDetailBlock } from '@/types';
import type { ProductInsertInput, ProductPatchInput } from '@/lib/products/repo';

const MAX_NAME = 200;
const MAX_SHORT_TEXT = 100;
const MAX_TEXT = 300;
const MAX_LONG_TEXT = 3000;
const MAX_URL = 500;
const MAX_ARRAY_ITEMS = 50;
const MAX_OPTIONS = 50;
const MAX_DETAIL_BLOCKS = 60;
const MAX_BLOCK_TEXT = 2000;
/**
 * detailBlocks 전체 직렬화 상한(바이트). detail jsonb는 listProducts가 최대 1000행까지
 * 통째로 읽어 공개 /api/products가 그대로 직렬화하므로, 상품 1건의 상세가 응답 크기를
 * 좌우한다. 60블록 × 2000자(ASCII 기준 ≈120KB)는 이 상한 아래지만, 한글은 UTF-8에서
 * 글자당 3바이트라 같은 블록 수로도 ~360KB까지 부풀 수 있다 → 실제 바이트로 재서 막는다.
 */
const MAX_DETAIL_BYTES = 256 * 1024;
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

/** 오리진 비교용 더미 base. 상대경로가 실제로 자사 오리진에 머무는지 파서로 확인한다. */
const SITE_ORIGIN_PROBE = 'https://baekjo.invalid';

/**
 * 자사 상대경로인지 판정한다. 접두사 검사만으로는 부족하다 — 브라우저 URL 파서는 special
 * scheme에서 백슬래시를 '/'로 정규화하고 탭·개행(\t\n\r)을 제거하므로 `/\evil.com/x.png`나
 * `/<TAB>/evil.com/x.png`가 `//evil.com/x.png`(프로토콜 상대 URL)과 동치가 되어 외부 오리진을
 * 로드한다. 그래서 위험 문자를 먼저 거부하고, URL 파서로 실제 오리진을 확인한다.
 */
function isSitePath(src: string): boolean {
  if (/[\\\t\n\r]/.test(src)) return false;
  if (!src.startsWith('/') || src.startsWith('//')) return false;
  try {
    return new URL(src, SITE_ORIGIN_PROBE).origin === SITE_ORIGIN_PROBE;
  } catch {
    return false;
  }
}

/** 업로드 대상인 Supabase storage 오리진. 미설정이면 null → 상대경로만 허용(fail-closed). */
function supabaseOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

/**
 * 상세 이미지 src 화이트리스트. 공개 상세가 이 값을 raw <img src>로 렌더하므로 임의 오리진을
 * 허용하면 구매자 IP/UA가 제3자 서버로 새고, 콘텐츠도 원격에서 교체될 수 있다. 자사 경로(`/...`)
 * 또는 Supabase storage 오리진만 통과시키고, 환경변수가 없으면 상대경로만 허용한다.
 * (순수 함수 — 테스트에서 직접 호출 가능하도록 export)
 */
export function isAllowedBlockImageSrc(src: string): boolean {
  if (isSitePath(src)) return true;
  const origin = supabaseOrigin();
  if (!origin) return false;
  try {
    const url = new URL(src);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
    return url.origin === origin;
  } catch {
    return false;
  }
}

/**
 * 상세 본문 블록(네이버식 text|image 순차 렌더). 관리자 상세 에디터(ProductDetailEditor)가
 * 이 필드만 담아 PATCH를 보내므로, 여기 분기가 없으면 out이 빈 객체가 되어 라우트가
 * "수정할 필드 없음"으로 400을 반환한다 — 상세 본문이 DB에 영영 저장되지 않는다.
 *
 * text content는 sanitize하지 않는다(길이 상한만 검증): content는 공개 상세·에디터 미리보기
 * 모두에서 React가 이스케이프하는 평문으로 렌더된다(HTML 파싱 경로 없음). 태그 문자열 거부는
 * 정당한 문구(`<A/S 안내>`, `<NEW>`, `x<y`)를 막으면서 인코딩 우회는 못 막는 새는 방어라
 * 두지 않는다. 이 전제(=평문 렌더)는 tests/products/no-html-sink.spec.ts가 기계로 강제한다.
 * image src는 실제 싱크(raw <img src>)가 있으므로 자사/Supabase 오리진만 허용한다.
 */
function validateDetailBlock(raw: unknown): ProductDetailBlock | null {
  if (!raw || typeof raw !== 'object') return null;
  const b = raw as Record<string, unknown>;
  if (b.type === 'text') {
    if (!isStr(b.content, 0, MAX_BLOCK_TEXT)) return null;
    return { type: 'text', content: b.content };
  }
  if (b.type === 'image') {
    if (!isStr(b.src, 1, MAX_URL)) return null;
    if (!isAllowedBlockImageSrc(b.src)) return null;
    if (!isOptStr(b.alt, MAX_TEXT)) return null;
    return { type: 'image', src: b.src, ...(b.alt !== undefined ? { alt: b.alt } : {}) };
  }
  return null;
}

function validateDetailBlocks(raw: unknown): ProductDetailBlock[] | null | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw) || raw.length > MAX_DETAIL_BLOCKS) return null;
  const blocks: ProductDetailBlock[] = [];
  for (const item of raw) {
    const block = validateDetailBlock(item);
    if (!block) return null;
    blocks.push(block);
  }
  // 블록 수·개별 길이 상한을 통과해도 합계는 커질 수 있다(특히 한글) — 실제 바이트로 최종 확인.
  if (new TextEncoder().encode(JSON.stringify(blocks)).length > MAX_DETAIL_BYTES) return null;
  return blocks;
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

  const detailBlocks = validateDetailBlocks(b.detailBlocks);
  if (detailBlocks === null) return null;
  if (detailBlocks !== undefined) out.detailBlocks = detailBlocks;

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

  // 상세 본문은 detailBlocks(에디터)가 정본이고 description은 "간단 텍스트 상세"(선택)다.
  // 과거엔 생성 시 필수였는데, 폼이 "에디터를 쓰려면 비워두세요"라고 안내하면서도 비우면
  // 400을 뱉는 모순이 있었다 — 안내가 맞고 검증이 틀렸으므로 선택 필드로 정정한다.
  // Product.description은 non-optional(string)이라 미제공 시 ''로 채워 타입 계약을 유지한다.
  if (b.description !== undefined) {
    if (!isStr(b.description, 0, MAX_LONG_TEXT)) return null;
    out.description = b.description;
  } else if (requireAll) {
    out.description = '';
  }

  if (b.shippingNotice !== undefined) {
    if (!isOptStr(b.shippingNotice, MAX_TEXT)) return null;
    out.shippingNotice = b.shippingNotice;
  }

  // 구매 정보 3종. 화이트리스트에 없어서 저장 자체가 불가능했고(rowToProduct도 되읽지 않아
  // 영영 undefined), 상세 페이지는 항상 기본 문구만 렌더했다.
  if (b.deliveryEstimate !== undefined) {
    if (!isOptStr(b.deliveryEstimate, MAX_TEXT)) return null;
    out.deliveryEstimate = b.deliveryEstimate;
  }

  if (b.returnNotice !== undefined) {
    if (!isOptStr(b.returnNotice, MAX_TEXT)) return null;
    out.returnNotice = b.returnNotice;
  }

  if (b.sellerName !== undefined) {
    if (!isOptStr(b.sellerName, MAX_NAME)) return null;
    out.sellerName = b.sellerName;
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

  if (b.pointsEnabled !== undefined) {
    if (!isBool(b.pointsEnabled)) return null;
    out.pointsEnabled = b.pointsEnabled;
  }

  if (b.pointsRate !== undefined) {
    if (!isNum(b.pointsRate, 0, 100)) return null;
    out.pointsRate = b.pointsRate;
  }

  // salePrice는 price보다 클 수 없고, 정가(price) 없이 세일가만 존재할 수도 없다. 이 패스는
  // body에 함께 넘어온 값만 교차검증한다(한쪽만 온 경우는 DB의 기존 값과 합쳐야 하므로
  // repo의 assertPriceInvariant(merged)가 최종 방어선이다).
  // price=null + salePrice=null 은 "가격 미정" 상태로 모순이 아니다 — 시드 상품 20건이
  // price:null 이라, 이걸 거부하면 그 상품들은 폼에서 저장 자체가 불가능해진다.
  if (out.salePrice !== undefined && out.price !== undefined) {
    if (out.salePrice !== null && out.price === null) return null;
    if (out.salePrice !== null && out.price !== null && out.salePrice > out.price) return null;
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
