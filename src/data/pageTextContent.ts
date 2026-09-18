import { PRIVACY_CONTENT, TERMS_CONTENT } from '@/data/legalContent';

/**
 * 환경설정에서 편집하는 공개 화면 문구의 계약.
 *
 * - pageId.fieldId를 영구 키로 사용하므로 화면 문구가 바뀌어도 저장값을 잃지 않는다.
 * - defaultValue는 현재 화면에 하드코딩된 문구와 같아야 한다. 저장 행/API 장애 시 이 값이 보인다.
 * - 브랜드 상세(/brands/[id])는 브랜드마다 내용이 달라 이 목록에서 의도적으로 제외한다.
 *   해당 화면 문구는 Brand.pageCopy로 각 브랜드 편집 화면에서 관리한다.
 */
export interface PageTextFieldDefinition {
  readonly id: string;
  readonly label: string;
  readonly defaultValue: string;
  readonly multiline?: boolean;
}

export interface PageTextPageDefinition {
  readonly id: string;
  readonly label: string;
  readonly path: string;
  readonly fields: readonly PageTextFieldDefinition[];
}

export interface PageTextSettings {
  version: 1;
  values: Record<string, string>;
}

const field = (
  id: string,
  label: string,
  defaultValue: string,
  multiline = false,
): PageTextFieldDefinition => ({ id, label, defaultValue, multiline });

const legalFields = (
  document: typeof TERMS_CONTENT | typeof PRIVACY_CONTENT,
): PageTextFieldDefinition[] => [
  field('title', '문서 제목', document.title),
  field('effectiveDateLabel', '시행일 표시', '시행일:'),
  ...(document.introduction
    ? [field('introduction', '머리말', document.introduction, true)]
    : []),
  ...document.articles.flatMap((article, index) => [
    field(`article${index + 1}Title`, `${index + 1}번째 항목 제목`, article.title),
    ...(article.body
      ? [field(`article${index + 1}Body`, `${index + 1}번째 항목 내용`, article.body, true)]
      : []),
  ]),
  field('companyTitle', '사업자 정보 제목', '사업자 정보'),
  field('appendix', '부칙 안내', '부칙 — 이 문서는'),
];

