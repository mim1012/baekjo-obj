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
  petType: 'dog' | 'cat' | 'both';
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
  isMembersOnlyPrice?: boolean;
  auditPoints?: string[];
  recommendedFor?: string[];
  caution?: string[];
  ingredients?: string;
  howToUse?: string;
  shippingFee?: number;
  isVisible?: boolean;
  isBest: boolean;
  isRecommended: boolean;
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
  name: string;
  officialUrl?: string;
  sourceUrls?: string[];
  logo: string;
  description: string;
  philosophy: string;
  // 데이터/백엔드 전용 필드. 사용자 화면의 등급 배지는 제거되었으나 repo/validate/admin
  // (src/lib/brands/repo.ts, validate.ts, admin/brands)가 이 값을 계속 읽고 관리한다.
  // 정적 목데이터(data/brands.ts)에는 값이 없을 수 있어 선택적. DB repo 는 누락 시 'B' 로 보정.
  auditGrade?: 'A+' | 'A' | 'B+' | 'B';
  auditPoints: string[];
  auditReport?: BrandAuditReport;
  representativeProductIds: string[];
  relatedConcernSlugs: string[];
  isRecommended: boolean;
  isNew?: boolean;
  isVisible?: boolean;
  displayOrder?: number;
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
}

export interface FAQ {
  question: string;
  answer: string;
}

/* ── 후기 ─────────────────────────────────────── */
export interface Review {
  id: string;
  productId: string;
  petType: 'dog' | 'cat';
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
export interface Order {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  items: OrderItem[];
  totalPrice: number;
  deliveryFee: number;
  paymentMethod: string;
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

export interface OrderItem {
  productId: string;
  productName: string;
  optionName?: string;
  quantity: number;
  price: number;
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
  '결제완료',
  '배송준비',
  '배송중',
  '배송완료',
  '취소요청',
  '취소완료',
  '환불완료',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

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
  status?: 'active' | 'inactive' | 'pending' | 'rejected';
  createdAt: string;
  provider?: 'kakao' | 'naver' | 'email';
  profileImage?: string;
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
  signupData?: Record<string, unknown>;
}

/* ── Q&A ─────────────────────────────────────── */
export interface QnA {
  id: string;
  productId: string;
  productName: string;
  question: string;
  answer?: string;
  status: '답변대기' | '답변완료';
  isSecret: boolean;
  writerName: string;
  createdAt: string;
  answeredAt?: string;
  isVisible?: boolean;
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
  location: string;
  items: string[];
  purpose: string;
  partnerId?: string;
  stock?: number;
  isVisible: boolean;
  description?: string;
}

/* ── B2B 협력처 ──────────────────────────────── */
export interface Partner {
  id: string;
  name: string;
  type: 'hospital' | 'funeral' | 'brand' | 'petshop' | 'hotel' | 'etc';
  contactPerson: string;
  phone: string;
  address: string;
  cooperationType: string;
  providedKits: string[];
  status: '문의' | '상담중' | '제안서 발송' | '계약 검토' | '계약 완료' | '납품 준비' | '운영중' | '보류' | '종료';
  memo?: string;
  isContracted: boolean;
  isDelivered: boolean;
}
