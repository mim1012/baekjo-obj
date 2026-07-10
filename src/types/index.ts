// ============================================================
// 백조오브제 – 핵심 타입 정의
// ============================================================

/* ── 상품 ─────────────────────────────────────── */
export interface Product {
  id: string;
  brandId: string;
  name: string;
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
  options?: ProductOption[];
  stock: number;
  summary?: string;
  description: string;
  shippingNotice?: string;
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

/* ── 브랜드 ─────────────────────────────────────── */
export interface Brand {
  id: string;
  name: string;
  logo: string;
  description: string;
  philosophy: string;
  auditGrade: 'A+' | 'A' | 'B+' | 'B';
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
  userEmail?: string;
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
  userEmail?: string;
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
}

export interface OrderItem {
  productId: string;
  productName: string;
  optionName?: string;
  quantity: number;
  price: number;
}

export type OrderStatus =
  | '주문접수'
  | '결제완료'
  | '배송준비'
  | '배송중'
  | '배송완료'
  | '취소요청'
  | '취소완료'
  | '환불완료';

/* ── 사용자 ─────────────────────────────────── */
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  petType?: string;
  breed?: string;
  mainConcern?: string;
  companyName?: string;
  businessNumber?: string;
  insuranceCompany?: string;
  insuranceRegNumber?: string;
  activityArea?: string;
  specialty?: string;
  attachedFiles?: string[];
  rejectReason?: string;
  b2bData?: any;
  insuranceData?: any;
  partnerData?: any;
  role: 'user' | 'admin' | 'b2b' | 'insurance' | 'partner';
  status?: 'active' | 'inactive' | 'pending' | 'rejected';
  createdAt: string;
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
  type: 'hospital' | 'funeral' | 'brand' | 'petshop' | 'etc';
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