export const pageTextDefinitions: readonly PageTextPageDefinition[] = [
  {
    id: 'common',
    label: '공통 메뉴·푸터',
    path: '*',
    fields: [
      field('navBrand', '상단 메뉴 · 브랜드', '브랜드'),
      field('navCare', '상단 메뉴 · 케어', '케어'),
      field('navInsurance', '상단 메뉴 · 펫보험', '펫보험'),
      field('navB2b', '상단 메뉴 · B2B', 'B2B'),
      field('navAudit', '더보기 · Audit 기준', '백조오브제 Audit의 검토 기준'),
      field('navExperts', '더보기 · 전문가 칼럼', '전문가 칼럼'),
      field('navReviews', '더보기 · 보호자 후기', '보호자 후기'),
      field('navNotices', '더보기 · 소식', '소식'),
      field('brandBrowse', '메뉴 묶음 · 브랜드', '브랜드로 둘러보기'),
      field('needBrowse', '메뉴 묶음 · 필요한 것', '필요한 것으로 찾기'),
      field('bottomHome', '하단 메뉴 · 홈', '홈'),
      field('bottomShop', '하단 메뉴 · 쇼핑', '쇼핑'),
      field('bottomMy', '하단 메뉴 · 마이', '마이'),
      field('footerInquiry', '푸터 · 1:1 문의', '1:1 문의'),
      field('footerTerms', '푸터 · 이용약관', '이용약관'),
      field('footerPrivacy', '푸터 · 개인정보', '개인정보처리방침'),
      field('footerRefund', '푸터 · 배송·교환·환불', '배송·교환·환불'),
    ],
  },
  {
    id: 'audit',
    label: 'Audit 검토 기준',
    path: '/audit',
    fields: [
      field('heroEyebrow', '첫 화면 영문 소제목', 'BAEKJO OBJET AUDIT STANDARD'),
      field('heroTitleLine1', '첫 화면 제목 1줄', '선택보다 먼저,'),
      field('heroTitleLine2', '첫 화면 제목 2줄', '확인하는 기준이 있습니다.'),
      field('heroDescription', '첫 화면 설명', '백조오브제는 많이 소개하는 것보다 왜 선택했는지 설명할 수 있는 것을 중요하게 생각합니다. 브랜드의 철학과 제품의 특성, 실제 사용에서 확인되는 부분까지 각 브랜드와 제품에 맞춰 살펴봅니다.', true),
      field('brandLink', '브랜드 버튼', '브랜드 둘러보기'),
      field('heroImageAlt', '첫 화면 이미지 설명', '반려생활 상품 자료를 살펴보는 백조오브제 Audit'),
      field('heroImageCaptionLine1', '첫 화면 이미지 문구 1줄', '모든 브랜드를 소개하지 않습니다.'),
      field('heroImageCaptionLine2', '첫 화면 이미지 문구 2줄', '확인하고 선택한 브랜드만 소개합니다.'),
      field('checkpointEyebrow', '검토 항목 영문 소제목', 'AUDIT CHECKPOINTS'),
      field('checkpointTitle', '검토 항목 제목', '브랜드를 바라보는 기준'),
      field('checkpointDescription', '검토 항목 설명', '브랜드마다 제품과 이야기가 다른 만큼 확인하는 내용도 달라집니다. 브랜드의 특성에 맞춰 필요한 자료와 내용을 함께 검토합니다.', true),
      field('pillar1Title', '첫 번째 기준 제목', '브랜드 철학'),
      field('pillar1Number', '첫 번째 기준 번호', '01'),
      field('pillar1Description', '첫 번째 기준 설명', '브랜드가 중요하게 생각하는 가치와 제품에 담긴 방향을 살펴봅니다.', true),
      field('pillar1Check1', '첫 번째 기준 항목 1', '브랜드가 지향하는 가치'),
      field('pillar1Check2', '첫 번째 기준 항목 2', '제품에 담긴 생각과 방향'),
      field('pillar1Check3', '첫 번째 기준 항목 3', '반려동물을 대하는 태도'),
      field('pillar2Title', '두 번째 기준 제목', '제품과 안전'),
      field('pillar2Number', '두 번째 기준 번호', '02'),
      field('pillar2Description', '두 번째 기준 설명', '제품이 어떤 목적으로 만들어졌는지 살펴보고, 제품과 안전에 대해 확인할 수 있는 정보를 검토합니다.', true),
      field('pillar2Check1', '두 번째 기준 항목 1', '제품의 목적과 사용 방식'),
      field('pillar2Check2', '두 번째 기준 항목 2', '소재·원료 등 제품 정보'),
      field('pillar2Check3', '두 번째 기준 항목 3', '안전과 관련해 확인 가능한 자료'),
      field('pillar3Title', '세 번째 기준 제목', '일관성과 운영'),
      field('pillar3Number', '세 번째 기준 번호', '03'),
      field('pillar3Description', '세 번째 기준 설명', '브랜드가 중요하게 말하는 가치가 제품과 실제 운영에서도 이어지는지 살펴봅니다.', true),
      field('pillar3Check1', '세 번째 기준 항목 1', '브랜드가 말하는 가치와 제품의 연결'),
      field('pillar3Check2', '세 번째 기준 항목 2', '제품 정보와 실제 안내의 일관성'),
      field('pillar3Check3', '세 번째 기준 항목 3', '고객에게 전달되는 운영 과정'),
      field('pillar4Title', '네 번째 기준 제목', '확인과 기록'),
      field('pillar4Number', '네 번째 기준 번호', '04'),
      field('pillar4Description', '네 번째 기준 설명', '브랜드마다 중요하게 살펴봐야 할 내용을 확인하고, 확인한 범위 안에서 기록합니다.', true),
      field('pillar4Check1', '네 번째 기준 항목 1', '브랜드별로 중요하게 살펴본 내용'),
      field('pillar4Check2', '네 번째 기준 항목 2', '검토에 참고한 자료와 이야기'),
      field('pillar4Check3', '네 번째 기준 항목 3', '함께 알아둘 점'),
      field('processEyebrow', '진행 절차 영문 소제목', 'AUDIT PROCESS'),
      field('ongoingTitle', '지속 검토 제목', 'Audit은 완료된 뒤에도 이어집니다'),
      field('ongoingDescription', '지속 검토 설명', '새롭게 확인되는 내용과 변화가 있다면 다시 살펴보고, 필요한 내용을 더해 기록을 보완합니다.', true),
      field('process1Title', '진행 절차 1 제목', '처음의 확인'),
      field('process1Number', '진행 절차 1 번호', '01'),
      field('process1Description', '진행 절차 1 설명', '브랜드와 제품을 이해하고, 확인한 내용을 Audit에 담습니다.', true),
      field('process2Title', '진행 절차 2 제목', '새로운 내용'),
      field('process2Number', '진행 절차 2 번호', '02'),
      field('process2Description', '진행 절차 2 설명', '이후 새롭게 알게 된 자료와 변화도 다시 살펴봅니다.', true),
      field('process3Title', '진행 절차 3 제목', '기록의 보완'),
      field('process3Number', '진행 절차 3 번호', '03'),
      field('process3Description', '진행 절차 3 설명', '추가로 확인한 내용이 있다면 기존 Audit에 필요한 내용을 더합니다.', true),
      field('process4Title', '진행 절차 4 제목', '이어지는 Audit'),
      field('process4Number', '진행 절차 4 번호', '04'),
      field('process4Description', '진행 절차 4 설명', '완료된 기록에 머무르지 않고, 새롭게 확인되는 변화와 내용을 계속 기록합니다.', true),
      field('howToReadEyebrow', '상태 표시 영문 소제목', 'HOW TO READ'),
      field('statusTitle', '상태 표시 제목', '화면에서는 이렇게 표시됩니다.'),
      field('statusDescription', '상태 표시 설명', 'Audit 완료 후 추가 확인이나 업데이트가 필요한 경우, 상태를 구분해 표시합니다.', true),
      field('status1Label', '첫 번째 상태 제목', 'Audit 확인 완료'),
      field('status1Description', '첫 번째 상태 설명', '현재 확인된 내용을 바탕으로 Audit이 완료된 상태입니다.', true),
      field('status2Label', '두 번째 상태 제목', '추가 확인 중'),
      field('status2Description', '두 번째 상태 설명', 'Audit 완료 이후 새롭게 확인할 내용이나 자료를 추가로 살펴보고 있는 상태입니다.', true),
      field('status3Label', '세 번째 상태 제목', '업데이트 예정'),
      field('status3Description', '세 번째 상태 설명', '추가로 확인된 내용이나 변경 사항을 Audit 기록에 반영할 예정입니다.', true),
      field('statusNote', '상태 표시 하단 안내', '※ 추가 확인 중 및 업데이트 예정은 Audit 완료 이후의 추가 확인·보완 상태를 의미하며, 입점 및 제품 판매는 기존과 동일하게 유지됩니다.', true),
      field('disclaimer', 'Audit 면책 안내', '백조오브제 Audit은 브랜드가 제공한 자료와 공개 정보를 바탕으로 한 큐레이션 기준입니다. 수의학적 진단, 법정 인증 또는 개별 반려동물에 대한 의료 판단을 대신하지 않습니다. 질환이나 알레르기가 있다면 구매 전 수의사와 상담해 주세요.', true),
      field('closingDescription', '마지막 안내 설명', '백조오브제 Audit은 브랜드와 제품에 대해 확인할 수 있는 자료와 내용을 바탕으로 진행하는 백조오브제의 자체 검토 시스템입니다. 법적 인증기관의 인증이나 개별 반려동물에 대한 의료적 판단을 의미하지 않습니다.', true),
      field('closingEyebrow', '마지막 영문 소제목', 'Continue exploring'),
      field('closingTitle', '마지막 안내 제목', '확인한 기준은 선택으로 이어집니다.'),
      field('closingBrand', '마지막 브랜드 버튼', '브랜드 보기'),
      field('closingShop', '마지막 상품 버튼', '셀렉션 보기'),
    ],
  },
  {
    id: 'b2b',
    label: 'B2B',
    path: '/b2b',
    fields: [
      field('heroTitleLine1', '첫 화면 제목 1줄', '반려가족과 만나는 순간을'),
      field('heroTitleLine2', '첫 화면 제목 2줄', '함께 설계합니다.'),
      field('inquiryButton', '문의 버튼', 'B2B 문의하기'),
      field('programButton', '프로그램 버튼', '협업 프로그램 보기'),
      field('typeTitle', '협업 유형 제목', '목적에 따라 협업의 방식도 달라집니다.'),
      field('typeDescription', '협업 유형 설명', '기관과 브랜드의 목적에 맞춰 필요한 협업 방식을 함께 찾습니다.', true),
      field('proposalTitle', '제안 제목', '필요에 맞는 협업 방식을 제안합니다.'),
      field('proposalDescription', '제안 설명', '상품 공급부터 케어키트, 입점과 공동 기획까지 목적에 맞는 방식으로 협업합니다.', true),
      field('processTitle', '진행 절차 제목', '협업은 이렇게 진행됩니다.'),
      field('processDescription', '진행 절차 설명', '구체적인 협업 내용이 정해지기 전에도 문의할 수 있습니다. 협업 목적을 확인한 뒤 필요한 범위와 일정을 함께 정리합니다.', true),
      field('closingTitle', '마지막 안내 제목', '필요한 순간과 목적을 들려주세요.'),
      field('closingDescription', '마지막 안내 설명', '서로의 가치를 지키며 함께 성장할 수 있는 관계를 만들어갑니다.', true),
      field('signupButton', '파트너 가입 버튼', '파트너 회원가입'),
    ],
  },
  {
    id: 'brands',
    label: '브랜드 목록',
    path: '/brands',
    fields: [
      field('eyebrow', '영문 소제목', 'BRAND CURATION'),
      field('titleLine1', '페이지 제목 1줄', '우리 아이를 생각한다면,'),
      field('titleLine2', '페이지 제목 2줄', '좋은 선택이 필요합니다.'),
      field('description', '페이지 설명', '백조오브제가 공개 자료와 브랜드 제출 자료를 바탕으로 자체 기준에 따라 살펴본 브랜드입니다.', true),
      field('valueTitle', '선정 기준 제목', 'WHAT WE VALUE'),
      field('spotlight', '스포트라이트 표시', '스포트라이트 브랜드'),
      field('detailLink', '브랜드 상세 버튼', '브랜드 자세히 보기'),
      field('emptyTitle', '빈 목록 제목', '조건에 맞는 브랜드가 없어요.'),
      field('emptyDescription', '빈 목록 설명', '다른 브랜드 이야기도 천천히 둘러보세요.'),
      field('partnerTitle', '입점 안내 제목', '기준이 같다면, 함께 만들어갑니다.'),
      field('partnerDescription1', '입점 안내 설명 1줄', '공개 자료와 브랜드 제출 자료를 바탕으로 백조오브제의 자체 기준을 살펴봅니다.', true),
      field('partnerDescription2', '입점 안내 설명 2줄', '신뢰를 바탕으로 브랜드에 가장 적합한 프로젝트를 제안합니다.', true),
      field('partnerButton', '입점 문의 버튼', '파트너십 문의하기'),
    ],
  },
  {
    id: 'shop',
    label: '상품 목록',
    path: '/shop',
    fields: [
      field('eyebrow', '영문 소제목', 'BAEKJO OBJET SELECTION'),
      field('title', '페이지 제목', '우리 아이를 위한 좋은 선택'),
      field('description', '페이지 설명', '백조오브제의 기준으로 살펴보고 선택한 제품을 소개합니다.', true),
      field('searchPlaceholder', '검색창 안내', '상품명, 브랜드명, 키워드를 검색하세요'),
      field('dailyPick', '추천 영역 제목', 'DAILY PICK'),
      field('filter', '필터 제목', '필터'),
      field('noResult', '검색 결과 없음', '선택한 조건에 맞는 상품을 찾지 못했어요.'),
    ],
  },
  {
    id: 'productDetail',
    label: '상품 상세 공통 문구',
    path: '/shop/[id]',
    fields: [
      field('storyEyebrow', '상품 이야기 소제목', '상품 이야기'),
      field('storyTitle', '상품 이야기 제목', '일상에서 이렇게 만나보세요.'),
      field('detailImagePending', '상세 이미지 준비 안내', '상세 이미지를 준비하고 있어요.'),
      field('relatedEyebrow', '연관 상품 소제목', '함께 둘러보기'),
      field('relatedTitle', '연관 상품 제목', '이런 상품도 함께 살펴보세요.'),
    ],
  },
  {
    id: 'cart',
    label: '장바구니',
    path: '/cart',
    fields: [
      field('title', '페이지 제목', '장바구니'),
      field('emptyTitle', '빈 장바구니 제목', '장바구니가 비어있습니다'),
      field('emptyDescription', '빈 장바구니 설명', '백조오브제의 프리미엄 상품들을 만나보세요.'),
      field('sellerLabel', '판매자 소제목', '실제 판매자'),
      field('paymentTitle', '결제 정보 제목', '결제 정보'),
      field('productTotal', '상품금액 표시', '총 상품금액'),
      field('shippingFee', '배송비 표시', '배송비'),
      field('total', '최종금액 표시', '총 결제 예정금액'),
      field('checkoutButton', '주문 버튼', '주문하기'),
    ],
  },
  {
    id: 'checkout',
    label: '주문·결제',
    path: '/checkout',
    fields: [
      field('title', '페이지 제목', '주문/결제'),
      field('addressTitle', '배송지 제목', '배송지 정보'),
      field('savedAddress', '저장 배송지', '저장된 배송지'),
      field('sellerConsentTitle', '판매자 동의 제목', '판매자별 주문·개인정보 제공'),
      field('sellerConsentDescription', '판매자 동의 설명', '상품마다 실제 판매자와 배송·반품 책임 주체를 확인하고 각각 동의해주세요.', true),
      field('madeToOrderTitle', '주문제작 동의 제목', '주문제작 별도 동의'),
      field('paymentMethodTitle', '결제수단 제목', '결제 수단'),
      field('preflightTitle', '주문 확인 제목', '주문 전 확인'),
      field('itemsTitle', '주문 상품 제목', '주문 상품'),
    ],
  },
  {
    id: 'concerns',
    label: '고민별 케어 목록',
    path: '/concerns',
    fields: [
      field('moreCareTitle', '추가 케어 제목', '추가로 살펴볼 생활 케어'),
      field('moreCareDescription', '추가 케어 설명', '일상에서 함께 확인하면 좋은 관리 주제입니다.'),
      field('faqTitle', 'FAQ 제목', '많이 궁금해하시는 점'),
    ],
  },
  {
    id: 'concernDetail',
    label: '고민별 케어 상세 공통 문구',
    path: '/concerns/[slug]',
    fields: [
      field('signalsTitle', '생활 신호 제목', '생활 속에서 보이는 신호'),
      field('productsTitle', '추천 상품 제목', '일상 관리에 함께 볼 상품'),
      field('reviewsTitle', '후기 제목', '보호자 후기'),
      field('faqTitle', 'FAQ 제목', '많이 궁금해하시는 점'),
    ],
  },
  {
    id: 'diagnosis',
    label: '맞춤 진단',
    path: '/diagnosis',
    fields: [
      field('loading', '불러오기 안내', '진단 문항을 불러오는 중...'),
      field('empty', '문항 없음 안내', '등록된 진단 문항이 없습니다.'),
      field('progress', '진행률 표시', '진행률'),
    ],
  },
  {
    id: 'diagnosisResult',
    label: '맞춤 진단 결과',
    path: '/diagnosis/result',
    fields: [
      field('loading', '분석 중 안내', '분석 중...'),
      field('brandTitle', '추천 브랜드 제목', '함께 살펴볼 큐레이션 브랜드'),
      field('brandDescription', '추천 브랜드 설명', '아이의 상태와 고민에 가장 적합한 브랜드입니다.'),
      field('productTitle', '추천 상품 제목', '필요한 카테고리 상품'),
      field('productDescription', '추천 상품 설명', '입력한 고민과 관련해 함께 살펴볼 수 있는 상품입니다.'),
      field('insuranceTitle', '보험 안내 제목', '펫보험 보장 점검 필요'),
      field('kitTitle', '케어키트 안내 제목', '맞춤 케어 키트 안내'),
    ],
  },
  {
    id: 'experts',
    label: '전문가 칼럼',
    path: '/experts',
    fields: [
      field('vetTitle', '수의 관점 제목', '수의 관점'),
      field('nutritionTitle', '영양 관점 제목', '영양 관점'),
      field('lifeTitle', '행동·생활 관점 제목', '행동·생활 관점'),
      field('methodTitle', '검토 방법 제목', '상품은 이렇게 살펴봅니다.'),
      field('recommendTitle', '추천 상품 제목', '전문가 기준으로 엄선한 추천 상품'),
      field('empty', '추천 없음 안내', '선택한 관점의 추천 상품이 없습니다.'),
    ],
  },
  {
    id: 'login',
    label: '로그인',
    path: '/login',
    fields: [
      field('title', '페이지 제목', '다시 만나 반가워요.'),
      field('description', '페이지 설명', '백조오브제 계정으로 로그인해 주세요.'),
      field('email', '이메일 항목', '이메일'),
      field('password', '비밀번호 항목', '비밀번호'),
      field('loginButton', '로그인 버튼', '로그인'),
      field('signup', '회원가입 링크', '회원가입'),
      field('forgot', '비밀번호 찾기 링크', '비밀번호 찾기'),
      field('social', '간편 로그인 제목', '간편 로그인'),
    ],
  },
  {
    id: 'authComplete',
    label: '간편 로그인 처리',
    path: '/auth/complete',
    fields: [field('loading', '처리 중 안내', '소셜 로그인 처리 중…')],
  },
  {
    id: 'completeProfile',
    label: '간편 로그인 정보 입력',
    path: '/auth/complete-profile',
    fields: [
      field('loading', '확인 중 안내', '회원정보를 확인하고 있어요…'),
      field('title', '페이지 제목', '주문에 필요한 정보를 입력해 주세요.'),
      field('description', '페이지 설명', '이름과 휴대폰 번호를 저장하면 주문 시 자동으로 불러옵니다.'),
      field('name', '이름 항목', '이름 *'),
      field('phone', '휴대폰 번호 항목', '휴대폰 번호 *'),
    ],
  },
  {
    id: 'signup',
    label: '회원가입',
    path: '/signup',
    fields: [
      field('title', '페이지 제목', '회원가입'),
      field('completeTitle', '신청 완료 제목', '가입 신청 완료'),
      field('social', '간편 가입 제목', '간편 가입'),
      field('existing', '기존 계정 안내', '이미 계정이 있나요?'),
    ],
  },
  {
    id: 'forgotPassword',
    label: '비밀번호 찾기',
    path: '/forgot-password',
    fields: [
      field('title', '페이지 제목', '비밀번호를 잊으셨나요?'),
      field('description', '페이지 설명', '가입하신 이메일 주소를 입력해 주시면 재설정 링크를 보내드릴게요.'),
      field('button', '전송 버튼', '재설정 링크 보내기'),
      field('done', '전송 완료 안내', '가입된 이메일이라면 재설정 링크를 보내드렸어요. 메일함(스팸함 포함)을 확인해 주세요.', true),
      field('back', '로그인 이동 링크', '로그인으로 돌아가기'),
    ],
  },
  {
    id: 'resetPassword',
    label: '새 비밀번호 설정',
    path: '/reset-password',
    fields: [
      field('invalid', '잘못된 링크 안내', '링크가 올바르지 않아요.'),
      field('title', '페이지 제목', '새 비밀번호 설정'),
      field('description', '페이지 설명', '새로 사용할 비밀번호를 입력해 주세요.'),
      field('password', '새 비밀번호 항목', '새 비밀번호'),
      field('confirm', '비밀번호 확인 항목', '새 비밀번호 확인'),
    ],
  },
  {
    id: 'verifyEmail',
    label: '이메일 인증',
    path: '/verify-email',
    fields: [
      field('loading', '인증 중 안내', '이메일 인증 처리 중…'),
      field('mypage', '마이페이지 링크', '마이페이지'),
    ],
  },
  {
    id: 'mypage',
    label: '마이페이지',
    path: '/mypage',
    fields: [
      field('overviewTitle', '요약 제목', '마이페이지 요약'),
      field('overviewDescription', '요약 설명', '현재 진행 중인 쇼핑 및 활동 내역을 확인하세요.'),
      field('orders', '주문내역 제목', '주문내역'),
      field('wishlist', '관심 상품 제목', '관심 상품'),
      field('reviews', '구매평 제목', '구매평 관리'),
      field('inquiries', '상품문의 제목', '상품문의 관리'),
      field('insurance', '보험 제목', '보험 분석 내역'),
      field('addresses', '배송지 제목', '배송지 관리'),
      field('profile', '회원정보 제목', '회원정보 수정'),
    ],
  },
  {
    id: 'notices',
    label: '공지사항 목록',
    path: '/notices',
    fields: [
      field('eyebrow', '영문 소제목', 'NEWS & NOTICE'),
      field('title', '페이지 제목', '공지사항'),
      field('description', '페이지 설명', '백조오브제의 새로운 소식과 안내'),
      field('empty', '공지 없음 안내', '등록된 공지사항이 없습니다.'),
    ],
  },
  {
    id: 'noticeDetail',
    label: '공지사항 상세 공통 문구',
    path: '/notices/[id]',
    fields: [field('back', '목록 이동 문구', '목록으로')],
  },
  {
    id: 'reviews',
    label: '보호자 후기',
    path: '/reviews',
    fields: [
      field('eyebrow', '영문 소제목', 'REAL EXPERIENCES'),
      field('title', '페이지 제목', '보호자 후기'),
      field('emptyTitle', '후기 없음 제목', '후기가 없습니다.'),
      field('emptyDescription', '후기 없음 설명', '아직 등록된 후기가 없습니다.'),
    ],
  },
  {
    id: 'orderComplete',
    label: '주문 완료',
    path: '/order-complete',
    fields: [
      field('successTitle', '완료 제목', '주문이 완료되었습니다'),
      field('paymentTitle', '결제 확인 제목', '결제가 확인되었습니다'),
      field('paymentDescription', '결제 확인 설명', '주문 내역은 마이페이지에서 확인할 수 있습니다.'),
      field('busyTitle', '조회 지연 제목', '확인 요청이 많습니다'),
      field('busyDescription', '조회 지연 설명', '잠시 후 다시 시도해 주세요.'),
      field('orderNumber', '주문번호 표시', '주문번호'),
      field('bankTitle', '무통장 안내 제목', '무통장입금 안내'),
    ],
  },
  {
    id: 'insurance',
    label: '펫보험',
    path: '/insurance',
    fields: [
      field('eyebrow', '소제목', '보험 분석 서비스'),
      field('titleLine1', '첫 화면 제목 1줄', '우리 아이에게'),
      field('titleLine2', '첫 화면 제목 2줄', '필요한 보장,'),
      field('titleLine3', '첫 화면 제목 3줄', '함께 차근차근 살펴봐요.'),
      field('description', '첫 화면 설명', '같은 품종이라도, 나이와 기왕력에 따라 우리 아이에게 맞는 보험은 달라집니다.', true),
      field('start', '분석 시작 버튼', '보험 분석 시작하기'),
      field('about', '분석 안내 버튼', '분석이란 무엇인가요?'),
      field('prepareTitle', '증권 준비 제목', '가지고 있는 증권을 미리 확인해 보세요.'),
      field('processTitle', '신청 절차 제목', '신청 후에는 이렇게 이어져요.'),
      field('faqTitle', 'FAQ 제목', '자주 묻는 질문'),
      field('inquiryTitle', '문의 제목', '더 궁금한 점이 있으신가요?'),
    ],
  },
  {
    id: 'insuranceApply',
    label: '펫보험 신청',
    path: '/insurance/apply',
    fields: [
      field('ownerTitle', '보호자 정보 제목', '보호자 정보'),
      field('petTitle', '반려동물 정보 제목', '반려동물 정보'),
      field('coverageTitle', '보험 정보 제목', '보험 및 관심 보장'),
    ],
  },
  {
    id: 'insuranceComplete',
    label: '펫보험 신청 완료',
    path: '/insurance/complete',
    fields: [
      field('title', '완료 제목', '분석 신청이 완료되었습니다'),
      field('home', '홈 버튼', '홈으로 돌아가기'),
      field('mypage', '마이페이지 버튼', '마이페이지에서 확인'),
    ],
  },
  {
    id: 'insuranceRecommend',
    label: '펫보험 추천',
    path: '/insurance/recommend',
    fields: [
      field('title', '첫 화면 제목', '실시간 맞춤 보험 분석'),
      field('profileTitle', '정보 입력 제목', '아이 정보를 알려주세요'),
      field('profileDescription', '정보 입력 설명', '품종과 나이에 따라 추천 보장 비율이 달라집니다.'),
      field('loadingTitle', '분석 중 제목', '최적의 보장 조건을 탐색 중입니다...'),
      field('completeTitle', '분석 완료 제목', '분석이 완료되었습니다'),
    ],
  },
  {
    id: 'careKit',
    label: '케어키트',
    path: '/landing/care-kit',
    fields: [
      field('partnerButton', '파트너 문의 버튼', '파트너십 문의하기'),
      field('partnerTitle', '파트너 영역 제목', '파트너와 함께 만드는 케어'),
      field('partnerDescription', '파트너 영역 설명', '초기 케어키트는 필요한 순간에 집중할 수 있도록 간결하게 구성하며, 파트너의 목적과 필요에 따라 구성과 범위를 계속 발전시켜갑니다.', true),
      field('inquiryTitle', '문의 제목', '협업·제휴 문의'),
      field('inquiryDescription', '문의 설명', '함께하고 싶은 협업이나 제휴의 목적과 내용을 자유롭게 남겨주세요.', true),
    ],
  },
  {
    id: 'insuranceLanding',
    label: '펫보험 소개 랜딩',
    path: '/landing/insurance',
    fields: [
      field('whyTitle', '분석 이유 제목', '왜 백조오브제의 분석일까요?'),
      field('whyDescription', '분석 이유 설명', '판매가 목적이 아닌, 아이의 생애 주기와 리스크를 먼저 봅니다.'),
      field('processTitle', '진행 절차 제목', '분석은 이렇게 진행됩니다'),
      field('closingTitle', '마지막 안내 제목', '1분이면 충분합니다.'),
    ],
  },
  {
    id: 'terms',
    label: '이용약관',
    path: '/terms',
    fields: legalFields(TERMS_CONTENT),
  },
  {
    id: 'privacy',
    label: '개인정보처리방침',
    path: '/privacy',
    fields: legalFields(PRIVACY_CONTENT),
  },
  {
    id: 'refundPolicy',
    label: '배송·교환·환불 안내',
    path: '/refund-policy',
    fields: [
      field('eyebrow', '영문 소제목', 'Commerce Policy'),
      field('title', '페이지 제목', '배송·교환·환불 안내'),
      field('shippingTitle', '배송 제목', '1. 배송 안내'),
      field('returnTitle', '교환·반품 제목', '2. 교환·반품 안내'),
      field('refundTitle', '환불 제목', '3. 환불 안내'),
      field('supportTitle', '고객센터 제목', '4. 고객센터'),
    ],
  },
];

