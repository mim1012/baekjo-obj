import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  FIELD_SURFACE_MATRIX,
  domainSurfaceFields,
} from '../golden/_lib/fieldSurfaceMatrix';

// 필드 단위 커버리지 감사 — golden-crud-coverage.spec.ts(도메인 단위)의 자매편.
//
// golden-crud-coverage 는 "새 admin *도메인*이 실구동 검증 없이 늘어나는 것"을 막는다.
// 이 스펙은 한 단계 더 들어가 "상품·브랜드 폼의 새 *필드*가 왕복 검증 없이 늘어나는 것"을
// 막는다 — 상품/브랜드 폼은 이 레포에서 가장 큰 폼이라 필드가 조용히 추가되기 쉽다.
//
// 동작(항상 켜짐, tests/admin 레이어 — E2E_ADMIN_CRUD·실 staging 불필요):
//   1) 검증기(validate.ts) 소스에서 실제로 허용하는 필드 목록을 파싱해 "정본"으로 삼는다.
//   2) 그 정본의 모든 필드가 VERIFIED_FIELDS(라이브 스펙이 실제로 채워 왕복/공개 검증한 필드)
//      또는 EXCLUDED(사유 명시)에 분류돼 있는지 확인한다.
//   3) 하나라도 빠지면 시끄럽게 실패한다 — "폼에 필드를 추가했는데 e2e 왕복 검증을 깜빡함"을
//      사람 기억이 아니라 기계가 잡는다(이 스펙이 team-lead가 요청한 self-improvement 장치).
//
// 실구동(왕복) 스펙:
//   - tests/golden/admin-crud-product-fields.spec.ts  (상품 전 필드 + detailBlocks 에디터)
//   - tests/golden/admin-crud-brand-fields.spec.ts     (브랜드 전 필드 + 감사보고서/배송/대표상품)

const root = path.resolve(__dirname, '..', '..');
const PRODUCT_VALIDATE = path.join(root, 'src/lib/products/validate.ts');
const BRAND_VALIDATE = path.join(root, 'src/lib/brands/validate.ts');
const SPLIT_PRODUCT_INPUT = path.join(root, 'src/lib/products/splitProductInput.ts');

/**
 * 검증기 함수 본문에서 허용 필드명을 파싱한다. validateProductFields/validateBrandFields 안에서는
 * body 인자를 항상 `b`로 받고 모든 필드 접근이 `b.<field>` 형태다(detailBlocks·options·shipping·
 * auditReport 같은 위임 검증도 `validateX(b.field)`로 `b.field`를 거친다). 그래서 함수 본문만
 * 잘라 `b.<이름>` 을 뽑으면 정확히 "허용 필드 집합"이 된다.
 *
 * ⚠️ 견고한 AST 파싱 대신 정규식 슬라이스라 검증기 함수의 변수명 관례(body=`b`, 필드 접근은
 * 전부 `b.field`)에 의존한다. 관례가 깨지면 이 파서가 틀리므로, 아래 PINNED 스냅샷과 교차확인해
 * 파서가 조용히 무너지는 것도 함께 잡는다.
 */
function parseAcceptedFields(sourcePath: string, fnName: string): Set<string> {
  const src = fs.readFileSync(sourcePath, 'utf8');
  const startMarker = `export function ${fnName}(`;
  const start = src.indexOf(startMarker);
  if (start === -1) throw new Error(`${fnName} 를 ${sourcePath} 에서 찾지 못함`);
  // 다음 최상위 `export function` 또는 파일 끝까지를 함수 본문으로 본다.
  const nextExport = src.indexOf('\nexport function', start + startMarker.length);
  const body = src.slice(start, nextExport === -1 ? undefined : nextExport);

  const fields = new Set<string>();
  for (const m of body.matchAll(/\bb\.(\w+)\b/g)) {
    fields.add(m[1]);
  }
  return fields;
}

/** splitProductInput.ts 의 PRODUCT_COLUMN_MAP 키(= 실제 DB 컬럼 필드) 파싱. */
function parseColumnMapKeys(): Set<string> {
  const src = fs.readFileSync(SPLIT_PRODUCT_INPUT, 'utf8');
  const start = src.indexOf('PRODUCT_COLUMN_MAP');
  const open = src.indexOf('{', start);
  const close = src.indexOf('};', open);
  const block = src.slice(open, close);
  const keys = new Set<string>();
  for (const m of block.matchAll(/^\s*(\w+):/gm)) {
    keys.add(m[1]);
  }
  return keys;
}

