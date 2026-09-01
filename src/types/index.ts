// ============================================================
// 백조오브제 – 핵심 타입 정의
// ============================================================

/* ── 상품 ─────────────────────────────────────── */
export interface Product {
  id: string;
  brandId: string;
  name: string;
  /** 브랜드 페이지는 상품 정보 수집용으로만 보관하며 고객 화면에는 노출하지 않습니다. */
  sourceUrl?: string;
  sourceVerifiedAt?: string;
  catalogStatus?: 'draft' | 'ready' | 'sold_out';
  price: number | null;
  salePrice?: number | null;
  rating: number;
  reviewCount: number;
  category: string;
  categorySlug?: string;
  categoryName?: string;
  lifestyleCategory: string;
  concernTags: string[];
  relatedConcernSlugs?: string[];
  /** 상품 카테고리 관리에서 등록하는 반려동물 연결값. */
  petType: string;
  ageGroup: string;
  image: string;
  images?: string[];
  detailBlocks?: ProductDetailBlock[];
  options?: ProductOption[];
  stock: number;
  summary?: string;
  description: string;
  shippingNotice?: string;
  deliveryEstimate?: string;
  returnNotice?: string;
  sellerName?: string;
  tags?: string[];
  brandName?: string;
  auditPoints?: string[];
  recommendedFor?: string[];
  caution?: string[];
  ingredients?: string;
  howToUse?: string;
  shippingFee?: number;
  isVisible?: boolean;
  isBest: boolean;
  isRecommended: boolean;
  /** 홈의 베스트·추천 상품 영역 순서. */
  homeFeaturedOrder?: number;
  /** 스토어 상단 추천 상품 영역 순서. */
  shopFeaturedOrder?: number;
  /** 스토어 전체 상품·브랜드 상품의 기본 순서. */
  catalogOrder?: number;
}

export interface ProductOption {
  id: string;
  name: string;
  price: number;
  priceDiff?: number;
  stock: number;
}

/** 상품 상세 본문 블록 — 네이버식 상세(텍스트·이미지 순차 삽입). 추후 업체 관리자 에디터가 편집. */
export type ProductDetailBlock =
  | { type: 'text'; content: string }
  | { type: 'image'; src: string; alt?: string };

/* ── 브랜드 ─────────────────────────────────────── */
export interface Brand {
  id: string;
  /** 공개 URL(/brands/[slug]) 전용 표시값. id와 달리 브랜드명이 바뀌어도 재생성하지 않는다
   *  — 이미 퍼진 링크·SEO 색인이 깨지지 않도록 최초 발급 후 고정, 관리자가 필요시 수동 변경. */
  slug: string;
  name: string;
  officialUrl?: string;
  sourceUrls?: string[];
  logo: string;
  description: string;
  philosophy: string;
  displayTags?: string[];
  highlights?: string[];
  summaryCategoryNote?: string;
  summaryCategoryLabel?: string;
  summaryConcernLabel?: string;
  summaryConcernNote?: string;
  auditPoints: string[];
  auditReport?: BrandAuditReport;
  representativeProductIds: string[];
  relatedConcernSlugs: string[];
  isRecommended: boolean;
  isNew?: boolean;
  isVisible?: boolean;
  displayOrder?: number;
  shipping?: BrandShippingPolicy;
  wordmarkColor?: string;
  wordmarkImage?: string;
}
export interface BrandShippingPolicy {
  carrierLabel?: string;
  defaultCarrier?: import('@/lib/carriers').CarrierCode;
  shippingFee?: number;
  shippingFeeLabel?: string;
  freeShippingThreshold?: number;
  extraFeeNotice?: string;
  dispatchEstimate?: string;
  returnAddress?: string;
  returnShippingFee?: number;
  exchangeShippingFee?: number;
  returnPolicy?: string;
  returnExclusions?: string;
  asNotice?: string;
  supportContact?: string;
  supportHours?: string;
  supportEmail?: string;
  supportKakaoLabel?: string;
}

export interface BrandAuditReport {
  reportNo: string;
  auditedAt: string;
  status: string;
  headline: string;
  summaryTitle: string;
  summary: string;
  selectionReason: string;
  process: string[];
  checkpoints?: string[];
  materialReview?: string[];
  curatorNote?: string[];
  auditConclusion?: string[];
}

