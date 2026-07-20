// 필드-표면 계약 매트릭스(Field Surface Contract Matrix) — 공유 인프라.
//
// 전제(사용자 확정): "현재 배포된 디자인이 곧 확정 계약." 즉 지금 배포된 *렌더 코드가 각 공개
// 표면에 실제로 그리는 필드*가 계약이다. 이 매트릭스는 그 계약을 렌더 코드에서 추출해 한곳에
// 못 박는다(각 항목에 렌더 소스 file:line 인용). 목적은 "admin 에는 있는데 공개 화면에서 빠짐"
// 부류의 회귀를 영구히 잡는 것이다.
//
// 이 모듈은 **독립적이고 순수**하다(스펙 전용 로직 없음). 소비처:
//   - tests/golden/admin-crud-product-fields.spec.ts / admin-crud-brand-fields.spec.ts
//       → 공개 화면 검증을 이 매트릭스에서 끌어 쓴다(ad-hoc 하드코딩 대신).
//   - tests/admin/product-brand-field-coverage.spec.ts
//       → 매트릭스 완전성 게이트: 표면이 렌더하는 필드가 매트릭스에 없거나(누락), 매트릭스 필드가
//         어떤 스펙에도 검증되지 않으면(미검증) 실패시킨다.
//
// ⚠️ 이 매트릭스는 렌더 코드가 바뀌면 함께 갱신해야 한다(file:line 인용이 그 근거). 렌더 코드
//    실측: 2026-07-19(worktree e2e-admin-crud-w5).

export type SurfaceDomain = 'product' | 'brand' | 'notice' | 'review' | 'inquiry' | 'cart';

export type FieldKind =
  | 'text' // 값이 텍스트로 렌더 — body/scope.toContainText(value) 로 검증 가능
  | 'badge' // 조건부 뱃지(예: isBest→"BEST")
  | 'select' // <select> 옵션으로 렌더(상품 옵션)
  | 'image' // <img>/배경 이미지
  | 'blocks' // 순차 블록(detailBlocks)
  | 'derived' // 서버 파생값(rating/reviewCount 등) — 값이 아니라 렌더 위치만 계약
  | 'link'; // 링크 href

export interface SurfaceField {
  /** 도메인 필드명(Product/Brand/Notice…의 키). auditReport 는 sub-field 를 note 에 적는다. */
  field: string;
  /** 렌더 소스 근거. */
  render: string;
  kind: FieldKind;
  note?: string;
  /**
   * false = 이 필드는 표면에 문서화돼 있으나 "지금은 공개 렌더 계약이 확정 전"이라 이 웨이브의
   * 라이브 스펙이 공개 검증하지 않는다(완전성 게이트의 assertedThisWave 집합에서 제외).
   * 주로 공개 렌더 PR 이 병렬 진행 중인 필드에 붙인다 — 머지 후 이 플래그를 지워 승격한다.
   * 기본값(미지정)은 true(=검증 대상).
   */
  assertNow?: boolean;
}

export interface Surface {
  id: string;
  label: string;
  domain: SurfaceDomain;
  route: string;
  /**
   * true = 이 웨이브(wave5 상품·브랜드 라이브 스펙)가 이 표면을 실제로 공개 검증한다.
   * false = 계약을 문서화만 함(향후 웨이브에서 라이브 검증) — 완전성 게이트의 "미검증 실패"
   *         대상에서 제외된다(내 스펙 범위가 상품·브랜드라서).
   */
  assertedThisWave: boolean;
  fields: SurfaceField[];
}