// ── 상품 필드 분류 ────────────────────────────────────────────────────────
//
// VERIFIED = admin-crud-product-fields.spec.ts 가 폼(또는 ProductDetailEditor)에서 실제로 값을
// 채우고, 저장 후 관리자 편집 폼 왕복 또는 공개 /shop/[id] 에서 그 값을 검증한다.
const PRODUCT_VERIFIED: readonly string[] = [
  'name',
  'brandId',
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
  'auditPoints',
  'relatedConcernSlugs',
  'tags',
  'detailBlocks', // ProductDetailEditor(/admin/products/[id]/editor)로 text+image 블록 저장 → #story 순서 검증
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
  'pointsEnabled',
  'pointsRate',
];

// EXCLUDED = 의도적으로 라이브 왕복 스펙에서 다루지 않는 필드 + 사유.
const PRODUCT_EXCLUDED: Record<string, string> = {
  rating: '파생값(구매평 집계) — ProductForm 입력 없음, 생성 시 서버가 0으로 채움.',
  reviewCount: '파생값(구매평 수) — ProductForm 입력 없음, 생성 시 서버가 0으로 채움.',
  categorySlug: '관리자 UI 없음 — category 설정에서 서버가 파생. ProductForm 미노출.',
  categoryName: '관리자 UI 없음 — ProductForm 미노출(계약만 개방).',
  concernTags:
    '관리자 UI 없음 — ProductForm 미노출, 생성 시 []로 기본값. (Brand.relatedConcernSlugs 와 혼동 주의)',
  ageGroup:
    '관리자 UI 없음 — formPayload.ts 가 항상 "all" 로 하드코딩 전송(사용자 편집 불가).',
  brandName:
    '역정규화 값 — ProductForm 이 선택한 brandId 로부터 파생 전송, 독립 입력 아님.',
};

// ── 브랜드 필드 분류 ──────────────────────────────────────────────────────
//
// BrandDetailEditor(/admin/brands/[id]) 는 전 필드 에디터라 16개 필드를 모두 노출한다 →
// admin-crud-brand-fields.spec.ts 가 전부 채워 왕복(admin 편집 재열람) 또는 공개 /brands/[id] 에서 검증.
// sourceUrls·shipping·auditGrade·officialUrl 은 공개 상세에 렌더되지 않지만 BrandDetailEditor 에
// 편집 UI가 있어 관리자 왕복으로 검증한다(=VERIFIED, 공개 assertion 없음).
const BRAND_VERIFIED: readonly string[] = [
  'name',
  'logo',
  'description',
  'philosophy',
  'auditGrade',
  'officialUrl',
  'sourceUrls',
  'shipping',
  'auditPoints',
  'auditReport',
  'representativeProductIds',
  'relatedConcernSlugs',
  'isRecommended',
  'isNew',
  'isVisible',
  'displayOrder',
];

const BRAND_EXCLUDED: Record<string, string> = {
  // 현재 전 필드가 BrandDetailEditor 로 왕복 검증되므로 제외 없음.
};

function assertClassified(
  label: string,
  canonical: Set<string>,
  verified: readonly string[],
  excluded: Record<string, string>,
): void {
  const classified = new Set<string>([...verified, ...Object.keys(excluded)]);
  const unclassified = [...canonical].filter((f) => !classified.has(f)).sort();
  expect(
    unclassified,
    `${label}: 검증기(validate.ts)가 허용하는 필드 [${unclassified.join(', ')}] 이 ` +
      `VERIFIED_FIELDS 또는 EXCLUDED 에 분류돼 있지 않습니다. 폼에 새 필드를 추가했다면 ` +
      `해당 라이브 스펙(admin-crud-*-fields.spec.ts)에서 왕복 검증을 추가하고 VERIFIED 에 넣거나, ` +
      `의도적으로 제외라면 EXCLUDED 에 사유를 적으세요(이 파일).`,
  ).toEqual([]);
}

function assertNoStale(
  label: string,
  canonical: Set<string>,
  verified: readonly string[],
  excluded: Record<string, string>,
): void {
  const stale = [...verified, ...Object.keys(excluded)].filter((f) => !canonical.has(f)).sort();
  expect(
    stale,
    `${label}: 분류 목록에 있지만 검증기가 더 이상 허용하지 않는 필드 [${stale.join(', ')}] — ` +
      `필드가 제거·개명됐다면 이 목록에서도 지우세요(파서가 조용히 무너진 신호일 수도 있음).`,
  ).toEqual([]);
}