export const pageTextValueKeys = new Set(
  pageTextDefinitions.flatMap((page) => page.fields.map((item) => `${page.id}.${item.id}`)),
);

export const defaultPageTextSettings: PageTextSettings = {
  version: 1,
  values: Object.fromEntries(
    pageTextDefinitions.flatMap((page) =>
      page.fields.map((item) => [`${page.id}.${item.id}`, item.defaultValue]),
    ),
  ),
};

export function normalizePageTextSettings(input: unknown): PageTextSettings {
  const root = input && typeof input === 'object' && !Array.isArray(input)
    ? input as Record<string, unknown>
    : {};
  const values = root.values && typeof root.values === 'object' && !Array.isArray(root.values)
    ? root.values as Record<string, unknown>
    : {};

  return {
    version: 1,
    values: Object.fromEntries(
      Object.entries(defaultPageTextSettings.values).map(([key, fallback]) => [
        key,
        typeof values[key] === 'string' ? values[key] : fallback,
      ]),
    ),
  };
}

export function validatePageTextSettings(input: unknown): input is PageTextSettings {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false;
  const root = input as Record<string, unknown>;
  if (!root.values || typeof root.values !== 'object' || Array.isArray(root.values)) return false;
  const entries = Object.entries(root.values as Record<string, unknown>);
  if (entries.length > pageTextValueKeys.size) return false;
  let totalLength = 0;
  for (const [key, value] of entries) {
    if (!pageTextValueKeys.has(key) || typeof value !== 'string' || value.length > 20_000) return false;
    totalLength += value.length;
    if (totalLength > 500_000) return false;
  }
  return true;
}