/* ── 고민 ─────────────────────────────────────── */
export interface Concern {
  slug: string;
  title: string;
  icon: string;
  shortDescription: string;
  description: string;
  symptoms: string[];
  causes: string[];
  recommendedProductIds: string[];
  recommendedBrandIds: string[];
  insuranceCta: string;
  faq: FAQ[];
  heroTitle?: string;
  heroDescription?: string;
  heroImage?: string;
  heroImagePosition?: string;
  backLabel?: string;
  badgeSuffix?: string;
  quickGuideItems?: ConcernQuickGuideItem[];
  hospitalSigns?: string[];
  signalsTitle?: string;
  hospitalTitle?: string;
  hospitalDescription?: string;
  productsTitle?: string;
  productsLinkLabel?: string;
  productsEmptyText?: string;
  insuranceTitle?: string;
  insuranceDescription?: string;
  insuranceButtonLabel?: string;
  insuranceButtonHref?: string;
  insuranceImage?: string;
  insuranceImageAlt?: string;
  reviewsTitle?: string;
  reviewsLinkLabel?: string;
  faqTitle?: string;
}

export interface ConcernQuickGuideItem {
  title: string;
  description: string;
  href: string;
  icon: 'search' | 'home' | 'hospital';
}

export interface FAQ {
  question: string;
  answer: string;
}

/* ── 후기 ─────────────────────────────────────── */
export interface Review {
  id: string;
  productId: string;
  petType: 'dog' | 'cat' | 'small' | 'other';
  breed: string;
  age: string;
  usePeriod: string;
  rating: number;
  content: string;
  image?: string;
  isPhotoReview: boolean;
  createdAt: string;
  isVisible?: boolean;
  isBest?: boolean;
}

/* ── 공지사항 ─────────────────────────────────── */
export interface Notice {
  id: string;
  title: string;
  writer: string;
  date: string;
  views: number;
  likes: number;
  content: string;
  category?: 'notice' | 'event' | 'brand';
}

/* ── 장바구니 ─────────────────────────────────── */
export interface CartItem {
  productId: string;
  optionId?: string;
  quantity: number;
}

/* ── 보험 분석 신청 ─────────────────────────── */
export interface InsuranceApplication {
  id: string;
  name: string;
  phone: string;
  petName: string;
  petType: '강아지' | '고양이' | string;
  breed: string;
  petAge: number;
  coverageNeeds: string[];
  message: string;
  privacyAgree: boolean;
  thirdPartyAgree: boolean;
  status: InsuranceStatus;
  memo?: string;
  contacted?: boolean;
  createdAt: string;
  petBreed?: string;
  hasCurrentInsurance?: boolean;
  currentInsuranceName?: string;
  medicalHistory?: string;
  targetPremium?: string;
  neutered?: boolean;
  gender?: string;
  concerns?: string;
  ownerName?: string;
  /** 업로드된 보험 증권 파일 경로(비공개 버킷 insurance-docs 내부 path, publicUrl 아님).
   * POST /api/insurance/upload 가 반환한 값을 그대로 넘긴다. 관리자만 signed URL로 열람한다. */
  insuranceCertPath?: string;
}

export type InsuranceStatus =
  | '접수'
  | '상담중'
  | '완료'
  | '보류'
  | '신청완료'
  | '분석중'
  | '분석완료';