test.describe('상품·브랜드 폼 필드 커버리지 감사 — 필드 누락 방지', () => {
  const productFields = parseAcceptedFields(PRODUCT_VALIDATE, 'validateProductFields');
  const brandFields = parseAcceptedFields(BRAND_VALIDATE, 'validateBrandFields');

  test('파서 온전성 — 검증기에서 최소 기대 개수 이상의 필드를 파싱했다', () => {
    // 파서가 조용히 0개/소수만 잡고 통과하는 것을 막는 하한선(현행 상품 39·브랜드 16).
    expect(productFields.size, 'validateProductFields 파싱 필드 수').toBeGreaterThanOrEqual(35);
    expect(brandFields.size, 'validateBrandFields 파싱 필드 수').toBeGreaterThanOrEqual(15);
  });

  test('상품: 검증기의 모든 허용 필드가 VERIFIED 또는 EXCLUDED 로 분류돼 있다', () => {
    assertClassified('상품', productFields, PRODUCT_VERIFIED, PRODUCT_EXCLUDED);
  });

  test('상품: 분류 목록에 검증기에 없는 잔존 필드가 없다', () => {
    assertNoStale('상품', productFields, PRODUCT_VERIFIED, PRODUCT_EXCLUDED);
  });

  test('상품: PRODUCT_COLUMN_MAP 의 모든 DB 컬럼 필드가 분류돼 있다', () => {
    const columns = parseColumnMapKeys();
    expect(columns.size, 'PRODUCT_COLUMN_MAP 컬럼 수').toBeGreaterThanOrEqual(14);
    const classified = new Set<string>([...PRODUCT_VERIFIED, ...Object.keys(PRODUCT_EXCLUDED)]);
    const unclassifiedColumns = [...columns].filter((c) => !classified.has(c)).sort();
    expect(
      unclassifiedColumns,
      `PRODUCT_COLUMN_MAP 의 컬럼 [${unclassifiedColumns.join(', ')}] 이 분류되지 않았습니다.`,
    ).toEqual([]);
  });

  test('브랜드: 검증기의 모든 허용 필드가 VERIFIED 또는 EXCLUDED 로 분류돼 있다', () => {
    assertClassified('브랜드', brandFields, BRAND_VERIFIED, BRAND_EXCLUDED);
  });

  test('브랜드: 분류 목록에 검증기에 없는 잔존 필드가 없다', () => {
    assertNoStale('브랜드', brandFields, BRAND_VERIFIED, BRAND_EXCLUDED);
  });

  test('상품 검증 포인트·관련 고민·태그는 dead field가 아니라 VERIFIED 로 승격돼 있다', () => {
    for (const connected of ['auditPoints', 'relatedConcernSlugs', 'tags']) {
      expect(PRODUCT_VERIFIED).toContain(connected);
      expect(PRODUCT_EXCLUDED[connected], `Product.${connected} 는 EXCLUDED 에 남아 있으면 안 됨`).toBeUndefined();
    }
  });
});

// ── 필드-표면 매트릭스 완전성 게이트 ──────────────────────────────────────────
//
// team-lead 요청: "표면이 렌더하는 필드가 매트릭스에 없으면(누락) 실패, 매트릭스 필드가 어떤
// 스펙에도 검증되지 않으면(미검증) 실패." 렌더 코드를 기계로 파싱하는 건 견고하지 않으므로,
// 매트릭스(SSOT)와 "라이브 스펙이 실제로 공개 검증하는 필드(SURFACE_ASSERTED)"를 **양방향**으로
// 고정 대조한다. 매트릭스에 필드를 추가하면 SURFACE_ASSERTED 도 추가해야 하고(→ 스펙 작성자가
// 검증을 붙이게 강제), 반대로 스펙이 검증한다고 선언한 필드가 매트릭스에 없어도 실패한다.
//
// ⚠️ SURFACE_ASSERTED 는 "두 라이브 스펙이 공개 화면에서 실제로 assert 하는 필드"의 고정 스냅샷
//    이다(admin-crud-product-fields.spec.ts / admin-crud-brand-fields.spec.ts 와 수기 동기화).
//    소스-검증 스펙이 런타임 assert 를 볼 수 없어 불가피하게 pin 이며, 양방향 대조로 드리프트를 잡는다.

// 상품: shop-card + shop-detail 표면이 공개 렌더하고 라이브 스펙이 검증하는 필드.
const PRODUCT_SURFACE_ASSERTED = new Set<string>([
  'name',
  'salePrice',
  'price',
  'image',
  'images',
  'auditPoints',
  'relatedConcernSlugs',
  'tags',
  'brandName',
  'rating',
  'reviewCount',
  'isBest',
  'isRecommended',
  'stock', // 빈 상태 테스트(재고0 → "잠시 품절" 뱃지)에서 검증
  'options',
  'detailBlocks',
  'description',
  'ingredients',
  'howToUse',
  'recommendedFor',
  'caution',
  'shippingFee',
  'deliveryEstimate',
  'returnNotice',
  'sellerName',
  'pointsRate',
]);