export const FIELD_SURFACE_MATRIX: Surface[] = [
  // ── 상품: shop 카드(검색/목록) ──────────────────────────────────────────
  {
    id: 'shop-card',
    label: 'shop 카드',
    domain: 'product',
    route: '/shop',
    assertedThisWave: true,
    fields: [
      { field: 'name', render: 'src/components/common/ProductCard.tsx:135-137', kind: 'text' },
      {
        field: 'salePrice',
        render: 'src/components/common/ProductCard.tsx:144-152',
        kind: 'text',
        note: 'salePrice||price. 가격 없으면 "가격 협의"(:152).',
      },
      { field: 'price', render: 'src/components/common/ProductCard.tsx:148', kind: 'text', note: '정가 취소선(할인 시).' },
      {
        field: 'image',
        render: 'src/components/common/ProductCard.tsx:107-127',
        kind: 'image',
        note: '없으면 "상품 이미지 준비 중"(:124).',
      },
      { field: 'brandName', render: 'src/components/common/ProductCard.tsx:45,134', kind: 'text', note: 'brandName ?? brandId.' },
      { field: 'rating', render: 'src/components/common/ProductCard.tsx:158', kind: 'derived' },
      { field: 'reviewCount', render: 'src/components/common/ProductCard.tsx:160', kind: 'derived', note: '"후기 {n}".' },
      { field: 'isBest', render: 'src/components/common/ProductCard.tsx:86-90', kind: 'badge', note: 'true→"BEST".' },
      { field: 'isRecommended', render: 'src/components/common/ProductCard.tsx:91-95', kind: 'badge', note: 'true→"SELECTED".' },
      {
        field: 'stock',
        render: 'src/components/common/ProductCard.tsx:70,96-100',
        kind: 'badge',
        note: 'stock<=0→"잠시 품절", 가격 없음→"판매 준비 중".',
      },
    ],
  },

  // ── 상품: shop 상세 ───────────────────────────────────────────────────
  {
    id: 'shop-detail',
    label: 'shop 상세',
    domain: 'product',
    route: '/shop/[id]',
    assertedThisWave: true,
    fields: [
      { field: 'name', render: 'src/components/shop/ProductDetailClient.tsx:162', kind: 'text', note: 'h1.' },
      { field: 'salePrice', render: 'src/components/shop/ProductDetailClient.tsx:181', kind: 'text', note: '메인 가격.' },
      { field: 'price', render: 'src/components/shop/ProductDetailClient.tsx:183', kind: 'text', note: '취소선(할인 시).' },
      { field: 'options', render: 'src/components/shop/ProductDetailClient.tsx:211-225', kind: 'select', note: '<select> "옵션 선택".' },
      { field: 'detailBlocks', render: 'src/app/shop/[id]/page.tsx:59-79', kind: 'blocks', note: '#story 순서 보존(text→<p>, image→<img>).' },
      { field: 'description', render: 'src/app/shop/[id]/page.tsx:58', kind: 'text', note: '#story body-copy.' },
      { field: 'image', render: 'src/components/shop/ProductDetailClient.tsx:122', kind: 'image' },
      { field: 'images', render: 'src/components/shop/ProductDetailClient.tsx:130-144', kind: 'image', note: '썸네일 rail(>1장일 때).' },
      { field: 'auditPoints', render: 'src/app/shop/[id]/page.tsx:181-190', kind: 'text', note: '#standard Product check 목록.' },
      { field: 'relatedConcernSlugs', render: 'src/app/shop/[id]/page.tsx:120-124', kind: 'text', note: '#details 관련 고민 칩.' },
      { field: 'tags', render: 'src/app/shop/[id]/page.tsx:125-127', kind: 'text', note: '#details 상품 태그 칩.' },
      { field: 'ingredients', render: 'src/app/shop/[id]/page.tsx:106-109', kind: 'text', note: '#details "성분·소재".' },
      { field: 'howToUse', render: 'src/app/shop/[id]/page.tsx:110-116', kind: 'text', note: '#details "급여·사용 방법".' },
      { field: 'recommendedFor', render: 'src/app/shop/[id]/page.tsx:121', kind: 'text', note: '"함께 확인하면 좋아요"(빈값 시 기본 폴백).' },
      { field: 'caution', render: 'src/app/shop/[id]/page.tsx:124', kind: 'text', note: '"조금 더 주의해 주세요"(빈값 시 폴백).' },
      { field: 'shippingFee', render: 'src/components/shop/ProductPurchaseInfo.tsx:22-38', kind: 'text', note: '0→"무료 배송".' },
      { field: 'deliveryEstimate', render: 'src/components/shop/ProductPurchaseInfo.tsx:16-39', kind: 'text', note: '"출고 일정"(빈값 시 shippingNotice→정책 폴백).' },
      { field: 'returnNotice', render: 'src/components/shop/ProductPurchaseInfo.tsx:20-40', kind: 'text', note: '"교환·반품".' },
      { field: 'sellerName', render: 'src/components/shop/ProductPurchaseInfo.tsx:21-41', kind: 'text', note: '"판매 주체"(폴백 "백조오브제 셀렉션").' },
      { field: 'pointsRate', render: 'src/components/shop/ProductDetailClient.tsx:202-207', kind: 'text', note: 'pointsEnabled+rate>0 일 때 "…{rate}% 적립 설정".' },
      { field: 'rating', render: 'src/components/shop/ProductDetailClient.tsx:166', kind: 'derived' },
      { field: 'reviewCount', render: 'src/components/shop/ProductDetailClient.tsx:167', kind: 'derived', note: '"구매평 {n}개".' },
      { field: 'brandName', render: 'src/components/shop/ProductDetailClient.tsx:46,161', kind: 'text', note: 'h1 위 대문자 라벨(brandName ?? brandId).' },
    ],
  },

  // ── 브랜드: 브랜드 카드(/brands 목록) ────────────────────────────────────
  {
    id: 'brand-card',
    label: '브랜드 카드',
    domain: 'brand',
    route: '/brands',
    assertedThisWave: true,
    fields: [
      { field: 'name', render: 'src/components/common/BrandCard.tsx:116', kind: 'text', note: 'h3.' },
      { field: 'logo', render: 'src/components/common/BrandCard.tsx:114', kind: 'image', note: '없으면 name 폴백(:44).' },
      { field: 'description', render: 'src/components/common/BrandCard.tsx:118', kind: 'text' },
      {
        field: 'relatedConcernSlugs',
        render: 'src/components/common/BrandCard.tsx:18-33,50-52',
        kind: 'text',
        note: 'brand-page variant: [0] 만 카테고리 라벨로 매핑. 미매핑 시 "프리미엄 펫 브랜드".',
      },
    ],
  },

  // ── 브랜드: 브랜드 상세(/brands/[id]) ───────────────────────────────────
  {
    id: 'brand-detail',
    label: '브랜드 상세',
    domain: 'brand',
    route: '/brands/[id]',
    assertedThisWave: true,
    fields: [
      { field: 'name', render: 'src/app/brands/[id]/page.tsx:67', kind: 'text', note: 'h1.' },
      { field: 'description', render: 'src/app/brands/[id]/page.tsx:70', kind: 'text', note: '히어로 본문.' },
      { field: 'philosophy', render: 'src/app/brands/[id]/page.tsx:143-145', kind: 'text', note: 'BRAND STORY(philosophy||description).' },
      {
        field: 'relatedConcernSlugs',
        render: 'src/app/brands/[id]/page.tsx:74-79',
        kind: 'text',
        note: '히어로 칩 — concern.title 로 매핑(미매핑 슬러그는 조용히 드롭 :35).',
      },
      {
        field: 'auditReport',
        render: 'src/app/brands/[id]/page.tsx:44,63,163-165',
        kind: 'text',
        assertNow: false,
        note: '현재는 sub-field 중 status 만 공개 렌더(배지/아코디언 헤더). 나머지 rich sub-fields' +
          '(reportNo/auditedAt/headline/summaryTitle/summary/selectionReason/process)는 공개 렌더 ' +
          'PR 진행 중(fe/design-brand-audit-public) — 머지 후 매트릭스/스펙 승격 필요. 그 전까지 ' +
          '공개 검증하지 않고 관리자 왕복(admin round-trip)으로만 검증한다(admin-only-as-of-now).',
      },
      {
        field: 'auditGrade',
        render: '없음(공개 렌더 PR 진행 중)',
        kind: 'text',
        assertNow: false,
        note: 'admin-only-as-of-now — 현재 브랜드 상세에 auditGrade 공개 렌더 없음. 공개 렌더 PR ' +
          '진행 중(fe/design-brand-audit-public) — 머지 후 승격. 관리자 왕복으로만 검증.',
      },
      {
        field: 'officialUrl',
        render: '없음(공개 브랜드 상세 렌더 금지)',
        kind: 'link',
        assertNow: false,
        note: 'admin-only — officialUrl 은 관리자 저장/재열람용 데이터다. 공개 브랜드 상세에는 ' +
          '공식몰 방문 CTA를 렌더하지 않고, 관리자 왕복으로만 검증한다.',
      },
      {
        field: 'auditPoints',
        render: 'src/app/brands/[id]/page.tsx:174-180',
        kind: 'text',
        note: 'AuditAccordion 본문 체크리스트(빈값 시 하드코딩 6개 폴백).',
      },
      {
        field: 'representativeProductIds',
        render: 'src/app/brands/[id]/page.tsx:215,232-234',
        kind: 'text',
        note: '"이 브랜드에서 먼저 보여드리고 싶은 것들" 섹션 — 연결 상품을 ProductCard 로 렌더(빈값 시 전체 상품 폴백 :32).',
      },
      { field: 'logo', render: 'src/app/brands/[id]/page.tsx:92', kind: 'image', note: '상품 없을 때만 히어로 폴백(상품 있으면 미렌더).' },
    ],
  },

  // ── 이하 표면은 이 웨이브 범위 밖(상품·브랜드 아님) — 계약을 문서화만 한다.
  //    향후 웨이브가 라이브 검증을 붙일 때 이 정의를 소비한다. 완전성 게이트의 "미검증 실패"
  //    대상에서 제외(assertedThisWave:false).

  // ── 홈 소식 위젯 ──────────────────────────────────────────────────────
  {
    id: 'home-news',
    label: '홈 소식 위젯',
    domain: 'notice',
    route: '/',
    assertedThisWave: false,
    fields: [
      { field: 'title', render: 'src/components/home/HomeClient.tsx:393', kind: 'text' },
      { field: 'date', render: 'src/components/home/HomeClient.tsx:396', kind: 'text', note: '<time>.' },
      { field: 'id', render: 'src/components/home/HomeClient.tsx:390', kind: 'link', note: 'a[href="/notices/{id}"].' },
    ],
  },

  // ── 홈 후기 레일 / 공용 ReviewCard ───────────────────────────────────
  {
    id: 'home-reviews',
    label: '홈 후기 레일',
    domain: 'review',
    route: '/',
    assertedThisWave: false,
    fields: [
      { field: 'rating', render: 'src/components/common/ReviewCard.tsx:20-33', kind: 'derived', note: 'aria-label "{rating}점".' },
      { field: 'breed/age/usePeriod', render: 'src/components/common/ReviewCard.tsx:35-37', kind: 'text', note: '작성자 정체성(이름 미표기).' },
      { field: 'createdAt', render: 'src/components/common/ReviewCard.tsx:39-41', kind: 'text' },
      { field: 'productName', render: 'src/components/common/ReviewCard.tsx:44-48', kind: 'text' },
      { field: 'content', render: 'src/components/common/ReviewCard.tsx:51-55', kind: 'text' },
      { field: 'image', render: 'src/components/common/ReviewCard.tsx:59-66', kind: 'image', note: 'isPhotoReview && image 둘 다일 때만.' },
    ],
  },

  // ── 공지 목록/상세 ──────────────────────────────────────────────────
  {
    id: 'notice-list',
    label: '공지 목록',
    domain: 'notice',
    route: '/notices',
    assertedThisWave: false,
    fields: [
      { field: 'category', render: 'src/app/notices/page.tsx:76', kind: 'badge' },
      { field: 'title', render: 'src/app/notices/page.tsx:79', kind: 'text' },
      { field: 'writer', render: 'src/app/notices/page.tsx:81', kind: 'text' },
      { field: 'date', render: 'src/app/notices/page.tsx:82', kind: 'text' },
      { field: 'views', render: 'src/app/notices/page.tsx:83', kind: 'text' },
      { field: 'likes', render: 'src/app/notices/page.tsx:84', kind: 'text' },
    ],
  },
  {
    id: 'notice-detail',
    label: '공지 상세',
    domain: 'notice',
    route: '/notices/[id]',
    assertedThisWave: false,
    fields: [
      { field: 'category', render: 'src/app/notices/[id]/page.tsx:31', kind: 'badge' },
      { field: 'title', render: 'src/app/notices/[id]/page.tsx:33', kind: 'text', note: 'h1.' },
      { field: 'writer', render: 'src/app/notices/[id]/page.tsx:36', kind: 'text' },
      { field: 'date', render: 'src/app/notices/[id]/page.tsx:38', kind: 'text' },
      { field: 'views', render: 'src/app/notices/[id]/page.tsx:40', kind: 'text' },
      { field: 'likes', render: 'src/app/notices/[id]/page.tsx:42', kind: 'text' },
      { field: 'content', render: 'src/app/notices/[id]/page.tsx:48-52', kind: 'text' },
    ],
  },

  // ── 장바구니 아이템 (team-lead flagged — 실 버그 표면) ────────────────────
  // 🐛 KNOWN BUG(보고 대상, 이 브랜치에서 고치지 않음 — mim-lane 경계): 카트 행이 brandName 이
  //    아니라 raw brandId 를 렌더한다(cart/page.tsx:112). 다른 모든 표면은 brandName ?? brandId
  //    (ProductCard:45, ProductDetailClient:46). CartItem 은 {productId, optionId?, quantity}만
  //    저장(types:165-169)하고 나머지는 마운트 시 라이브 카탈로그 조인으로 파생 →
  //    삭제된 상품은 행이 조용히 사라지고(:64), 옵션 미스매치 시 가격이 0 으로 빠질 수 있다(:53).
  {
    id: 'cart-item',
    label: '장바구니 아이템',
    domain: 'cart',
    route: '/cart',
    assertedThisWave: false,
    fields: [
      { field: 'image', render: 'src/app/cart/page.tsx:95-107', kind: 'image', note: '없으면 "이미지 준비 중"(:105).' },
      {
        field: 'brandId',
        render: 'src/app/cart/page.tsx:112',
        kind: 'text',
        note: '🐛 raw brandId 렌더(다른 표면은 brandName). 버그 — 별도 mim-lane PR 대상.',
      },
      { field: 'name', render: 'src/app/cart/page.tsx:113-115', kind: 'text' },
      { field: 'optionName', render: 'src/app/cart/page.tsx:116-118', kind: 'text', note: '"옵션: {name}"(옵션 조인 성공 시만).' },
      { field: 'quantity', render: 'src/app/cart/page.tsx:134-136', kind: 'text' },
      { field: 'lineTotal', render: 'src/app/cart/page.tsx:144-146', kind: 'text', note: '가격 없으면 "가격 확인 필요"(:145).' },
    ],
  },

  // ── 문의 탭 ─────────────────────────────────────────────────────────
  {
    id: 'inquiry-tab',
    label: '문의 탭',
    domain: 'inquiry',
    route: '/shop/[id]#qna',
    assertedThisWave: false,
    fields: [
      { field: 'status', render: 'src/components/shop/ProductTabsClient.tsx:334-338', kind: 'badge', note: 'answered→"답변완료".' },
      { field: 'title', render: 'src/components/shop/ProductTabsClient.tsx:341', kind: 'text' },
      { field: 'createdAt', render: 'src/components/shop/ProductTabsClient.tsx:343', kind: 'text' },
      { field: 'content', render: 'src/components/shop/ProductTabsClient.tsx:346-348', kind: 'text', note: '비밀글이면 소유자/관리자만.' },
      { field: 'answer', render: 'src/components/shop/ProductTabsClient.tsx:350-357', kind: 'text' },
    ],
  },

  // ── 리뷰 카드(상세 후기 탭 — 홈 ReviewCard 와 다른 카드) ────────────────
  {
    id: 'review-card',
    label: '리뷰 카드(상세 후기 탭)',
    domain: 'review',
    route: '/shop/[id]#reviews',
    assertedThisWave: false,
    fields: [
      { field: 'rating', render: 'src/components/shop/ProductTabsClient.tsx:256-263', kind: 'derived' },
      { field: 'isBest', render: 'src/components/shop/ProductTabsClient.tsx:265-267', kind: 'badge', note: 'true→"BEST".' },
      { field: 'title', render: 'src/components/shop/ProductTabsClient.tsx:284', kind: 'text' },
      { field: 'content', render: 'src/components/shop/ProductTabsClient.tsx:285-287', kind: 'text' },
      {
        field: 'image',
        render: '없음(fetched-but-hidden)',
        kind: 'image',
        note: '⚠️ ReviewViewItem.image/isPhotoReview(types:448-449) 는 페치되지만 이 카드는 안 그린다 — ' +
          '홈 ReviewCard(#home-reviews)와 divergent contract. 보고 대상.',
      },
    ],
  },
];

/** id 로 표면 조회(없으면 throw — 오타 방지). */
export function getSurface(id: string): Surface {
  const s = FIELD_SURFACE_MATRIX.find((x) => x.id === id);
  if (!s) throw new Error(`fieldSurfaceMatrix: unknown surface id "${id}"`);
  return s;
}

/**
 * 특정 도메인 + assertedThisWave 표면들의 "이 웨이브에 공개 검증 대상" 필드명 집합(완전성 게이트가
 * 소비). assertNow===false 필드(공개 렌더 PR 진행 중 등)는 제외한다.
 */
export function domainSurfaceFields(domain: SurfaceDomain, onlyAssertedThisWave = true): Set<string> {
  const out = new Set<string>();
  for (const s of FIELD_SURFACE_MATRIX) {
    if (s.domain !== domain) continue;
    if (onlyAssertedThisWave && !s.assertedThisWave) continue;
    for (const f of s.fields) {
      if (f.assertNow === false) continue;
      out.add(f.field);
    }
  }
  return out;
}