function matchesPath(pattern: string, pathname: string): boolean {
  if (pattern === '*') return true;
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = pathname.split('/').filter(Boolean);
  if (patternParts.length !== pathParts.length) return false;
  return patternParts.every((part, index) =>
    (part.startsWith('[') && part.endsWith(']')) || part === pathParts[index]
  );
}

export function pageTextDefinitionsForPath(pathname: string): readonly PageTextPageDefinition[] {
  // 브랜드 상세는 브랜드 편집 화면의 Brand.pageCopy만 사용한다.
  if (/^\/brands\/[^/]+\/?$/.test(pathname)) {
    return pageTextDefinitions.filter((page) => page.id === 'common');
  }
  return pageTextDefinitions.filter((page) => matchesPath(page.path, pathname));
}

export function normalizeComparableText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function pageTextReplacementMap(
  pathname: string,
  settings: PageTextSettings,
): ReadonlyMap<string, string> {
  const replacements = new Map<string, string>();
  for (const page of pageTextDefinitionsForPath(pathname)) {
    for (const item of page.fields) {
      const next = settings.values[`${page.id}.${item.id}`] ?? item.defaultValue;
      if (next !== item.defaultValue) {
        replacements.set(normalizeComparableText(item.defaultValue), next);
      }
    }
  }
  return replacements;
}
