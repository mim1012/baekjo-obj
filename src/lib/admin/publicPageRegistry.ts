/**
 * 고객 홈페이지 화면과 관리자 책임을 연결하는 단일 기준표.
 *
 * 페이지 관리 화면, 대시보드, 회귀 테스트가 이 파일을 함께 읽는다. 새 고객 화면을 만들면
 * 여기에 관리 위치를 등록하지 않는 한 테스트가 실패하도록 해, "화면은 생겼는데 관리 메뉴는
 * 없는" 상태를 막는다. 보험 화면은 이번 관리자 개편 범위에서 명시적으로 제외한다.
 */

export type PublicPageGroup =
  | '공통·홈'
  | '상품·브랜드'
  | '가이드·콘텐츠'
  | '서비스'
  | '주문·회원'
  | '정책';

export type AdminCapability =
  | '등록'
  | '수정'
  | '삭제'
  | '노출'
  | '순서'
  | '게시'
  | '답변'
  | '상태'
  | '조회';

export interface PublicPageAdminAction {
  label: string;
  adminRoute: string;
  description: string;
  capabilities: AdminCapability[];
  /** CMS 편집 화면이면 게시 상태를 결합할 때 쓰는 page key. */
  cmsPageKey?: string;
  saveMode: '게시 후 반영' | '저장 즉시 반영' | '고객 행동으로 생성';
}

export interface PublicPageRegistryEntry {
  key: string;
  title: string;
  /** 동적 화면도 직원이 이해할 수 있는 한글 주소로 표시한다. */
  publicRoute: string;
  /** 공개 화면 버튼이 실제로 열 수 있는 대표 주소. */
  previewRoute: string;
  /** src/app 기준 실제 route pattern. 자동 커버리지 감사에 사용한다. */
  routePattern: string;
  group: PublicPageGroup;
  screenType: '콘텐츠 화면' | '목록 화면' | '상세 화면' | '기능 화면';
  description: string;
  editableAreas: string[];
  systemAreas?: string[];
  actions: PublicPageAdminAction[];
  /** 공통 영역에서 이 기능을 켠 경우에만 현재 고객 화면 목록에 표시한다. */
  featureFlag?: 'experts';
}

const content = (
  label: string,
  cmsPageKey: string,
  description: string,
): PublicPageAdminAction => ({
  label,
  adminRoute: `/admin/pages/${cmsPageKey}`,
  description,
  capabilities: ['수정', '노출', '순서', '게시'],
  cmsPageKey,
  saveMode: '게시 후 반영',
});

const manager = (
  label: string,
  adminRoute: string,
  description: string,
  capabilities: AdminCapability[] = ['등록', '수정', '삭제', '노출', '순서'],
): PublicPageAdminAction => ({
  label,
  adminRoute,
  description,
  capabilities,
  saveMode: '저장 즉시 반영',
});

const operation = (
  label: string,
  adminRoute: string,
  description: string,
  capabilities: AdminCapability[] = ['조회', '상태'],
): PublicPageAdminAction => ({
  label,
  adminRoute,
  description,
  capabilities,
  saveMode: '고객 행동으로 생성',
});

export const PUBLIC_PAGE_GROUPS: PublicPageGroup[] = [
  '공통·홈',
  '상품·브랜드',
  '가이드·콘텐츠',
  '서비스',
  '주문·회원',
  '정책',
];