/* ── 주문 ─────────────────────────────────────── */
export interface BankTransferAccount {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export interface Order {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  items: OrderItem[];
  totalPrice: number;
  deliveryFee: number;
  deliveryFeeBreakdown?: DeliveryFeeBreakdown[];
  paymentMethod: string;
  bankTransferAccount?: BankTransferAccount;
  orderStatus: OrderStatus;
  paymentStatus: string;
  deliveryStatus: string;
  trackingNumber?: string;
  deliveryMemo?: string;
  createdAt: string;
  carrier?: string;
  paymentKey?: string;
  paidAt?: string;
  expiresAt?: string;
  /** '승인중' 고아 대사(reconcile) 재시도 횟수. 웹훅 웨이브(dead-letter) 전용 — 기계만 갱신. */
  reclaimAttempts?: number;
  /** 마지막 reconcile 재시도 실패 사유(진단용). 기계만 갱신. */
  reclaimError?: string;
}

export interface DeliveryFeeBreakdown {
  brandId: string;
  brandName?: string;
  subtotal: number;
  shippingFee: number;
  appliedDeliveryFee: number;
  isFreeShipping: boolean;
  freeShippingThreshold?: number;
}

export interface OrderItem {
  productId: string;
  productName: string;
  /**
   * 선택한 상품 옵션의 id. 서버는 이 값으로 카탈로그 options를 조회해 단가(기본가 + priceDiff)와
   * optionName을 파생한다 — 클라이언트가 보낸 optionName·가격은 신뢰하지 않는다. 옵션 없는 주문과
   * 레거시 주문(이 필드 도입 전 items jsonb)엔 없으므로 optional이다.
   */
  optionId?: string;
  optionName?: string;
  quantity: number;
  price: number;
  /**
   * 주문 시점의 브랜드를 스냅샷한다 — 상품이 삭제·재브랜딩돼도 과거 주문의 판매자 귀속이
   * 흔들리지 않게. 레거시 주문(이 필드 도입 전 생성된 items jsonb)엔 없으므로 optional이다.
   * 현재 소비자는 없다 — dashboardStats.ts는 아직 이 필드를 읽지 않고 products 조인으로
   * brandIdByProductId를 만들어 귀속한다(dashboardStats.ts:143). 이 필드를 실제로 읽어
   * 레거시 폴백(조인) 구조로 바꾸는 것은 후속 과제다.
   */
  brandId?: string;
}

/**
 * 입점업체(브랜드)별 배송 정보 — 한 주문이 여러 브랜드 상품을 포함할 때 업체마다 독립된
 * 송장을 붙일 수 있게 한다(0034 마이그레이션). Order 자체의 carrier/trackingNumber/
 * deliveryStatus는 레거시 단일 배송 경로로 그대로 두고 건드리지 않는다.
 */
export interface Shipment {
  id: string;
  orderId: string;
  brandId: string;
  carrier?: string;
  trackingNumber?: string;
  deliveryStatus: string;
  shippedAt?: string;
  /** '배송완료' 전이 시각 — 자동 구매확정 크론(배송완료 후 N일)의 기준점. 0041 마이그레이션. */
  deliveredAt?: string;
  /** '구매확정' 전이 시각(고객 버튼 또는 자동확정). 0041 마이그레이션. */
  confirmedAt?: string;
  createdAt: string;
}

/**
 * POST /api/payments/confirm 응답 전용 축소 필드(가산 타입, Order 본체는 무변경).
 * 무인증 공개 엔드포인트라 PII(customerName/phone/address/items)는 내려주지 않고
 * 화면(order-complete)이 승인 결과를 표시하는 데 필요한 최소 필드만 담는다.
 */
export type ConfirmedOrderSummary = Pick<
  Order,
  'id' | 'orderStatus' | 'paymentStatus' | 'totalPrice' | 'deliveryFee' | 'paidAt'
>;

export const ORDER_STATUSES = [
  '주문접수',
  '취소요청',
  '취소완료',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * 결제 상태 — DB(orders.payment_status)에 실제로 들어가는 값의 전수.
 * 근거(코드로 확인한 생산 지점):
 * - 주문 생성: '입금대기'(무통장) / '결제대기'(카드) — src/app/api/orders/route.ts
 * - 승인 착수: '승인중' — claimOrderForConfirmation (src/lib/orders/repo.ts)
 * - 승인 확정: '결제완료' — setOrderPaid (src/lib/orders/repo.ts)
 * - 관리자 수동 변경: '결제취소' / '환불완료' — src/app/api/admin/orders/[id]/route.ts
 * Order.paymentStatus 자체는 레거시 호환 때문에 여전히 string이지만, "돈이 실제로 들어왔는가"를
 * 판정해야 하는 곳(매출 집계 등)은 반드시 PAID_PAYMENT_STATUS를 진실 소스로 쓴다.
 */
export const PAYMENT_STATUSES = [
  '결제대기',
  '입금대기',
  '승인중',
  '결제완료',
  '결제취소',
  '환불완료',
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** 결제가 실제로 확정된 유일한 값(setOrderPaid가 쓰는 값). 매출 집계의 진실 소스. */
export const PAID_PAYMENT_STATUS: PaymentStatus = '결제완료';

/**
 * 배송 상태 — Order.deliveryStatus가 실제로 받아들이는 값의 전수. `src/app/api/admin/orders/[id]/route.ts`
 * 와 `src/components/admin-new/orders/orderFunnel.ts`(목록 퍼널 파생)가 이 배열을 직접 import해서
 * 쓴다(로컬 리터럴 사본 금지 — §4.6: 화이트리스트를 두 곳에 두면 드리프트). Order.deliveryStatus
 * 자체는 레거시 호환 때문에 여전히 string이지만(위 PaymentStatus와 동일한 이유), 스마트택배
 * 연동처럼 "이 배송 상태로 정규화한다"를 타입으로 강제해야 하는 새 코드는 로컬 유니온을 만들지
 * 말고 이 타입을 재사용한다(§4: 데이터 모양은 설계도 한 장).
 */
export const DELIVERY_STATUSES = ['배송전', '배송준비', '배송중', '배송완료'] as const;

export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

/**
 * 업체별 배송(Shipment.deliveryStatus)이 받아들이는 값의 전수 — DELIVERY_STATUSES에 '구매확정'을
 * 가산한 상위집합. '구매확정'은 고객 버튼(D-2, POST .../confirm) 또는 자동확정 크론만이 만드는
 * 종결 상태라 **주문 단위 레거시(Order.deliveryStatus)에는 존재하지 않는다** — 주문 단위 화이트리스트
 * (관리자 PATCH·상세 OrderStatusPanel)는 계속 DELIVERY_STATUSES를 쓰고, 여기에 '구매확정'을
 * 섞지 말 것(관리자가 주문 단위 select에서 고객 확정을 임의 세팅하는 경로가 생긴다).
 */
export const SHIPMENT_DELIVERY_STATUSES = [...DELIVERY_STATUSES, '구매확정'] as const;

export type ShipmentDeliveryStatus = (typeof SHIPMENT_DELIVERY_STATUSES)[number];

/** 고객 구매확정이 가능한 유일한 직전 상태(confirmShipmentIfDelivered의 WHERE 조건). */
export const CONFIRMABLE_DELIVERY_STATUS: DeliveryStatus = '배송완료';

/* ── 사용자 ─────────────────────────────────── */
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  petType?: string;
  breed?: string;
  mainConcern?: string;
  role: 'user' | 'admin' | 'b2b' | 'insurance' | 'partner';
  status?: 'active' | 'inactive' | 'pending' | 'rejected' | 'withdrawn';
  createdAt: string;
  provider?: 'kakao' | 'naver' | 'email';
  profileImage?: string;
  profileCompleted?: boolean;
  emailVerified?: boolean;
  companyName?: string;
  businessNumber?: string;
  insuranceCompany?: string;
  insuranceRegNumber?: string;
  activityArea?: string;
  specialty?: string;
  attachedFiles?: string[];
  rejectReason?: string;
  b2bData?: Record<string, unknown>;
  insuranceData?: Record<string, unknown>;
  partnerData?: Record<string, unknown>;
  /** 입점업체(partner)가 관리하는 브랜드 ID 목록 */
  managedBrandIds?: string[];
  /** 운영자가 발급한 초기 비밀번호 사용 중 — 로그인 후 비밀번호 변경을 유도한다(강제 아님) */
  mustChangePassword?: boolean;
  signupData?: Record<string, unknown>;
}

export interface MemberAddress {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  postalCode: string;
  addressLine1: string;
  addressLine2?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/* ── 사용자 작성 구매평 ───────────────────────── */
export interface ProductReview {
  id: string;
  userId: string;
  orderId: string;
  /** OrderItem 고유 id 도입 시 채움 — 현재는 reviewTargetKey(주문+상품+옵션)로 유일성을 보장한다. */
  orderItemId?: string;
  /** 중복 방지용 복합 키: `${orderId}:${productId}:${optionName ?? 'default'}` */
  reviewTargetKey: string;
  productId: string;
  brandId: string;
  rating: number;
  title?: string;
  content: string;
  status: 'published' | 'hidden';
  createdAt: string;
  updatedAt: string;
}

/** 관리자 moderation 목록 전용 — 상품명을 곁들인 조회 결과(가산). 저장 계약이 아니라 응답 전용 뷰. */
export interface AdminProductReview extends ProductReview {
  productName: string;
}

/* ── 사용자 작성 상품문의 ─────────────────────── */
export interface ProductInquiry {
  id: string;
  userId: string;
  productId: string;
  brandId: string;
  title: string;
  content: string;
  isSecret?: boolean;
  status: 'waiting' | 'answered';
  answer?: string;
  answeredBy?: string;
  answeredAt?: string;
  createdAt: string;
  updatedAt: string;
}

/* ── 통합 구매평 뷰 어댑터 ───────────────────── */
export type ReviewViewItem = {
  id: string;
  source: 'seed' | 'user';
  productId: string;
  brandId?: string;
  userId?: string;
  rating: number;
  title?: string;
  content: string;
  createdAt: string;
  status?: 'published' | 'hidden';
  editable: boolean;
  /** 시드 리뷰 전용 */
  breed?: string;
  age?: string;
  usePeriod?: string;
  image?: string;
  isPhotoReview?: boolean;
  isBest?: boolean;
};

/* ── 통합 문의 뷰 어댑터 ─────────────────────── */
export type InquiryViewItem = {
  id: string;
  source: 'seed' | 'user';
  productId: string;
  brandId?: string;
  userId?: string;
  title?: string;
  question?: string;
  content: string;
  answer?: string;
  answeredBy?: string;
  answeredAt?: string;
  status: 'waiting' | 'answered';
  isSecret?: boolean;
  writerName?: string;
  createdAt: string;
  editable: boolean;
};

/* ── 라이프스타일 카테고리 ─────────────────── */
export interface LifestyleCategory {
  slug: string;
  nameEn: string;
  nameKo: string;
  description: string;
  image: string;
}

/* ── 전문가 추천 ─────────────────────────────── */
export interface ExpertRecommendation {
  id: string;
  type: '수의사' | '영양사' | '훈련사';
  relatedConcerns: string[];
  reason: string;
  recommendedProductIds: string[];
  status: string;
}

/* ── 맞춤 진단 설문 ──────────────────────────── */
export interface SurveyOption {
  id: string;
  label: string;
  value: string;
  description?: string;
}

export interface SurveyQuestion {
  id: string;
  title: string;
  type: 'single' | 'multiple';
  options: SurveyOption[];
  dependsOn?: {
    questionId: string;
    value: string;
  };
}

export interface SurveyResultRule {
  id: string;
  condition: {
    /** 관리자가 질문과 답을 직접 연결하는 현재 규칙. 이전 고정 필드는 하위 호환용이다. */
    answers?: Array<{
      questionId: string;
      optionValue: string;
    }>;
    petType?: string;
    ageGroup?: string;
    concern?: string;
    lifestyle?: string;
  };
  recommendation: {
    direction: string;
    categorySlug: string;
    brandIds: string[];
    productIds: string[];
    needInsuranceAnalysis: boolean;
    recommendKit: boolean;
  };
}

/* ── 케어 키트 ────────────────────────────────── */
export interface CareKit {
  id: string;
  name: string;
  type: 'hospital' | 'vitality' | 'funeral' | 'welcome' | 'sample';
  target: string;
  items: string[];
  purpose: string;
  isVisible: boolean;
  description?: string;
}

export type PartnerType = 'hospital' | 'funeral' | 'brand' | 'hotel' | 'etc';

/* ── B2B 제휴 문의(공개 폼 제출 → 관리자 접수함) ─────────────────────────
 * /landing/care-kit 공개 폼에서 접수되는 "제출 레코드 누적" 도메인.
 * status 는 배열을 SSOT 로 두고 타입을 파생한다(ORDER_STATUSES 관용구, §10-9). */
export const PARTNER_INQUIRY_STATUSES = ['접수', '상담중', '완료', '보류'] as const;

export type PartnerInquiryStatus = (typeof PARTNER_INQUIRY_STATUSES)[number];

export interface PartnerInquiry {
  id: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  partnerType: PartnerType;
  message: string;
  status: PartnerInquiryStatus;
  memo?: string;
  createdAt: string;
}

/* ── 관리자 대시보드 요약(가산 타입, GET /api/admin/dashboard 전용) ────── */
export interface AdminDashboardRecentOrder {
  id: string;
  customerName: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
}

export interface AdminDashboardPendingApplication {
  id: string;
  name: string;
  companyName?: string;
  role: 'b2b' | 'insurance' | 'partner';
  status: string;
}

/**
 * 브랜드별 대시보드 통계(가산 타입). 새 테이블 없이 brands·products·orders·inquiries 조인으로 계산한다.
 * 설계: docs/archive/admin-dashboard-uiux-improvement.md §6-3.
 */
export interface AdminDashboardBrandStat {
  brandId: string;
  brandName: string;
  logo?: string;
  isVisible: boolean;
  /** 브랜드에 속한 전체 상품 수(숨김 포함). */
  productCount: number;
  /** isVisible !== false 인 상품 수. */
  visibleProductCount: number;
  /** 정보 미완성 상품 수 — 가격·대표이미지·상세·재고(품절) 중 하나라도 결손(대시보드 클라이언트 집계와 동일 기준). */
  incompleteCount: number;
  /**
   * 기간(since 이후) 내 **결제 확정('결제완료')** 주문 금액(원) — 아이템 단위로 브랜드에 귀속.
   * 미결제(결제대기·입금대기·승인중)와 취소완료·환불완료 주문은 제외된다.
   */
  orderAmount: number;
  /** status === 'waiting' 인 상품문의 수. */
  unansweredInquiryCount: number;
  /** 브랜드 노출 순서(§6-4). 미지정 브랜드는 undefined(정렬 시 뒤로). */
  displayOrder?: number;
}

/** 브랜드 통계의 해석에 필요한 메타(가산 optional). UI가 기간·결손을 하드코딩하지 않게 한다. */
export interface AdminDashboardBrandStatsMeta {
  /** 금액 집계 시작 시각(ISO). 서버 상수를 바꿔도 화면 라벨이 거짓말하지 않도록 값으로 내린다. */
  since: string;
  /** 금액 집계 기간(일). */
  windowDays: number;
  /** 어느 브랜드에도 매칭되지 않아 집계에서 빠진 상품 수. */
  unmatchedProductCount: number;
  /** repo 조회 상한(LIST_CAP)에 도달해 모집단 일부가 잘렸을 수 있음 — 숫자를 신뢰하면 안 된다. */
  truncated?: boolean;
  /** 일부 소스 조회 실패로 해당 지표가 결손됨(0으로 내려감). */
  partial?: boolean;
  /**
   * partial=true일 때 어느 소스가 실패했는지('orders'|'products'|'inquiries' 등). partial 하나만으로는
   * products 실패(productCount·incompleteCount 결손)와 orders 실패(orderAmount 결손)를 구분할 수 없어
   * 가산했다. 빈 배열/undefined면 결손 없음.
   */
  failedSources?: string[];
}

export interface AdminDashboardSummary {
  recentOrders: AdminDashboardRecentOrder[];
  /** 가입 승인 대기(B2B/보험사/입점업체) 회원 — 별도 신청서 테이블이 없어 members를 role/status로 좁혀 구성. */
  recentApplications: AdminDashboardPendingApplication[];
  /** 브랜드별 통계(가산 optional — 집계 실패 시 생략되고 나머지 요약은 그대로 내려간다). */
  brandStats?: AdminDashboardBrandStat[];
  /** brandStats의 메타(기간·미매칭 상품 수·절삭/부분실패 플래그). brandStats와 함께 내려간다. */
  brandStatsMeta?: AdminDashboardBrandStatsMeta;
}

/**
 * 스마트택배(Sweet Tracker) 조회 결과 — src/lib/tracking/sweettracker.ts 공용 데이터 모양.
 * §4(콘센트 규칙): 앱이 쓰는 데이터 형태는 이 파일에만 정의한다. 벤더 wire-format(원본 응답 필드)은
 * 여기 두지 않는다 — sweettracker.ts 내부의 RawTrackingInfoResponse/RawTrackingDetail 참고.
 */
export type TrackingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface TrackingStep {
  time: string;
  where: string;
  kind: string;
}

export type TrackingResult =
  | {
      ok: true;
      level: TrackingLevel;
      complete: boolean;
      steps: TrackingStep[];
      deliveryStatus: DeliveryStatus;
      invoiceNo: string;
    }
  | {
      ok: false;
      reason: 'not-found' | 'invalid-carrier' | 'no-api-key' | 'quota-or-api-error';
      message?: string;
    };

export type OrderShipmentTrackingResponse =
  | {
      readonly ok: true;
      readonly source: 'sweettracker';
      readonly deliveryStatus: DeliveryStatus;
      readonly complete: boolean;
      readonly level: TrackingLevel;
      readonly invoiceNo: string;
      readonly steps: readonly TrackingStep[];
      readonly refreshedAt: string;
    }
  | {
      readonly ok: false;
      readonly source: 'sweettracker';
      readonly reason:
        | 'missing-shipment'
        | 'not-found'
        | 'invalid-carrier'
        | 'no-api-key'
        | 'quota-or-api-error';
      readonly refreshedAt: string;
    }
  | {
      readonly ok: false;
      readonly source: 'client';
      readonly reason: 'request-failed';
    };