// 브랜드: brand-card + brand-detail 표면이 공개 렌더하고 라이브 스펙이 검증하는 필드.
const BRAND_SURFACE_ASSERTED = new Set<string>([
  'name',
  'logo',
  'description',
  'philosophy',
  'relatedConcernSlugs',
  'auditPoints',
  'representativeProductIds',
]);

function symmetricDiff(a: Set<string>, b: Set<string>): { onlyA: string[]; onlyB: string[] } {
  return {
    onlyA: [...a].filter((x) => !b.has(x)).sort(),
    onlyB: [...b].filter((x) => !a.has(x)).sort(),
  };
}

test.describe('필드-표면 매트릭스 완전성 — 공개 화면 필드 누락 방지', () => {
  const productFields = parseAcceptedFields(PRODUCT_VALIDATE, 'validateProductFields');
  const brandFields = parseAcceptedFields(BRAND_VALIDATE, 'validateBrandFields');

  test('매트릭스의 모든 항목이 렌더 소스(file:line) 인용을 갖는다', () => {
    for (const surface of FIELD_SURFACE_MATRIX) {
      for (const f of surface.fields) {
        expect(f.render, `${surface.id}.${f.field} 는 render 인용이 있어야 함`).toBeTruthy();
      }
    }
  });

  test('상품: 매트릭스(assertedThisWave) 공개 필드 ⇔ 라이브 스펙 검증 필드(양방향 일치)', () => {
    const matrixFields = domainSurfaceFields('product'); // shop-card + shop-detail
    const { onlyA: inMatrixNotAsserted, onlyB: assertedNotInMatrix } = symmetricDiff(
      matrixFields,
      PRODUCT_SURFACE_ASSERTED,
    );
    expect(
      inMatrixNotAsserted,
      `매트릭스가 렌더 계약으로 못 박았지만 라이브 스펙이 검증하지 않는 상품 공개 필드: ` +
        `[${inMatrixNotAsserted.join(', ')}] — admin-crud-product-fields.spec.ts 에 공개 검증을 추가하고 ` +
        `SURFACE_ASSERTED 에 넣으세요(누락 = 공개 화면 회귀 위험).`,
    ).toEqual([]);
    expect(
      assertedNotInMatrix,
      `스펙이 검증한다고 선언했지만 매트릭스에 없는 상품 필드: [${assertedNotInMatrix.join(', ')}] — ` +
        `fieldSurfaceMatrix.ts 에 렌더 소스와 함께 추가하거나 SURFACE_ASSERTED 에서 지우세요.`,
    ).toEqual([]);
  });

  test('브랜드: 매트릭스(assertedThisWave) 공개 필드 ⇔ 라이브 스펙 검증 필드(양방향 일치)', () => {
    const matrixFields = domainSurfaceFields('brand'); // brand-card + brand-detail
    const { onlyA: inMatrixNotAsserted, onlyB: assertedNotInMatrix } = symmetricDiff(
      matrixFields,
      BRAND_SURFACE_ASSERTED,
    );
    expect(
      inMatrixNotAsserted,
      `매트릭스가 렌더 계약으로 못 박았지만 라이브 스펙이 검증하지 않는 브랜드 공개 필드: ` +
        `[${inMatrixNotAsserted.join(', ')}] — admin-crud-brand-fields.spec.ts 에 공개 검증을 추가하세요.`,
    ).toEqual([]);
    expect(
      assertedNotInMatrix,
      `스펙이 검증한다고 선언했지만 매트릭스에 없는 브랜드 필드: [${assertedNotInMatrix.join(', ')}].`,
    ).toEqual([]);
  });

  test('매트릭스의 상품 공개 필드는 모두 실제 검증기 허용 필드다(오타/스테일 방지)', () => {
    const stale = [...domainSurfaceFields('product')].filter((f) => !productFields.has(f)).sort();
    expect(
      stale,
      `fieldSurfaceMatrix 의 상품 필드 [${stale.join(', ')}] 이 validateProductFields 허용 목록에 없습니다.`,
    ).toEqual([]);
  });

  test('매트릭스의 브랜드 공개 필드는 모두 실제 검증기 허용 필드다(오타/스테일 방지)', () => {
    const stale = [...domainSurfaceFields('brand')].filter((f) => !brandFields.has(f)).sort();
    expect(
      stale,
      `fieldSurfaceMatrix 의 브랜드 필드 [${stale.join(', ')}] 이 validateBrandFields 허용 목록에 없습니다.`,
    ).toEqual([]);
  });
});
