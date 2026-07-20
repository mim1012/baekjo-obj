export const CORE_ADMIN_DOMAIN_KEYS = [
  'brands',
  'orders',
  'members',
  'insurance-consultations',
  'survey-recommendations',
  'insurance-content',
  'concerns',
  'partnerships',
  'care-kits',
] as const;

export type CoreAdminDomainKey = (typeof CORE_ADMIN_DOMAIN_KEYS)[number];

export type FullSurfaceStatus = 'verified' | 'admin-only' | 'partial';

export interface FullSurfaceDomain {
  readonly key: CoreAdminDomainKey;
  readonly label: string;
  readonly adminPages: readonly string[];
  readonly adminApiRoutes: readonly string[];
  readonly publicOrMemberSurfaces: readonly string[];
  readonly goldenSpecs: readonly string[];
  readonly operations: readonly string[];
  readonly evidenceNeedles: readonly string[];
  readonly status: FullSurfaceStatus;
  readonly gap?: string;
}

export const FULL_SURFACE_DOMAINS: readonly FullSurfaceDomain[] = [
  {
    key: 'brands',
    label: '브랜드 관리',
    adminPages: ['/admin/brands'],
    adminApiRoutes: ['/api/admin/brands', '/api/admin/brands/[id]'],
    publicOrMemberSurfaces: ['/brands', '/brands/[id]'],
    goldenSpecs: ['admin-crud-brands.spec.ts', 'admin-crud-brand-fields.spec.ts'],
    operations: ['create', 'update', 'visibility', 'delete', 'public-list', 'public-detail'],
    evidenceNeedles: ['/brands', '/brands/${brandId}', '비노출 전환', '삭제'],
    status: 'verified',
  },
  {
    key: 'orders',
    label: '주문 관리',
    adminPages: ['/admin/orders', '/admin/orders/[id]'],
    adminApiRoutes: ['/api/admin/orders', '/api/admin/orders/[id]', '/api/admin/orders/[id]/shipments'],
    publicOrMemberSurfaces: ['/checkout', '/order-complete', '/mypage?tab=orders'],
    goldenSpecs: ['admin-crud-orders.spec.ts', 'member-order-journey.spec.ts'],
    operations: ['create-order', 'status-transition', 'shipment-update', 'member-reflection'],
    evidenceNeedles: ['/mypage?tab=orders', '배송완료', '입금확인', '회원 반영'],
    status: 'verified',
  },
  {
    key: 'members',
    label: '회원 관리',
    adminPages: ['/admin/members', '/admin/members/[id]'],
    adminApiRoutes: ['/api/admin/members', '/api/admin/members/[id]'],
    publicOrMemberSurfaces: ['/signup', '/login', '/mypage'],
    goldenSpecs: [
      'admin-crud-members.spec.ts',
      'admin-crud-members-pending-signup.spec.ts',
      'member-profile.spec.ts',
      'member-password-change.spec.ts',
      'member-social-login-contract.spec.ts',
    ],
    operations: ['signup', 'approval', 'status-change', 'login', 'profile-update', 'password-change'],
    evidenceNeedles: ['/admin/members', '/signup', '/mypage?tab=profile', '새 비밀번호로만 로그인'],
    status: 'verified',
  },
  {
    key: 'insurance-consultations',
    label: '보험 상담',
    adminPages: ['/admin/insurance', '/admin/insurance/[id]'],
    adminApiRoutes: ['/api/admin/insurance', '/api/admin/insurance/[id]'],
    publicOrMemberSurfaces: ['/insurance/apply', '/insurance/complete', '/mypage?tab=insurance'],
    goldenSpecs: ['admin-crud-insurance.spec.ts'],
    operations: ['apply', 'status-change', 'memo-update', 'member-reflection'],
    evidenceNeedles: ['/insurance/apply', '/mypage?tab=insurance', '상담중', '회원 마이페이지'],
    status: 'verified',
  },
  {
    key: 'survey-recommendations',
    label: '맞춤 진단',
    adminPages: ['/admin/survey'],
    adminApiRoutes: ['/api/admin/survey'],
    publicOrMemberSurfaces: ['/diagnosis', '/diagnosis/result'],
    goldenSpecs: ['admin-crud-survey.spec.ts', 'member-diagnosis.spec.ts'],
    operations: ['question-update', 'api-readback', 'public-question-reflection', 'result-flow'],
    evidenceNeedles: ['/admin/survey', '/api/survey', '/diagnosis', '/diagnosis/result'],
    status: 'verified',
  },
  {
    key: 'insurance-content',
    label: '보험 콘텐츠',
    adminPages: ['/admin/insurance-content'],
    adminApiRoutes: ['/api/admin/insurance-content'],
    publicOrMemberSurfaces: ['/insurance'],
    goldenSpecs: ['admin-crud-insurance-content.spec.ts'],
    operations: ['faq-create', 'faq-update', 'faq-delete', 'public-reflection'],
    evidenceNeedles: ['/admin/insurance-content', '/insurance', 'FAQ 등록', '공개 /insurance'],
    status: 'verified',
  },
  {
    key: 'concerns',
    label: '고민 관리',
    adminPages: ['/admin/concerns'],
    adminApiRoutes: ['/api/admin/concerns'],
    publicOrMemberSurfaces: ['/concerns', '/concerns/[slug]'],
    goldenSpecs: ['admin-crud-concerns.spec.ts'],
    operations: ['create', 'recommended-product-link', 'recommended-brand-link', 'delete', 'public-detail'],
    evidenceNeedles: ['/admin/concerns', '/concerns/${expectedSlug}', '추천 상품', '추천 브랜드'],
    status: 'partial',
    gap: '/concerns 목록은 append된 신규 고민이 초기 12건 밖으로 밀릴 수 있어 상세 반영 중심으로 검증한다.',
  },
  {
    key: 'partnerships',
    label: '제휴 관리',
    adminPages: ['/admin/partner-inquiries', '/admin/partners'],
    adminApiRoutes: [
      '/api/admin/partner-inquiries',
      '/api/admin/partner-inquiries/[id]',
      '/api/admin/partners',
    ],
    publicOrMemberSurfaces: ['/landing/care-kit#partner'],
    goldenSpecs: ['admin-crud-partner-inquiries.spec.ts', 'admin-crud-kits-partners.spec.ts'],
    operations: ['public-inquiry-create', 'status-change', 'memo-update', 'partner-create-update-delete'],
    evidenceNeedles: ['/landing/care-kit#partner', '/admin/partner-inquiries', '/admin/partners', '새로고침 후 영속'],
    status: 'verified',
  },
  {
    key: 'care-kits',
    label: '케어키트 관리',
    adminPages: ['/admin/kits'],
    adminApiRoutes: ['/api/admin/kits'],
    publicOrMemberSurfaces: ['/landing/care-kit'],
    goldenSpecs: ['admin-crud-kits-partners.spec.ts'],
    operations: ['create', 'update', 'delete', 'admin-reload-readback', 'public-reflection'],
    evidenceNeedles: ['/admin/kits', '/landing/care-kit', 'getByRole(\'heading\'', 'editedName'],
    status: 'verified',
  },
] as const;

export function domainByKey(key: CoreAdminDomainKey): FullSurfaceDomain {
  const domain = FULL_SURFACE_DOMAINS.find((item) => item.key === key);
  if (!domain) {
    throw new Error(`Unknown full-surface domain: ${key}`);
  }
  return domain;
}