export const PUBLIC_PAGE_REGISTRY: PublicPageRegistryEntry[] = [
  {
    key: 'site-shell',
    title: '전체 화면 공통 영역',
    publicRoute: '모든 고객 화면',
    previewRoute: '/',
    routePattern: '/_site-shell',
    group: '공통·홈',
    screenType: '콘텐츠 화면',
    description: '모든 화면 위·아래에 반복되는 로고, 메뉴, 회사 정보와 상담 연결입니다.',
    editableAreas: ['상단 메뉴', '하단 메뉴', '로고', '회사·고객센터 정보', 'SNS·상담 주소', '서비스 노출'],
    actions: [content('공통 영역 수정', 'site-shell', '헤더와 푸터에 공통으로 표시되는 내용을 수정합니다.')],
  },
  {
    key: 'home',
    title: '홈 화면',
    publicRoute: '/',
    previewRoute: '/',
    routePattern: '/',
    group: '공통·홈',
    screenType: '콘텐츠 화면',
    description: '고객이 처음 보는 메인 화면입니다.',
    editableAreas: ['대표 배너', '바로가기', '추천 영역', '브랜드 영역', '새 소식', '후기', '이미지·버튼·노출 순서'],
    actions: [
      manager('홈 화면 편집', '/admin/settings', '홈의 문구·이미지·버튼·카드·노출 순서를 편집합니다.', ['등록', '수정', '삭제', '노출', '순서', '게시']),
      manager('홈 진열 상품', '/admin/products/display', '홈의 베스트·추천 상품을 지정합니다.', ['수정', '노출']),
      manager('홈 새 소식', '/admin/notices', '홈에 표시되는 소식을 등록·수정·삭제합니다.', ['등록', '수정', '삭제']),
      manager('홈 후기', '/admin/reviews', '홈에 표시되는 공개 후기를 등록·수정합니다.'),
    ],
  },
  {
    key: 'shop',
    title: '상품 목록',
    publicRoute: '/shop',
    previewRoute: '/shop',
    routePattern: '/shop',
    group: '상품·브랜드',
    screenType: '목록 화면',
    description: '상품 검색·필터와 상품 카드가 보이는 스토어 화면입니다.',
    editableAreas: ['첫 화면 제목·설명', '추천 영역 이름', '빈 결과 안내', '상품 카드', '카테고리', '고민 필터', '진열 상태'],
    actions: [
      content('상품 목록 문구', 'shop', '스토어 첫 화면과 추천·빈 결과 안내 문구를 수정합니다.'),
      manager('상품 등록·수정', '/admin/products', '상품 카드와 판매 정보를 등록·수정·삭제합니다.', ['등록', '수정', '삭제']),
      manager('상품 진열', '/admin/products/display', '추천·베스트·스토어 노출을 바꿉니다.', ['수정', '노출']),
      manager('카테고리', '/admin/categories', '상품 분류와 필터 순서를 관리합니다.'),
      manager('상품 카드 태그', '/admin/products/tags', '배변·생활·피부·냄새처럼 현재 상품 카드와 스토어 고민 필터에 보이는 태그를 관리합니다.'),
    ],
  },
  {
    key: 'product-detail',
    title: '상품 상세',
    publicRoute: '/shop/상품',
    previewRoute: '/shop',
    routePattern: '/shop/[id]',
    group: '상품·브랜드',
    screenType: '상세 화면',
    description: '상품 사진·가격·옵션·설명·배송·후기·문의가 보이는 구매 화면입니다.',
    editableAreas: ['상품 기본 정보', '가격·재고·옵션', '사진', '상세 본문 블록', '배송·판매자 안내', '고민 태그', '후기', '문의 답변'],
    actions: [
      manager('상품 기본 정보', '/admin/products', '수정할 상품을 찾아 가격·재고·사진·옵션을 수정합니다. 공개 여부는 상품 진열에서 관리합니다.', ['등록', '수정', '삭제']),
      manager('상세페이지 본문', '/admin/products', '상품 목록의 상세페이지 편집 버튼에서 글·이미지 블록을 관리합니다.', ['등록', '수정', '삭제', '순서']),
      manager('상품 카드 태그', '/admin/products/tags', '상품 카드에 보이는 태그 이름과 스토어 필터 노출을 관리합니다.'),
      operation('상품 문의 처리', '/admin/inquiries', '고객이 상품 화면에서 남긴 질문에 답변하거나 삭제합니다.', ['조회', '답변', '상태', '삭제']),
      manager('상품 후기', '/admin/reviews', '상품 상세에 함께 표시되는 공개 후기를 관리합니다.'),
    ],
  },
  {
    key: 'brands',
    title: '브랜드 목록',
    publicRoute: '/brands',
    previewRoute: '/brands',
    routePattern: '/brands',
    group: '상품·브랜드',
    screenType: '목록 화면',
    description: '브랜드 소개 첫 화면, 선정 기준과 브랜드 카드 목록입니다.',
    editableAreas: ['첫 화면 문구·이미지', '선정 기준 카드', '스포트라이트 문구', '입점 안내', '브랜드 카드·순서·노출'],
    actions: [
      content('브랜드 목록 문구', 'brands', '브랜드관의 첫 화면·기준·안내 문구를 수정합니다.'),
      manager('브랜드 등록·수정', '/admin/brands', '브랜드 카드와 노출 순서를 등록·수정·삭제합니다.'),
    ],
  },
  {
    key: 'brand-detail',
    title: '브랜드 상세',
    publicRoute: '/brands/브랜드',
    previewRoute: '/brands',
    routePattern: '/brands/[id]',
    group: '상품·브랜드',
    screenType: '상세 화면',
    description: '브랜드 철학, Audit, 대표상품, 관련 고민과 후기가 보이는 화면입니다.',
    editableAreas: ['브랜드 소개', '로고·대표 이미지', 'Audit 상세', '배송·교환 안내', '대표상품', '연관 고민', '후기'],
    actions: [
      manager('브랜드 상세 편집', '/admin/brands', '브랜드 목록의 상세 버튼에서 모든 브랜드 내용을 수정합니다.'),
      manager('연결 상품', '/admin/products', '브랜드에 속한 상품을 등록·수정합니다.'),
      manager('연결 후기', '/admin/reviews', '브랜드 상세에 표시되는 후기를 관리합니다.'),
    ],
  },
  {
    key: 'reviews',
    title: '보호자 후기 목록',
    publicRoute: '/reviews',
    previewRoute: '/reviews',
    routePattern: '/reviews',
    group: '상품·브랜드',
    screenType: '목록 화면',
    description: '공개 후기 통계, 필터와 후기 카드가 보이는 화면입니다.',
    editableAreas: ['첫 화면 제목·설명', '통계 앞 이름', '필터 이름', '빈 목록 안내', '후기 카드·사진·별점·노출'],
    actions: [
      content('후기 목록 문구', 'reviews', '후기 목록의 제목·통계 이름·필터·빈 안내를 수정합니다.'),
      manager('후기 등록·수정', '/admin/reviews', '후기 카드와 공개 여부를 등록·수정·삭제합니다.'),
    ],
  },
  {
    key: 'concerns',
    title: '케어 가이드 목록',
    publicRoute: '/concerns',
    previewRoute: '/concerns',
    routePattern: '/concerns',
    group: '가이드·콘텐츠',
    screenType: '목록 화면',
    description: '피부·배변·생활 등 반려동물 고민을 고르는 화면입니다.',
    editableAreas: ['첫 화면', '고민 카드', '추가 생활 케어', '안내 배너', '자주 묻는 질문', '순서'],
    actions: [
      content('목록 화면 문구', 'concerns', '목록 화면 첫 문구·배너·FAQ를 수정합니다.'),
      manager('고민 카드·상세', '/admin/concerns', '피부·배변·생활 같은 고민과 상세 내용을 등록·수정·삭제하고 순서를 바꿉니다.', ['등록', '수정', '삭제', '순서']),
    ],
  },
  {
    key: 'concern-detail',
    title: '케어 가이드 상세',
    publicRoute: '/concerns/고민',
    previewRoute: '/concerns',
    routePattern: '/concerns/[slug]',
    group: '가이드·콘텐츠',
    screenType: '상세 화면',
    description: '선택한 고민의 증상·체크 방법·생활 팁·추천상품·FAQ 화면입니다.',
    editableAreas: ['제목·설명', '확인 증상', '빠른 안내', '생활 팁', '추천 상품', 'FAQ', '순서'],
    actions: [
      manager('고민 상세·추천 상품', '/admin/concerns', '해당 고민을 찾아 상세 내용과 이 화면에 표시할 추천 상품을 한곳에서 관리합니다.', ['등록', '수정', '삭제', '순서']),
    ],
  },
  {
    key: 'audit',
    title: 'Audit 소개',
    publicRoute: '/audit',
    previewRoute: '/audit',
    routePattern: '/audit',
    group: '가이드·콘텐츠',
    screenType: '콘텐츠 화면',
    description: '백조오브제의 브랜드·상품 검토 기준을 소개하는 화면입니다.',
    editableAreas: ['첫 화면', '검토 기준 카드', '진행 절차', '안내 문구·이미지·버튼', '노출·순서'],
    actions: [content('Audit 화면 수정', 'audit', '화면의 모든 소개 영역과 카드를 수정합니다.')],
  },
  {
    key: 'experts',
    title: '전문가 콘텐츠',
    publicRoute: '/experts',
    previewRoute: '/experts',
    routePattern: '/experts',
    group: '가이드·콘텐츠',
    screenType: '콘텐츠 화면',
    featureFlag: 'experts',
    description: '전문가 관점의 상품 선택 기준과 관련 상품을 안내하는 화면입니다.',
    editableAreas: ['첫 화면', '전문가 기준 카드', '안내 문구·버튼', '노출·순서', '연결 상품'],
    actions: [
      content('전문가 화면 수정', 'experts', '소개 문구와 기준 카드를 수정합니다.'),
      manager('수의사 관점 상품 연결', '/admin/products', '상품 수정의 ‘전문가 콘텐츠 연결’을 체크합니다.', ['수정']),
      manager('연결 상품 공개 여부', '/admin/products/display', '연결한 상품이 고객에게 보이도록 스토어 노출을 관리합니다.', ['수정', '노출']),
    ],
  },
  {
    key: 'notices',
    title: '공지사항 목록',
    publicRoute: '/notices',
    previewRoute: '/notices',
    routePattern: '/notices',
    group: '가이드·콘텐츠',
    screenType: '목록 화면',
    description: '공지·이벤트·브랜드 소식의 목록 화면입니다.',
    editableAreas: ['첫 화면 제목·설명', '표 머리글', '빈 목록 안내', '공지 카드·분류·날짜·노출'],
    actions: [
      content('공지 목록 문구', 'notices', '목록 화면의 제목·설명·표시 이름을 수정합니다.'),
      manager('공지 등록·수정', '/admin/notices', '공지·이벤트·소식을 등록·수정·삭제합니다.', ['등록', '수정', '삭제']),
    ],
  },
  {
    key: 'notice-detail',
    title: '공지사항 상세',
    publicRoute: '/notices/공지',
    previewRoute: '/notices',
    routePattern: '/notices/[id]',
    group: '가이드·콘텐츠',
    screenType: '상세 화면',
    description: '선택한 공지의 제목·분류·날짜·본문이 보이는 화면입니다.',
    editableAreas: ['제목', '분류', '작성일', '본문', '공개 여부'],
    actions: [manager('공지 상세 편집', '/admin/notices', '공지 등록부터 해당 공지의 수정·삭제까지 한 목록에서 관리합니다.', ['등록', '수정', '삭제'])],
  },
  {
    key: 'diagnosis',
    title: '맞춤 진단',
    publicRoute: '/diagnosis',
    previewRoute: '/diagnosis',
    routePattern: '/diagnosis',
    group: '서비스',
    screenType: '기능 화면',
    description: '고객이 질문에 답하고 맞춤 결과를 받는 설문 화면입니다.',
    editableAreas: ['진단 문항', '선택지', '문항 순서', '추천 규칙', '결과 제목·설명·추천 연결'],
    systemAreas: ['진행률 계산', '이전·다음 동작'],
    actions: [manager('진단 문항·결과 규칙', '/admin/survey', '질문·선택지·결과 규칙을 등록·수정·삭제하고 순서를 바꿉니다.', ['등록', '수정', '삭제', '순서'])],
  },
  {
    key: 'diagnosis-result',
    title: '맞춤 진단 결과',
    publicRoute: '/diagnosis/result',
    previewRoute: '/diagnosis',
    routePattern: '/diagnosis/result',
    group: '서비스',
    screenType: '기능 화면',
    description: '고객 답변과 규칙에 따라 추천 방향·브랜드·상품을 보여주는 화면입니다.',
    editableAreas: ['결과 화면 공통 문구', '결과 방향', '결과 설명', '추천 상품·브랜드', '보험·케어키트 안내 표시'],
    systemAreas: ['고객 답변 계산', '결과 탭 동작'],
    actions: [
      manager('결과 화면·추천 연결', '/admin/survey', '결과 화면의 공통 문구, 고객 답변별 결과, 추천 상품·브랜드와 안내 표시를 한곳에서 관리합니다.', ['등록', '수정', '삭제', '순서']),
      manager('연결된 상품 정보', '/admin/products', '결과에 선택한 상품의 사진·가격·판매 정보를 수정합니다.', ['수정']),
      manager('연결된 브랜드 정보', '/admin/brands', '결과에 선택한 브랜드의 공개 내용을 수정합니다.', ['수정']),
    ],
  },
  {
    key: 'b2b',
    title: 'B2B 소개',
    publicRoute: '/b2b',
    previewRoute: '/b2b',
    routePattern: '/b2b',
    group: '서비스',
    screenType: '콘텐츠 화면',
    description: '기업·기관 대상 협업 방식과 파트너 유형을 소개하는 화면입니다.',
    editableAreas: ['첫 화면', '협업 방식 카드', '파트너 유형 카드', '절차', '버튼·노출·순서'],
    actions: [content('B2B 화면 수정', 'b2b', '화면의 모든 소개 영역과 카드를 수정합니다.')],
  },
  {
    key: 'care-kit',
    title: '케어키트 소개',
    publicRoute: '/landing/care-kit',
    previewRoute: '/landing/care-kit',
    routePattern: '/landing/care-kit',
    group: '서비스',
    screenType: '콘텐츠 화면',
    description: '케어키트 소개·키트 카드·파트너 안내·제휴 문의 폼이 보이는 화면입니다.',
    editableAreas: ['첫 화면', '소개·파트너 문구', '키트 카드', '문의 영역 제목', '이미지·버튼·노출·순서'],
    systemAreas: ['제휴 문의 입력 항목과 개인정보 동의 동작'],
    actions: [
      content('케어키트 화면 문구', 'care-kit', '첫 화면·소개·파트너·문의 영역 문구를 수정합니다.'),
      manager('키트 카드', '/admin/kits', '고객 화면에 보이는 키트 카드를 등록·수정·삭제합니다.'),
      operation('제휴 문의 접수', '/admin/partner-inquiries', '고객이 문의 폼에서 보낸 내용을 확인하고 상태를 관리합니다.', ['조회', '상태', '삭제']),
    ],
  },
  {
    key: 'cart',
    title: '장바구니',
    publicRoute: '/cart',
    previewRoute: '/cart',
    routePattern: '/cart',
    group: '주문·회원',
    screenType: '기능 화면',
    description: '고객이 상품 수량과 금액을 확인하고 주문으로 이동하는 화면입니다.',
    editableAreas: ['상품명·옵션·가격·재고', '브랜드별 배송비·무료배송 기준'],
    systemAreas: ['수량 계산', '선택·삭제 동작', '결제 금액 계산'],
    actions: [
      manager('상품 정보', '/admin/products', '장바구니에 표시되는 상품·옵션·가격·재고를 수정합니다.', ['수정']),
      manager('브랜드별 배송 정책', '/admin/brands', '브랜드 전체 수정에서 배송비와 무료배송 기준을 수정합니다.', ['수정']),
    ],
  },
  {
    key: 'checkout',
    title: '주문·결제',
    publicRoute: '/checkout',
    previewRoute: '/cart',
    routePattern: '/checkout',
    group: '주문·회원',
    screenType: '기능 화면',
    description: '로그인 고객이 주문자·배송지·결제수단을 입력하는 화면입니다.',
    editableAreas: ['주문 상품·가격', '브랜드별 배송비·무료배송 기준'],
    systemAreas: ['주소 입력', '결제 승인', '재고 예약', '필수 동의'],
    actions: [
      manager('상품·가격', '/admin/products', '주문에 표시되는 상품과 판매 정보를 수정합니다.', ['수정']),
      manager('브랜드별 배송 정책', '/admin/brands', '결제 금액에 반영되는 배송비와 무료배송 기준을 수정합니다.', ['수정']),
      operation('접수 주문', '/admin/orders', '고객이 완료한 주문의 결제·배송 상태를 처리합니다.'),
    ],
  },
  {
    key: 'order-complete',
    title: '주문 완료',
    publicRoute: '/order-complete',
    previewRoute: '/cart',
    routePattern: '/order-complete',
    group: '주문·회원',
    screenType: '기능 화면',
    description: '주문 성공 후 주문번호·금액·배송 정보를 확인하는 화면입니다.',
    editableAreas: ['완료된 주문 정보'],
    systemAreas: ['결제 결과 확인', '주문번호 표시'],
    actions: [
      operation('주문 조회·처리', '/admin/orders', '완료된 주문의 결제·배송·취소·환불을 처리합니다.'),
    ],
  },
  {
    key: 'login',
    title: '로그인',
    publicRoute: '/login',
    previewRoute: '/login',
    routePattern: '/login',
    group: '주문·회원',
    screenType: '기능 화면',
    description: '회원 로그인과 소셜 로그인 진입 화면입니다.',
    editableAreas: ['가입 회원 상태·권한'],
    systemAreas: ['이메일·비밀번호 입력', '소셜 로그인', '로그인 오류 안내'],
    actions: [operation('회원 조회·상태', '/admin/members', '가입 회원의 상태와 권한을 확인·변경합니다.')],
  },
  {
    key: 'signup',
    title: '회원가입',
    publicRoute: '/signup',
    previewRoute: '/signup',
    routePattern: '/signup',
    group: '주문·회원',
    screenType: '기능 화면',
    description: '일반·기업·입점업체 회원이 가입 정보를 입력하는 화면입니다.',
    editableAreas: ['가입 회원 정보·승인 상태'],
    systemAreas: ['필수 입력 항목', '이메일 인증', '비밀번호 규칙', '약관 동의'],
    actions: [operation('회원 가입·승인', '/admin/members', '가입 내역을 확인하고 역할·승인 상태를 처리합니다.')],
  },
  {
    key: 'password-help',
    title: '비밀번호 찾기·재설정',
    publicRoute: '/forgot-password · /reset-password',
    previewRoute: '/forgot-password',
    routePattern: '/forgot-password',
    group: '주문·회원',
    screenType: '기능 화면',
    description: '비밀번호 재설정 메일을 요청하고 새 비밀번호를 입력하는 화면입니다.',
    editableAreas: ['회원 계정 상태'],
    systemAreas: ['재설정 메일', '보안 토큰', '비밀번호 규칙'],
    actions: [operation('회원 계정 확인', '/admin/members', '요청한 회원의 가입·활성 상태를 확인합니다.', ['조회', '상태'])],
  },
  {
    key: 'verify-email',
    title: '이메일 인증',
    publicRoute: '/verify-email',
    previewRoute: '/verify-email',
    routePattern: '/verify-email',
    group: '주문·회원',
    screenType: '기능 화면',
    description: '가입 이메일의 인증 성공·실패 상태를 안내하는 화면입니다.',
    editableAreas: ['회원 인증 상태'],
    systemAreas: ['인증 토큰 검증', '만료·오류 안내'],
    actions: [operation('회원 인증 상태', '/admin/members', '회원의 이메일 인증과 활성 상태를 확인합니다.', ['조회', '상태'])],
  },
  {
    key: 'mypage',
    title: '마이페이지',
    publicRoute: '/mypage',
    previewRoute: '/login',
    routePattern: '/mypage',
    group: '주문·회원',
    screenType: '기능 화면',
    description: '회원 정보·주문·배송·후기·문의·찜 내역을 확인하는 화면입니다.',
    editableAreas: ['회원 상태', '주문·배송 상태', '후기 공개 상태', '상품 문의 답변'],
    systemAreas: ['고객 본인정보 수정', '비밀번호 변경', '찜 목록'],
    actions: [
      operation('회원 관리', '/admin/members', '회원 정보와 계정 상태를 관리합니다.'),
      operation('주문·배송', '/admin/orders', '주문·입금·배송·취소·환불 상태를 관리합니다.'),
      operation('상품 문의', '/admin/inquiries', '회원이 남긴 상품 문의에 답변하거나 삭제합니다.', ['조회', '답변', '상태', '삭제']),
      manager('후기 공개', '/admin/reviews', '후기 내용과 공개 여부를 관리합니다.'),
    ],
  },
  {
    key: 'partner-orders',
    title: '입점업체 주문 목록',
    publicRoute: '/partner/orders',
    previewRoute: '/login',
    routePattern: '/partner/orders',
    group: '주문·회원',
    screenType: '기능 화면',
    description: '입점업체가 자기 브랜드 주문과 배송 대상을 확인하는 화면입니다.',
    editableAreas: ['담당 브랜드 권한', '주문·배송 상태', '송장 정보'],
    systemAreas: ['입점업체별 주문 범위 제한'],
    actions: [
      operation('주문·배송 관리', '/admin/orders', '전체 주문과 브랜드별 송장을 처리합니다.'),
      operation('입점업체 권한', '/admin/members', '입점업체 승인과 담당 브랜드 권한을 관리합니다.'),
    ],
  },
  {
    key: 'terms',
    title: '이용약관',
    publicRoute: '/terms',
    previewRoute: '/terms',
    routePattern: '/terms',
    group: '정책',
    screenType: '콘텐츠 화면',
    description: '서비스 이용약관의 시행일과 전체 조항을 표시합니다.',
    editableAreas: ['문서 제목', '시행일', '소개', '조항 등록·수정·삭제·순서·노출', '사업자 정보'],
    actions: [content('이용약관 수정', 'terms', '시행일과 모든 조항을 편집하고 게시합니다.')],
  },
  {
    key: 'privacy',
    title: '개인정보처리방침',
    publicRoute: '/privacy',
    previewRoute: '/privacy',
    routePattern: '/privacy',
    group: '정책',
    screenType: '콘텐츠 화면',
    description: '개인정보처리방침의 시행일과 전체 조항을 표시합니다.',
    editableAreas: ['문서 제목', '시행일', '소개', '조항 등록·수정·삭제·순서·노출'],
    actions: [content('개인정보처리방침 수정', 'privacy', '시행일과 모든 조항을 편집하고 게시합니다.')],
  },
  {
    key: 'refund-policy',
    title: '배송·교환·환불 안내',
    publicRoute: '/refund-policy',
    previewRoute: '/refund-policy',
    routePattern: '/refund-policy',
    group: '정책',
    screenType: '콘텐츠 화면',
    description: '고객에게 배송·교환·반품·환불 기준을 안내하는 화면입니다.',
    editableAreas: ['문서 제목', '시행일', '소개', '안내 조항 등록·수정·삭제·순서·노출'],
    actions: [content('안내 문서 수정', 'refund-policy', '문서의 모든 안내 조항을 편집하고 게시합니다.')],
  },
];

/** route-coverage 감사에서 제외할 실제 App Router 화면. 보험은 범위 제외, auth callback은 화면이 아니다. */
export const PUBLIC_PAGE_REGISTRY_EXCLUDED_ROUTE_PATTERNS = [
  '/auth/complete',
  '/insurance',
  '/insurance/apply',
  '/insurance/complete',
  '/insurance/recommend',
  '/landing/insurance',
] as const;

/** 한 카드가 여러 실제 화면을 대표할 때의 추가 route pattern. */
export const PUBLIC_PAGE_REGISTRY_ALIAS_ROUTE_PATTERNS = [
  '/reset-password',
] as const;

export function findPublicPageByRoute(routePattern: string): PublicPageRegistryEntry | undefined {
  return PUBLIC_PAGE_REGISTRY.find((page) => page.routePattern === routePattern);
}
