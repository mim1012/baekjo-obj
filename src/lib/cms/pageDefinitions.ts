import { COMPANY, DEFAULT_COMMERCE_POLICY } from '@/data/company';

export type CmsFieldType =
  | 'text'
  | 'textarea'
  | 'image'
  | 'url'
  | 'boolean'
  | 'link-list'
  | 'item-list';

export interface CmsLinkItem {
  label: string;
  href: string;
  visible: boolean;
}

export type CmsItemFieldType = 'text' | 'textarea' | 'image' | 'url' | 'boolean' | 'select';

export interface CmsItemFieldDefinition {
  key: string;
  label: string;
  type: CmsItemFieldType;
  description?: string;
  placeholder?: string;
  defaultValue?: string | boolean;
  options?: Array<{ value: string; label: string }>;
}

export interface CmsFieldDefinition {
  path: string;
  label: string;
  type: CmsFieldType;
  description?: string;
  placeholder?: string;
  itemFields?: CmsItemFieldDefinition[];
  addLabel?: string;
}

export interface CmsSectionDefinition {
  id: string;
  label: string;
  description: string;
  fields: CmsFieldDefinition[];
}

export interface CmsPageDefinition {
  key: string;
  title: string;
  route: string;
  group: '공통 영역' | '소개·콘텐츠' | '서비스' | '정책';
  description: string;
  defaultContent: Record<string, unknown>;
  sections: CmsSectionDefinition[];
}

const text = (path: string, label: string, description?: string): CmsFieldDefinition => ({
  path,
  label,
  type: 'text',
  description,
});
const textarea = (path: string, label: string, description?: string): CmsFieldDefinition => ({
  path,
  label,
  type: 'textarea',
  description,
});
const image = (path: string, label: string, description?: string): CmsFieldDefinition => ({
  path,
  label,
  type: 'image',
  description,
});
const url = (path: string, label: string, description?: string): CmsFieldDefinition => ({
  path,
  label,
  type: 'url',
  description,
});
const toggle = (path: string, label: string, description?: string): CmsFieldDefinition => ({
  path,
  label,
  type: 'boolean',
  description,
});
const links = (path: string, label: string, description?: string): CmsFieldDefinition => ({
  path,
  label,
  type: 'link-list',
  description,
});
const items = (
  path: string,
  label: string,
  itemFields: CmsItemFieldDefinition[],
  description?: string,
): CmsFieldDefinition => ({
  path,
  label,
  type: 'item-list',
  itemFields,
  description,
  addLabel: '항목 추가',
});

const titleDescriptionItemFields: CmsItemFieldDefinition[] = [
  { key: 'title', label: '제목', type: 'text' },
  { key: 'description', label: '설명', type: 'textarea' },
  { key: 'visible', label: '표시', type: 'boolean', defaultValue: true },
];

const detailedCardItemFields: CmsItemFieldDefinition[] = [
  { key: 'eyebrow', label: '작은 영문 제목', type: 'text' },
  { key: 'title', label: '제목', type: 'text' },
  { key: 'description', label: '설명', type: 'textarea' },
  { key: 'bullets', label: '목록 문구', type: 'textarea', description: '한 줄에 한 항목씩 입력하세요.' },
  { key: 'image', label: '이미지', type: 'image' },
  { key: 'imageAlt', label: '이미지 설명', type: 'text' },
  { key: 'linkLabel', label: '버튼 이름', type: 'text' },
  { key: 'href', label: '버튼 연결 주소', type: 'url' },
  { key: 'visible', label: '표시', type: 'boolean', defaultValue: true },
];

const numberedCardItemFields: CmsItemFieldDefinition[] = [
  { key: 'number', label: '순서 표시', type: 'text', placeholder: '01' },
  { key: 'title', label: '제목', type: 'text' },
  { key: 'description', label: '설명', type: 'textarea' },
  { key: 'bullets', label: '확인 목록', type: 'textarea', description: '한 줄에 한 항목씩 입력하세요.' },
  { key: 'visible', label: '표시', type: 'boolean', defaultValue: true },
];

const perspectiveItemFields: CmsItemFieldDefinition[] = [
  { key: 'filterValue', label: '상품 분류 이름', type: 'text', description: '상품을 나누는 버튼과 연결 주소에 사용됩니다.' },
  {
    key: 'productRule',
    label: '이 카드에 보여줄 상품 기준',
    type: 'select',
    description: '상품 관리의 ‘전문가 콘텐츠 연결’과 같은 이름을 선택합니다.',
    options: [
      { value: 'veterinary', label: '수의사 관점 연결 상품' },
      { value: 'nutrition', label: '영양 관점 연결 상품' },
      { value: 'lifestyle', label: '행동·생활 관점 연결 상품' },
    ],
  },
  { key: 'title', label: '카드 제목', type: 'text' },
  { key: 'description', label: '카드 설명', type: 'textarea' },
  { key: 'bullets', label: '확인 항목', type: 'textarea', description: '한 줄에 한 항목씩 입력하세요.' },
  { key: 'linkLabel', label: '버튼 이름', type: 'text' },
  { key: 'visible', label: '표시', type: 'boolean', defaultValue: true },
];

const legalArticleItemFields: CmsItemFieldDefinition[] = [
  { key: 'title', label: '조항 제목', type: 'text' },
  { key: 'body', label: '조항 내용', type: 'textarea', description: '목록으로 표시할 줄은 - 로 시작하세요. 회사 정보는 {{company.name}}, {{company.tel}} 같은 표시를 사용할 수 있습니다.' },
  { key: 'visible', label: '표시', type: 'boolean', defaultValue: true },
];

const privacyPurposeRowItemFields: CmsItemFieldDefinition[] = [
  { key: 'category', label: '구분', type: 'textarea', description: '두 줄로 표시하려면 Enter를 누르세요.' },
  { key: 'purpose', label: '처리목적', type: 'textarea' },
  { key: 'requiredItems', label: '필수 처리항목', type: 'textarea' },
  { key: 'optionalItems', label: '선택 처리항목', type: 'textarea', description: '선택항목이 없으면 비워두세요.' },
  { key: 'note', label: '추가 안내', type: 'textarea', description: '카드번호 저장 여부처럼 함께 표시할 안내가 없으면 비워두세요.' },
  { key: 'visible', label: '표시', type: 'boolean', defaultValue: true },
];

const privacyCollectionMethodItemFields: CmsItemFieldDefinition[] = [
  { key: 'body', label: '수집 방법', type: 'textarea' },
  { key: 'visible', label: '표시', type: 'boolean', defaultValue: true },
];

const privacyRetentionRowItemFields: CmsItemFieldDefinition[] = [
  { key: 'information', label: '처리정보', type: 'text' },
  { key: 'period', label: '원칙적 보유기간', type: 'textarea' },
  { key: 'visible', label: '표시', type: 'boolean', defaultValue: true },
];

const privacyStatutoryRetentionRowItemFields: CmsItemFieldDefinition[] = [
  { key: 'record', label: '보존기록', type: 'textarea' },
  { key: 'period', label: '보존기간', type: 'text' },
  { key: 'basis', label: '근거', type: 'textarea' },
  { key: 'visible', label: '표시', type: 'boolean', defaultValue: true },
];

const privacyThirdPartyRowItemFields: CmsItemFieldDefinition[] = [
  { key: 'category', label: '구분', type: 'text' },
  { key: 'content', label: '내용', type: 'textarea' },
  { key: 'visible', label: '표시', type: 'boolean', defaultValue: true },
];

const privacyOutsourcingRowItemFields: CmsItemFieldDefinition[] = [
  { key: 'trustee', label: '수탁자', type: 'text' },
  { key: 'work', label: '위탁업무', type: 'textarea' },
  { key: 'period', label: '보유·이용기간', type: 'textarea' },
  { key: 'visible', label: '표시', type: 'boolean', defaultValue: true },
];

const privacySecurityMeasureRowItemFields: CmsItemFieldDefinition[] = [
  { key: 'category', label: '구분', type: 'text' },
  { key: 'measure', label: '주요 조치', type: 'textarea' },
  { key: 'visible', label: '표시', type: 'boolean', defaultValue: true },
];

const privacyContactRowItemFields: CmsItemFieldDefinition[] = [
  { key: 'category', label: '구분', type: 'text' },
  { key: 'content', label: '내용', type: 'textarea' },
  { key: 'visible', label: '표시', type: 'boolean', defaultValue: true },
];

const privacyReliefAgencyRowItemFields: CmsItemFieldDefinition[] = [
  { key: 'agency', label: '기관', type: 'text' },
  { key: 'phone', label: '전화', type: 'text' },
  { key: 'homepage', label: '홈페이지', type: 'text', description: '예: privacy.kisa.or.kr' },
  { key: 'visible', label: '표시', type: 'boolean', defaultValue: true },
];

const privacyPolicyChangeItemFields: CmsItemFieldDefinition[] = [
  { key: 'body', label: '변경 안내', type: 'textarea' },
  { key: 'visible', label: '표시', type: 'boolean', defaultValue: true },
];

const heroFields: CmsFieldDefinition[] = [
  toggle('hero.visible', '첫 화면 표시'),
  text('hero.eyebrow', '작은 영문 제목'),
  textarea('hero.title', '큰 제목', '줄을 바꾸려면 Enter를 누르세요.'),
  textarea('hero.description', '소개 문구'),
  image('hero.image', '대표 이미지'),
  text('hero.imageAlt', '이미지 설명', '검색과 화면 읽기 기능에 사용됩니다.'),
  text('hero.primaryCtaLabel', '첫 번째 버튼 이름'),
  url('hero.primaryCtaHref', '첫 번째 버튼 연결 주소'),
  text('hero.secondaryCtaLabel', '두 번째 버튼 이름'),
  url('hero.secondaryCtaHref', '두 번째 버튼 연결 주소'),
];

const siteShell: CmsPageDefinition = {
  key: 'site-shell',
  title: '사이트 공통 영역',
  route: '/_site-shell',
  group: '공통 영역',
  description: '모든 화면에 함께 보이는 로고, 상단·하단 메뉴, 회사 정보와 기능 노출을 관리합니다.',
  defaultContent: {
    branding: {
      headerLogo: '/images/baekjo-objet-header-logo-v2.png',
      logoAlt: 'Baekjo Objet',
    },
    features: { insurance: false, experts: false },
    navigation: {
      mainLinks: [
        { label: '브랜드', href: '/brands', visible: true },
        { label: '케어', href: '/concerns', visible: true },
        { label: '펫보험', href: '/insurance', visible: false },
        { label: 'B2B', href: '/b2b', visible: true },
      ],
      storyLinks: [
        { label: '백조오브제 Audit의 검토 기준', href: '/audit', visible: true },
        { label: '전문가 칼럼', href: '/experts', visible: false },
        { label: '보호자 후기', href: '/reviews', visible: true },
        { label: '소식', href: '/notices', visible: true },
      ],
      footerLinks: [
        { label: '1:1 문의', href: '/mypage?tab=inquiries', visible: true },
        { label: '이용약관', href: '/terms', visible: true },
        { label: '개인정보처리방침', href: '/privacy', visible: true },
        { label: '배송·교환·환불', href: '/refund-policy', visible: true },
      ],
    },
    company: { ...COMPANY },
    social: {
      instagramUrl: 'https://www.instagram.com/baekjo.objet/',
      instagramLabel: '@BAEKJO OBJET',
      kakaoTalkUrl: COMPANY.kakaoTalkUrl,
    },
  },
  sections: [
    {
      id: 'branding',
      label: '로고',
      description: '홈·로그인·관리자 화면을 포함한 모든 위치에 같은 로고가 표시됩니다.',
      fields: [
        image('branding.headerLogo', '전체 화면 공통 로고'),
        text('branding.logoAlt', '로고 이미지 설명'),
      ],
    },
    {
      id: 'navigation',
      label: '상단·하단 메뉴',
      description: '메뉴를 추가·수정·삭제하고 순서를 바꿀 수 있습니다.',
      fields: [
        links('navigation.mainLinks', '상단 주요 메뉴'),
        links('navigation.storyLinks', '백조오브제 펼침 메뉴'),
        links('navigation.footerLinks', '하단 메뉴'),
      ],
    },
    {
      id: 'features',
      label: '서비스 노출',
      description: '준비 중인 서비스를 고객 화면의 메뉴에서 보이거나 숨깁니다.',
      fields: [
        toggle('features.insurance', '펫보험 보이기'),
        toggle('features.experts', '전문가 칼럼 보이기'),
      ],
    },
    {
      id: 'company',
      label: '회사·고객센터 정보',
      description: '푸터와 정책 화면에 공통으로 표시되는 사업자 정보입니다.',
      fields: [
        text('company.serviceName', '서비스 이름'),
        text('company.name', '상호'),
        text('company.ceo', '대표자'),
        text('company.businessNumber', '사업자등록번호'),
        text('company.mailOrderNumber', '통신판매업 신고번호'),
        textarea('company.address', '사업장 주소'),
        text('company.tel', '고객센터 전화'),
        text('company.email', '고객센터 이메일'),
        textarea('company.supportHours', '고객센터 운영시간'),
        text('company.privacyOfficer', '개인정보 보호책임자'),
        text('company.hostingProvider', '호스팅 제공자'),
        url('company.businessLookupUrl', '사업자정보 조회 주소'),
      ],
    },
    {
      id: 'social',
      label: 'SNS·상담 채널',
      description: '푸터의 인스타그램과 카카오톡 연결 주소입니다.',
      fields: [
        url('social.instagramUrl', '인스타그램 주소'),
        text('social.instagramLabel', '인스타그램 표시 이름'),
        url('social.kakaoTalkUrl', '카카오톡 채널 주소'),
      ],
    },
  ],
};

const audit: CmsPageDefinition = {
  key: 'audit',
  title: 'Audit 소개',
  route: '/audit',
  group: '소개·콘텐츠',
  description: '백조오브제의 브랜드 검토 기준을 설명하는 화면입니다.',
  defaultContent: {
    hero: {
      visible: true,
      eyebrow: 'BAEKJO OBJET AUDIT STANDARD',
      title: '선택보다 먼저,\n확인하는 기준이 있습니다.',
      description: '백조오브제는 많이 소개하는 것보다 왜 선택했는지 설명할 수 있는 것을 중요하게 생각합니다. 브랜드의 철학과 제품의 특성, 실제 사용에서 확인되는 부분까지 각 브랜드와 제품에 맞춰 살펴봅니다.',
      image: '/images/brand-curation-hero.webp',
      imageAlt: '반려생활 상품 자료를 살펴보는 백조오브제 Audit',
      overlayText: '모든 브랜드를 소개하지 않습니다. 확인하고 선택한 브랜드만 소개합니다.',
      primaryCtaLabel: '브랜드 둘러보기',
      primaryCtaHref: '/brands',
      secondaryCtaLabel: '',
      secondaryCtaHref: '',
    },
    checkpoints: {
      visible: true,
      eyebrow: 'AUDIT CHECKPOINTS',
      title: '브랜드를 바라보는 기준',
      description: '브랜드마다 제품과 이야기가 다른 만큼 확인하는 내용도 달라집니다. 브랜드의 특성에 맞춰 필요한 자료와 내용을 함께 검토합니다.',
      items: [
        { number: '01', title: '브랜드 철학', description: '브랜드가 중요하게 생각하는 가치와 제품에 담긴 방향을 살펴봅니다.', bullets: '브랜드가 지향하는 가치\n제품에 담긴 생각과 방향\n반려동물을 대하는 태도', visible: true },
        { number: '02', title: '제품과 안전', description: '제품이 어떤 목적으로 만들어졌는지 살펴보고, 제품과 안전에 대해 확인할 수 있는 정보를 검토합니다.', bullets: '제품의 목적과 사용 방식\n소재·원료 등 제품 정보\n안전과 관련해 확인 가능한 자료', visible: true },
        { number: '03', title: '일관성과 운영', description: '브랜드가 중요하게 말하는 가치가 제품과 실제 운영에서도 이어지는지 살펴봅니다.', bullets: '브랜드가 말하는 가치와 제품의 연결\n제품 정보와 실제 안내의 일관성\n고객에게 전달되는 운영 과정', visible: true },
        { number: '04', title: '확인과 기록', description: '브랜드마다 중요하게 살펴봐야 할 내용을 확인하고, 확인한 범위 안에서 기록합니다.', bullets: '브랜드별로 중요하게 살펴본 내용\n검토에 참고한 자료와 이야기\n함께 알아둘 점', visible: true },
      ],
    },
    process: {
      visible: true,
      eyebrow: 'AUDIT PROCESS',
      title: 'Audit은 완료된 뒤에도 이어집니다',
      description: '새롭게 확인되는 내용과 변화가 있다면 다시 살펴보고, 필요한 내용을 더해 기록을 보완합니다.',
      items: [
        { title: '처음의 확인', description: '브랜드와 제품을 이해하고, 확인한 내용을 Audit에 담습니다.', visible: true },
        { title: '새로운 내용', description: '이후 새롭게 알게 된 자료와 변화도 다시 살펴봅니다.', visible: true },
        { title: '기록의 보완', description: '추가로 확인한 내용이 있다면 기존 Audit에 필요한 내용을 더합니다.', visible: true },
        { title: '이어지는 Audit', description: '완료된 기록에 머무르지 않고, 새롭게 확인되는 변화와 내용을 계속 기록합니다.', visible: true },
      ],
    },
    status: {
      visible: true,
      eyebrow: 'HOW TO READ',
      title: '화면에서는 이렇게 표시됩니다.',
      description: 'Audit 완료 후 추가 확인이나 업데이트가 필요한 경우, 상태를 구분해 표시합니다.',
      items: [
        { title: 'Audit 확인 완료', description: '현재 확인된 내용을 바탕으로 Audit이 완료된 상태입니다.', visible: true },
        { title: '추가 확인 중', description: 'Audit 완료 이후 새롭게 확인할 내용이나 자료를 추가로 살펴보고 있는 상태입니다.', visible: true },
        { title: '업데이트 예정', description: '추가로 확인된 내용이나 변경 사항을 Audit 기록에 반영할 예정입니다.', visible: true },
      ],
      notice: '※ 추가 확인 중 및 업데이트 예정은 Audit 완료 이후의 추가 확인·보완 상태를 의미하며, 입점 및 제품 판매는 기존과 동일하게 유지됩니다.',
      disclaimer: '백조오브제 Audit은 브랜드가 제공한 자료와 공개 정보를 바탕으로 한 큐레이션 기준입니다. 수의학적 진단, 법정 인증 또는 개별 반려동물에 대한 의료 판단을 대신하지 않습니다. 질환이나 알레르기가 있다면 구매 전 수의사와 상담해 주세요.',
      legalDisclaimer: '백조오브제 Audit은 브랜드와 제품에 대해 확인할 수 있는 자료와 내용을 바탕으로 진행하는 백조오브제의 자체 검토 시스템입니다. 법적 인증기관의 인증이나 개별 반려동물에 대한 의료적 판단을 의미하지 않습니다.',
    },
    closing: {
      visible: true,
      eyebrow: 'Continue exploring',
      title: '확인한 기준은 선택으로 이어집니다.',
      links: [
        { label: '브랜드 보기', href: '/brands', visible: true },
        { label: '셀렉션 보기', href: '/shop', visible: true },
      ],
    },
  },
  sections: [
    { id: 'hero', label: '첫 화면', description: 'Audit 화면에 들어오면 가장 먼저 보이는 영역입니다.', fields: [...heroFields, textarea('hero.overlayText', '이미지 위 문구')] },
    { id: 'checkpoints', label: '검토 기준', description: '검토 기준 카드의 문구와 순서를 관리합니다.', fields: [toggle('checkpoints.visible', '영역 표시'), text('checkpoints.eyebrow', '작은 영문 제목'), text('checkpoints.title', '제목'), textarea('checkpoints.description', '설명'), items('checkpoints.items', '검토 기준 카드', numberedCardItemFields)] },
    { id: 'process', label: '진행 과정', description: 'Audit이 계속 보완되는 과정과 순서를 관리합니다.', fields: [toggle('process.visible', '영역 표시'), text('process.eyebrow', '작은 영문 제목'), text('process.title', '제목'), textarea('process.description', '설명'), items('process.items', '진행 단계', titleDescriptionItemFields)] },
    { id: 'status', label: '표시 상태', description: '완료·확인 중·업데이트 예정 안내를 관리합니다.', fields: [toggle('status.visible', '영역 표시'), text('status.eyebrow', '작은 영문 제목'), text('status.title', '제목'), textarea('status.description', '설명'), items('status.items', '상태 카드', titleDescriptionItemFields), textarea('status.notice', '상태 안내 문구'), textarea('status.disclaimer', '구매 전 주의 안내'), textarea('status.legalDisclaimer', 'Audit 법적 안내')] },
    { id: 'closing', label: '마지막 안내', description: '화면 맨 아래의 다음 행동 안내입니다.', fields: [toggle('closing.visible', '영역 표시'), text('closing.eyebrow', '작은 영문 제목'), text('closing.title', '제목'), links('closing.links', '이동 버튼')] },
  ],
};

const b2b: CmsPageDefinition = {
  key: 'b2b',
  title: 'B2B 소개',
  route: '/b2b',
  group: '서비스',
  description: '기관·브랜드 파트너십과 협업 프로그램을 소개하는 화면입니다.',
  defaultContent: {
    hero: { visible: true, eyebrow: 'BAEKJO OBJET FOR BUSINESS', title: '반려가족과 만나는 순간을\n함께 설계합니다.', description: '백조오브제 B2B는 기관과 브랜드의 목적에 맞춰 상품과 콘텐츠, 필요한 구성을 함께 제안합니다.', image: '/images/care_guide_hero.png', imageAlt: '반려생활 기관을 위한 백조오브제 B2B 파트너십', primaryCtaLabel: 'B2B 문의하기', primaryCtaHref: '/landing/care-kit#partner', secondaryCtaLabel: '협업 프로그램 보기', secondaryCtaHref: '#programs', overlayEyebrow: 'Care in every touchpoint', overlayText: '기관의 목적과 보호자의 필요가 만나는 구성을 제안합니다.' },
    partners: {
      visible: true, eyebrow: 'FOR PARTNERS', title: '목적에 따라 협업의 방식도 달라집니다.', description: '기관과 브랜드의 목적에 맞춰 필요한 협업 방식을 함께 찾습니다.',
      items: [
        { title: '동물병원', description: '보호자와 반려동물이 필요한 상황에 맞춰 상품과 구성을 제안합니다.', visible: true },
        { title: '기업·단체', description: '임직원 복지, 고객 선물, 캠페인 등 목적에 맞춰 상품과 구성을 제안합니다.', visible: true },
        { title: '반려생활 공간', description: '호텔, 유치원, 장례식장·추모 공간 등 공간의 성격과 이용 목적에 맞는 구성을 제안합니다.', visible: true },
        { title: '브랜드 파트너', description: '입점부터 공동 기획까지 브랜드의 방향과 목적에 맞는 협업 방식을 함께 찾습니다.', visible: true },
      ],
    },
    programs: {
      visible: true, eyebrow: 'PARTNERSHIP PROGRAMS', title: '필요에 맞는 협업 방식을 제안합니다.', description: '상품 공급부터 케어키트, 입점과 공동 기획까지 목적에 맞는 방식으로 협업합니다.',
      notice: '※ 프로젝트는 충분한 협의와 준비를 거쳐 공개하며, 기획·진행 단계의 내용은 노출을 지양합니다. 일부 프로젝트는 파트너사와의 협의에 따라 공개되지 않을 수 있습니다.',
      items: [
        { eyebrow: 'CARE KIT', title: '상황별 케어키트', description: '웰컴, 위로 등 필요한 순간과 목적에 맞춰 상품과 안내 구성을 제안합니다.', bullets: '목적에 맞는 상품 구성\n수량·예산에 따른 제안\n필요한 안내 구성', href: '/landing/care-kit', linkLabel: '케어키트 안내', image: '', imageAlt: '', visible: true },
        { eyebrow: 'SUPPLY', title: '대량 구매·정기 공급', description: '기업과 기관에 필요한 상품을 수량, 예산, 일정에 맞춰 제안합니다.', bullets: '대량 구매 협의\n정기 공급 협의\n구성 및 납품 일정 조율', href: '/signup', linkLabel: 'B2B 회원가입', image: '', imageAlt: '', visible: true },
        { eyebrow: 'PARTNERSHIP', title: '입점·공동 기획', description: '브랜드의 방향과 제품을 살펴보고, 입점부터 필요한 협업 방식을 함께 논의합니다.', bullets: '입점 및 운영 협의\n브랜드·제품에 맞는 협업 검토\n필요 시 공동 기획 진행', href: '/signup', linkLabel: '브랜드 회원가입', image: '', imageAlt: '', visible: true },
      ],
    },
    process: {
      visible: true, eyebrow: 'HOW IT WORKS', title: '협업은 이렇게 진행됩니다.', description: '구체적인 협업 내용이 정해지기 전에도 문의할 수 있습니다. 협업 목적을 확인한 뒤 필요한 범위와 일정을 함께 정리합니다.',
      notice: '※ 진행 중인 프로젝트와 검토 일정에 따라 기획 및 제안까지 다소 시간이 소요될 수 있습니다. 충분한 검토가 필요한 협업은 일정에 여유를 두고 문의해 주세요.',
      items: [
        { title: '문의 접수', description: '기관·브랜드 유형과 원하는 협업 내용을 남겨주세요.', visible: true },
        { title: '내용 확인', description: '문의 내용을 바탕으로 필요한 사항과 협업 방향을 확인합니다.', visible: true },
        { title: '제안 및 협의', description: '협업 범위와 세부 내용, 일정 등을 정리해 함께 협의합니다.', visible: true },
        { title: '진행', description: '협의된 내용과 일정에 따라 협업을 진행합니다.', visible: true },
      ],
    },
    closing: { visible: true, eyebrow: 'START A PARTNERSHIP', title: '필요한 순간과 목적을 들려주세요.', description: '서로의 가치를 지키며 함께 성장할 수 있는 관계를 만들어갑니다.', links: [{ label: 'B2B 문의하기', href: '/landing/care-kit#partner', visible: true }, { label: '파트너 회원가입', href: '/signup', visible: true }] },
  },
  sections: [
    { id: 'hero', label: '첫 화면', description: 'B2B 화면의 대표 문구와 이미지입니다.', fields: [...heroFields, text('hero.overlayEyebrow', '이미지 위 작은 문구'), textarea('hero.overlayText', '이미지 위 큰 문구')] },
    { id: 'partners', label: '파트너 유형', description: '협업 대상 소개 카드와 순서를 관리합니다.', fields: [toggle('partners.visible', '영역 표시'), text('partners.eyebrow', '작은 영문 제목'), text('partners.title', '제목'), textarea('partners.description', '설명'), items('partners.items', '파트너 카드', titleDescriptionItemFields)] },
    { id: 'programs', label: '협업 프로그램', description: '프로그램 카드를 추가·삭제하고 순서를 바꿉니다.', fields: [toggle('programs.visible', '영역 표시'), text('programs.eyebrow', '작은 영문 제목'), text('programs.title', '제목'), textarea('programs.description', '설명'), textarea('programs.notice', '공개 안내'), items('programs.items', '프로그램 카드', detailedCardItemFields)] },
    { id: 'process', label: '진행 과정', description: '문의부터 진행까지의 단계를 관리합니다.', fields: [toggle('process.visible', '영역 표시'), text('process.eyebrow', '작은 영문 제목'), text('process.title', '제목'), textarea('process.description', '설명'), items('process.items', '진행 단계', titleDescriptionItemFields), textarea('process.notice', '일정 안내')] },
    { id: 'closing', label: '마지막 문의 안내', description: '화면 맨 아래의 문의 유도 문구입니다.', fields: [toggle('closing.visible', '영역 표시'), text('closing.eyebrow', '작은 영문 제목'), text('closing.title', '제목'), textarea('closing.description', '설명'), links('closing.links', '문의 버튼')] },
  ],
};

const simpleEditorial = (input: {
  key: string;
  title: string;
  route: string;
  group: CmsPageDefinition['group'];
  description: string;
  hero: Record<string, unknown>;
  bodyTitle: string;
  bodyDescription: string;
}): CmsPageDefinition => ({
  key: input.key,
  title: input.title,
  route: input.route,
  group: input.group,
  description: input.description,
  defaultContent: {
    hero: { visible: true, secondaryCtaLabel: '', secondaryCtaHref: '', ...input.hero },
    body: { visible: true, title: input.bodyTitle, description: input.bodyDescription },
  },
  sections: [
    // 각 화면이 자기 필드 배열을 갖게 복사한다. 공유 배열을 그대로 넘기면 케어키트에
    // 전용 필드를 추가할 때 전문가·보험 편집 화면에도 연결되지 않은 입력칸이 함께 생긴다.
    { id: 'hero', label: '첫 화면', description: '가장 먼저 보이는 대표 문구와 이미지입니다.', fields: [...heroFields] },
    { id: 'body', label: '본문 안내', description: '주요 내용 카드 위에 표시되는 안내입니다.', fields: [toggle('body.visible', '본문 표시'), text('body.title', '본문 제목'), textarea('body.description', '본문 설명')] },
  ],
});

const concernsIndex: CmsPageDefinition = {
  key: 'concerns',
  title: '케어 가이드 목록',
  route: '/concerns',
  group: '소개·콘텐츠',
  description: '케어 가이드 목록의 첫 화면, 추가 케어, 보험 배너와 자주 묻는 질문을 관리합니다. 고민 카드 자체는 고민 관리에서 편집합니다.',
  defaultContent: {
    hero: {
      visible: true,
      eyebrow: 'CARE GUIDE',
      title: '요즘, 우리 아이에게\n어떤 변화가 보이나요?',
      description: '우리 아이가 보내는 작은 신호부터 살펴보세요.\n일상에서 알아두면 좋은 케어 기준을 정리했습니다.',
      image: '/images/care-guide-hero-pet-family.png',
      imageAlt: '보호자와 함께 생활하는 강아지와 고양이',
      imagePosition: '52% center',
      indexLabel: 'INDEX',
      indexSuffix: 'CARE',
    },
    secondary: {
      visible: true,
      title: '추가로 살펴볼 생활 케어',
      description: '일상에서 함께 확인하면 좋은 관리 주제입니다.',
    },
    insurance: {
      visible: true,
      title: '우리 아이에게 필요한 보장은 무엇일까요?',
      description: '나이와 건강 상태를 바탕으로 우리 아이에게 맞는 보험을 살펴보세요.',
      buttonLabel: '보험 분석하기',
      buttonHref: '/insurance',
      image: '/images/insurance-dog.webp',
      imageAlt: '펫보험 분석',
    },
    faq: {
      visible: true,
      title: '많이 궁금해하시는 점',
      items: [
        { title: '이 정보는 어떻게 활용하면 되나요?', description: '평소 우리 아이의 모습과 비교해 몸이나 행동에 달라진 점이 있는지 살펴보는 데 참고해 주세요. 작은 변화도 평소와 비교해 알아차리는 것이 중요합니다.', visible: true },
        { title: '여러 고민이 함께 보이면 어떻게 살펴봐야 하나요?', description: '하나의 변화가 여러 원인과 관련될 수 있고, 여러 변화가 함께 나타나기도 합니다. 한 가지 증상만 따로 보기보다 우리 아이에게 함께 나타나는 변화를 살펴보세요.', visible: true },
        { title: '언제 진료가 필요한가요?', description: '각 상세의 병원 진료를 고려해야 할 신호를 참고해 주세요. 해당하지 않더라도 평소와 다른 변화가 걱정되거나 판단하기 어렵다면 수의사에게 확인해보는 것이 좋습니다.', visible: true },
        { title: '이 정보만으로 건강 상태를 판단해도 되나요?', description: '이 내용은 보호자가 일상에서 변화를 알아차리는 데 도움을 주기 위한 참고 정보입니다. 같은 변화도 원인이 다를 수 있으므로 특정 질환을 판단하거나 진단하는 기준으로 사용하지 않습니다.', visible: true },
      ],
    },
  },
  sections: [
    {
      id: 'hero',
      label: '첫 화면',
      description: '케어 가이드 목록에 들어오면 가장 먼저 보이는 영역입니다.',
      fields: [
        toggle('hero.visible', '첫 화면 표시'),
        text('hero.eyebrow', '작은 영문 제목'),
        textarea('hero.title', '큰 제목'),
        textarea('hero.description', '소개 문구'),
        image('hero.image', '대표 이미지'),
        text('hero.imageAlt', '대표 이미지 설명'),
        text('hero.imagePosition', '대표 이미지 보이는 위치'),
        text('hero.indexLabel', '카드 수 위 작은 이름'),
        text('hero.indexSuffix', '카드 수 뒤 이름'),
      ],
    },
    {
      id: 'secondary',
      label: '추가 생활 케어',
      description: '7번째부터 12번째 고민 카드 위에 표시됩니다. 카드 내용은 고민 관리에서 수정합니다.',
      fields: [toggle('secondary.visible', '영역 표시'), text('secondary.title', '제목'), textarea('secondary.description', '설명')],
    },
    {
      id: 'insurance',
      label: '보험 안내 배너',
      description: '공통 설정에서 펫보험을 켠 경우에만 표시되는 배너입니다.',
      fields: [
        toggle('insurance.visible', '배너 표시'),
        textarea('insurance.title', '제목'),
        textarea('insurance.description', '설명'),
        text('insurance.buttonLabel', '버튼 이름'),
        url('insurance.buttonHref', '버튼 연결 주소'),
        image('insurance.image', '이미지'),
        text('insurance.imageAlt', '이미지 설명'),
      ],
    },
    {
      id: 'faq',
      label: '자주 묻는 질문',
      description: '질문과 답변을 추가·수정·삭제하고 순서를 바꿉니다.',
      fields: [toggle('faq.visible', '영역 표시'), text('faq.title', '제목'), items('faq.items', '질문과 답변', titleDescriptionItemFields)],
    },
  ],
};

const experts = simpleEditorial({
  key: 'experts', title: '전문가 칼럼', route: '/experts', group: '소개·콘텐츠', description: '전문가 관점과 추천 상품 화면입니다.',
  hero: { eyebrow: "Expert's View", title: '전문가 관점으로 살펴보는\n상품 선택 기준', description: '백조오브제가 수의·영양·행동 전문가의 관점을 바탕으로 우리 아이에게 맞는 상품 선택 기준을 정리했습니다.', image: '/images/poodle-pet-food.png', imageAlt: '전문가 추천 강아지', primaryCtaLabel: '고민별 케어 보기', primaryCtaHref: '/concerns' },
  bodyTitle: '상품은 이렇게 살펴봅니다.', bodyDescription: '전문가의 서로 다른 관점을 함께 확인해 상품을 살펴봅니다.',
});

Object.assign(experts.defaultContent.body as Record<string, unknown>, {
  perspectiveItems: [
      { filterValue: '수의 관점', productRule: 'veterinary', title: '수의 관점', description: '건강 상태와 안전성을 중심으로 확인합니다.', bullets: '대상 연령과 건강 상태\n성분과 사용상 주의사항\n질환·복용약과의 관계', linkLabel: '수의 관점 상품 보기', visible: true },
      { filterValue: '영양 관점', productRule: 'nutrition', title: '영양 관점', description: '원료와 영양 균형을 꼼꼼하게 확인합니다.', bullets: '주요 원료, 영양 성분\n알레르기 유발 가능성\n급여 목적과 영양 균형', linkLabel: '영양 관점 상품 보기', visible: true },
      { filterValue: '행동·생활 관점', productRule: 'lifestyle', title: '행동·생활 관점', description: '생활 환경과 습관을 함께 고려합니다.', bullets: '스트레스 완화에 도움\n활동량과 생활 패턴\n관리의 편의성과 지속성', linkLabel: '행동·생활 관점 상품 보기', visible: true },
  ],
  processItems: [
    { title: '반려동물 상태 확인', description: '', visible: true },
    { title: '성분·원료 확인', description: '', visible: true },
    { title: '제조·사용 기준 확인', description: '', visible: true },
    { title: '실제 사용 목적과 적합성 정리', description: '', visible: true },
  ],
  productsTitle: '전문가 기준으로 엄선한 추천 상품',
  allFilterLabel: '전체',
  emptyText: '선택한 관점의 추천 상품이 없습니다.',
  noticeTitle: '추천 결과는 반려동물의 상태와 사용 목적에 따라 달라질 수 있습니다.',
  noticeDescription: '질환·복용 약·알레르기 등이 있는 경우 전문가 상담이 필요합니다.',
  noticeLinkLabel: '케어 가이드 더 보기',
  noticeLinkHref: '/concerns',
});
experts.sections[1]?.fields.push(
  items('body.perspectiveItems', '전문가 관점 카드', perspectiveItemFields),
  items('body.processItems', '상품 선정 단계', titleDescriptionItemFields),
  text('body.productsTitle', '추천 상품 제목'),
  text('body.allFilterLabel', '전체 상품 버튼 이름'),
  text('body.emptyText', '추천 상품이 없을 때 문구'),
  textarea('body.noticeTitle', '하단 주의 제목'),
  textarea('body.noticeDescription', '하단 주의 설명'),
  text('body.noticeLinkLabel', '하단 버튼 이름'),
  url('body.noticeLinkHref', '하단 버튼 연결 주소'),
);

const careKit = simpleEditorial({
  key: 'care-kit', title: '케어키트 소개', route: '/landing/care-kit', group: '서비스', description: '케어키트 구성과 제휴 문의 화면입니다.',
  hero: { eyebrow: 'CARE KIT', title: '필요한 순간에 맞는\n케어를 담습니다.', description: '파트너의 목적과 상황에 맞춰 상품과 안내를 구성하고, 필요한 협업 방식을 함께 고민합니다.', image: '/images/care_guide_hero.png', imageAlt: '보호자에게 필요한 순간을 위한 백조오브제 케어 키트', primaryCtaLabel: '파트너십 문의하기', primaryCtaHref: '#partner' },
  bodyTitle: '파트너와 함께 만드는 케어', bodyDescription: '초기 케어키트는 필요한 순간에 집중할 수 있도록 간결하게 구성하며, 파트너의 목적과 필요에 따라 구성과 범위를 계속 발전시켜갑니다.',
});

Object.assign(careKit.defaultContent.hero as Record<string, unknown>, {
  overlayEyebrow: 'MOMENTS OF CARE',
  overlayText: '각 순간을 생각하며 상품과 안내를 구성합니다.',
});
Object.assign(careKit.defaultContent.body as Record<string, unknown>, {
  eyebrow: 'CARE KIT PROJECT',
  partnerVisible: true,
  partnerEyebrow: 'CARE KIT PARTNER',
  partnerLogo: '/brands/penefit-official.png',
  partnerLogoAlt: '페네핏 로고',
  partnerTitle: '첫 케어키트 프로젝트는 페네핏과 함께 기획하고 제작합니다.',
  partnerDescription: '현재 상세 구성 및 디자인 이미지는 공개하지 않습니다.',
  disclosure: '※ 공개 가능한 파트너 및 협업 내용에 한해 소개하며, 비공개로 진행되는 프로젝트는 노출하지 않습니다.',
  inquiryVisible: true,
  inquiryEyebrow: 'PARTNERSHIP INQUIRY',
  inquiryTitle: '협업·제휴 문의',
  inquiryDescription: '함께하고 싶은 협업이나 제휴의 목적과 내용을 자유롭게 남겨주세요.',
  kitItemsLabel: '주요 구성품',
  kitTargetLabel: '추천 대상',
});
careKit.sections[0]?.fields.push(
  text('hero.overlayEyebrow', '이미지 위 작은 문구'),
  textarea('hero.overlayText', '이미지 위 큰 문구'),
);
careKit.sections[1]?.fields.push(
  text('body.eyebrow', '작은 영문 제목'),
  toggle('body.partnerVisible', '파트너 소개 표시'),
  text('body.partnerEyebrow', '파트너 작은 영문 제목'),
  image('body.partnerLogo', '파트너 로고'),
  text('body.partnerLogoAlt', '파트너 로고 설명'),
  textarea('body.partnerTitle', '파트너 소개 제목'),
  textarea('body.partnerDescription', '파트너 소개 설명'),
  textarea('body.disclosure', '프로젝트 공개 안내'),
  toggle('body.inquiryVisible', '협업 문의 영역 표시'),
  text('body.inquiryEyebrow', '협업 문의 작은 영문 제목'),
  text('body.inquiryTitle', '협업 문의 제목'),
  textarea('body.inquiryDescription', '협업 문의 설명'),
  text('body.kitItemsLabel', '키트 구성품 앞 이름'),
  text('body.kitTargetLabel', '키트 추천 대상 이름'),
);

const shopIndex: CmsPageDefinition = {
  key: 'shop',
  title: '상품 목록 문구',
  route: '/shop',
  group: '소개·콘텐츠',
  description: '상품 목록 첫 화면, 추천 영역과 검색 결과 안내 문구를 관리합니다.',
  defaultContent: {
    hero: {
      eyebrow: 'BAEKJO OBJET SELECTION',
      title: '우리 아이를 위한 좋은 선택',
      description: '백조오브제의 기준으로 살펴보고 선택한 제품을 소개합니다.',
      searchPlaceholder: '상품명, 브랜드명, 키워드를 검색하세요',
      searchButtonLabel: '검색',
    },
    featured: { visible: true, title: 'DAILY PICK' },
    catalog: { allLabel: '전체', allProductsLabel: '전체 상품', filterLabel: '필터', resetLabel: '필터 초기화', countSuffix: '개', resultsButtonSuffix: '개 상품 보기' },
    filters: {
      petTypeTitle: '반려동물', categoryTitle: '카테고리', brandTitle: '브랜드', priceTitle: '가격',
      detailLabel: '상세 필터', concernTitle: '고민', ratingTitle: '평점', allOptionLabel: '전체',
      dogLabel: '강아지', catLabel: '고양이', smallLabel: '소동물', allRatingLabel: '전체 평점',
      ratingFourLabel: '4.0 이상', ratingFourHalfLabel: '4.5 이상',
      priceUnderLabel: '2만원 미만', priceMidLabel: '2-5만원', priceHighLabel: '5-10만원', priceOverLabel: '10만원 이상',
      sortRecommendedLabel: '기본순', sortPopularLabel: '인기순', sortNewestLabel: '최신순',
      sortReviewsLabel: '후기 많은 순', sortPriceLowLabel: '낮은 가격순', sortPriceHighLabel: '높은 가격순',
    },
    empty: { title: '선택한 조건에 맞는 상품을 찾지 못했어요.', buttonLabel: '필터 초기화' },
  },
  sections: [
    {
      id: 'hero',
      label: '상품 목록 첫 화면',
      description: '상품 목록 위쪽의 제목·설명과 검색창 문구입니다.',
      fields: [
        text('hero.eyebrow', '작은 영문 제목'),
        text('hero.title', '큰 제목'),
        textarea('hero.description', '설명'),
        text('hero.searchPlaceholder', '검색창 안내'),
        text('hero.searchButtonLabel', '검색 버튼 이름'),
      ],
    },
    {
      id: 'catalog',
      label: '추천·목록 안내',
      description: '추천 상품 영역과 목록에서 반복되는 안내 이름입니다.',
      fields: [
        toggle('featured.visible', '추천 상품 영역 표시'),
        text('featured.title', '추천 상품 제목'),
        text('catalog.allLabel', '전체 카테고리 이름'),
        text('catalog.allProductsLabel', '전체 상품 제목'),
        text('catalog.filterLabel', '필터 이름'),
        text('catalog.resetLabel', '필터 초기화 이름'),
        text('catalog.countSuffix', '상품 수 뒤 단위'),
        text('catalog.resultsButtonSuffix', '모바일 결과 버튼 문구'),
        text('empty.title', '검색 결과 없음 안내'),
        text('empty.buttonLabel', '검색 결과 없음 버튼'),
      ],
    },
    {
      id: 'filters',
      label: '필터·정렬 이름',
      description: '필터 묶음 제목과 정렬 이름을 수정합니다. 반려동물·카테고리·가격·평점 항목은 상품 카테고리 관리에서 수정합니다.',
      fields: [
        text('filters.petTypeTitle', '반려동물 필터 제목'), text('filters.categoryTitle', '카테고리 필터 제목'),
        text('filters.brandTitle', '브랜드 필터 제목'), text('filters.priceTitle', '가격 필터 제목'),
        text('filters.detailLabel', '상세 필터 이름'), text('filters.concernTitle', '고민 필터 제목'),
        text('filters.ratingTitle', '평점 필터 제목'), text('filters.allOptionLabel', '전체 선택 이름'),
        text('filters.sortRecommendedLabel', '기본 정렬 이름'), text('filters.sortPopularLabel', '인기 정렬 이름'), text('filters.sortNewestLabel', '최신 정렬 이름'),
        text('filters.sortReviewsLabel', '후기 정렬 이름'), text('filters.sortPriceLowLabel', '낮은 가격 정렬 이름'), text('filters.sortPriceHighLabel', '높은 가격 정렬 이름'),
      ],
    },
  ],
};

const brandsIndex: CmsPageDefinition = {
  key: 'brands',
  title: '브랜드 홈페이지 전체 관리',
  route: '/brands',
  group: '소개·콘텐츠',
  description: '브랜드 홈페이지의 첫 화면부터 브랜드 카드·상세와 입점 안내까지 실제 표시 순서대로 관리합니다.',
  defaultContent: {
    hero: {
      eyebrow: 'BRAND CURATION',
      title: '우리 아이를 생각한다면,\n좋은 선택이 필요합니다.',
      description: '우리 아이와의 일상에 도움이 되길 바라는 마음으로, 백조오브제가 선택한 브랜드를 소개합니다.',
      image: '/images/brands-hero-cat-architectural.png',
      imageAlt: '햇살이 드는 공간에 앉아 있는 고양이',
      countLabel: '검증 브랜드 수',
      countSuffix: '곳',
    },
    standards: {
      visible: true,
      title: 'WHAT WE VALUE',
      items: [
        { title: 'WHO', description: '반려동물의 행복을 가장 먼저 생각하는 브랜드', visible: true },
        { title: 'VALUE', description: '제품 하나에도 브랜드의 철학과 진심을 담는 브랜드', visible: true },
        { title: 'PRINCIPLE', description: '제품이 만들어지는 과정에서도 타협하지 않는 브랜드', visible: true },
        { title: 'SAFETY', description: '안심하고 선택할 수 있는 안전성을 갖춘 브랜드', visible: true },
        { title: 'BELIEF', description: '시간이 지나도 흔들리지 않는 가치를 지키는 브랜드', visible: true },
      ],
    },
    spotlight: { visible: true, label: '스포트라이트 브랜드', buttonLabel: '브랜드 자세히 보기', fallbackText: '브랜드 스토리 확인하기' },
    catalog: { sortDefaultLabel: '기본순', sortAzLabel: '브랜드 A-Z', loadMoreLabel: '더 보기' },
    empty: { title: '조건에 맞는 브랜드가 없어요.', description: '다른 브랜드 이야기도 천천히 둘러보세요.', buttonLabel: '전체 브랜드 보기' },
    partnership: {
      visible: true,
      title: '기준이 같다면, 함께 만들어갑니다.',
      description: '모든 프로젝트는 백조오브제 Audit을 거친 입점 브랜드에 한해 진행합니다.\n신뢰를 바탕으로 브랜드에 가장 적합한 프로젝트를 제안합니다.',
      image: '/images/poodle-pet-food.png',
      imageAlt: '프리미엄 펫푸드 제안',
      buttonLabel: '파트너십 문의하기',
      buttonHref: '/landing/care-kit',
    },
  },
  sections: [
    {
      id: 'hero',
      label: '1. 브랜드관 첫 화면',
      description: '첫 화면의 이미지와 제목·설명·브랜드 수 앞 이름입니다.',
      fields: [text('hero.eyebrow', '작은 영문 제목'), textarea('hero.title', '큰 제목'), textarea('hero.description', '설명'), image('hero.image', '대표 이미지'), text('hero.imageAlt', '이미지 설명'), text('hero.countLabel', '브랜드 수 설명'), text('hero.countSuffix', '브랜드 수 뒤 단위')],
    },
    {
      id: 'standards',
      label: '2. 브랜드 선정 기준',
      description: '선정 기준 카드를 등록·수정·삭제하고 순서를 바꿉니다.',
      fields: [toggle('standards.visible', '영역 표시'), text('standards.title', '영역 제목'), items('standards.items', '기준 카드', titleDescriptionItemFields)],
    },
    {
      id: 'spotlight',
      label: '3. 스포트라이트',
      description: '추천 브랜드 위에 표시되는 이름과 버튼입니다.',
      fields: [toggle('spotlight.visible', '영역 표시'), text('spotlight.label', '작은 제목'), text('spotlight.buttonLabel', '버튼 이름'), text('spotlight.fallbackText', '로고가 없을 때 안내')],
    },
    {
      id: 'catalog',
      label: '4. 필터·정렬',
      description: '브랜드 필터 아래의 정렬 버튼과 더 보기 버튼에 고객에게 표시되는 이름입니다.',
      fields: [text('catalog.sortDefaultLabel', '기본 정렬 이름'), text('catalog.sortAzLabel', '가나다순 정렬 이름'), text('catalog.loadMoreLabel', '더 보기 버튼 이름')],
    },
    {
      id: 'brandRecords',
      label: '5. 브랜드 카드·상세',
      description: '고객 브랜드 카드와 상세페이지에 연결되는 브랜드를 등록·수정·삭제하고 노출 순서를 관리합니다.',
      fields: [
        text('empty.title', '브랜드가 없을 때 제목'), textarea('empty.description', '브랜드가 없을 때 설명'), text('empty.buttonLabel', '전체 브랜드 보기 버튼'),
      ],
    },
    {
      id: 'partnership',
      label: '6. 브랜드 입점 안내',
      description: '브랜드 홈페이지 맨 아래의 파트너십·입점 안내입니다.',
      fields: [
        toggle('partnership.visible', '파트너십 안내 표시'), text('partnership.title', '파트너십 제목'), textarea('partnership.description', '파트너십 설명'), image('partnership.image', '파트너십 이미지'), text('partnership.imageAlt', '이미지 설명'), text('partnership.buttonLabel', '버튼 이름'), url('partnership.buttonHref', '버튼 연결 주소'),
      ],
    },
  ],
};

const reviewsIndex: CmsPageDefinition = {
  key: 'reviews',
  title: '후기 목록 문구',
  route: '/reviews',
  group: '소개·콘텐츠',
  description: '후기 목록 첫 화면, 통계 이름, 필터와 빈 목록 안내를 관리합니다.',
  defaultContent: {
    hero: { eyebrow: 'REAL EXPERIENCES', title: '보호자 후기' },
    stats: { totalLabel: 'Total voices', ratingLabel: 'Average rating', photoLabel: 'Photo reviews', countSuffix: '개' },
    filters: [
      { value: 'all', label: '전체', visible: true },
      { value: 'photo', label: '사진 후기', visible: true },
      { value: 'dog', label: '강아지', visible: true },
      { value: 'cat', label: '고양이', visible: true },
      { value: 'small', label: '소동물', visible: true },
      { value: 'other', label: '기타', visible: true },
    ],
    empty: { title: '후기가 없습니다.', description: '아직 등록된 후기가 없습니다.' },
  },
  sections: [
    { id: 'hero', label: '후기 첫 화면', description: '화면 제목과 통계 카드의 이름입니다.', fields: [text('hero.eyebrow', '작은 영문 제목'), text('hero.title', '큰 제목'), text('stats.totalLabel', '전체 후기 통계 이름'), text('stats.ratingLabel', '평균 별점 통계 이름'), text('stats.photoLabel', '사진 후기 통계 이름'), text('stats.countSuffix', '후기 수 뒤 단위')] },
    { id: 'filters', label: '후기 필터', description: '필터를 추가·수정·삭제하고 순서를 바꿉니다. 값은 all, photo, dog, cat, small, other 중 하나를 사용합니다.', fields: [items('filters', '필터 목록', [{ key: 'value', label: '필터 값', type: 'text' }, { key: 'label', label: '고객에게 보이는 이름', type: 'text' }, { key: 'visible', label: '표시', type: 'boolean', defaultValue: true }])] },
    { id: 'empty', label: '빈 목록 안내', description: '조건에 맞는 후기가 없을 때 보이는 문구입니다.', fields: [text('empty.title', '제목'), textarea('empty.description', '설명')] },
  ],
};

const noticesIndex: CmsPageDefinition = {
  key: 'notices',
  title: '공지 목록 문구',
  route: '/notices',
  group: '소개·콘텐츠',
  description: '공지 목록의 제목·설명·건수 이름과 표 머리글을 관리합니다.',
  defaultContent: {
    hero: { eyebrow: 'NEWS & NOTICE', title: '공지사항', description: '백조오브제의 새로운 소식과 안내', countSuffix: '개의 소식' },
    table: { numberLabel: 'No', categoryLabel: '분류', titleLabel: '제목', dateLabel: '작성시간' },
    empty: { title: '등록된 소식이 없습니다.', description: '새 소식이 등록되면 이곳에 표시됩니다.' },
  },
  sections: [
    { id: 'hero', label: '공지 목록 첫 화면', description: '화면 위쪽의 제목·설명과 소식 건수 이름입니다.', fields: [text('hero.eyebrow', '작은 영문 제목'), text('hero.title', '큰 제목'), textarea('hero.description', '설명'), text('hero.countSuffix', '소식 건수 뒤 이름')] },
    { id: 'table', label: '공지 표 이름', description: 'PC 목록 표의 각 열 이름입니다.', fields: [text('table.numberLabel', '번호'), text('table.categoryLabel', '분류'), text('table.titleLabel', '제목'), text('table.dateLabel', '작성시간')] },
    { id: 'empty', label: '빈 목록 안내', description: '공개 공지가 하나도 없을 때 보이는 문구입니다.', fields: [text('empty.title', '제목'), textarea('empty.description', '설명')] },
  ],
};

const insuranceLanding = simpleEditorial({
  key: 'insurance-landing', title: '펫보험 랜딩', route: '/landing/insurance', group: '서비스', description: '무료 보험 분석 신청을 안내하는 화면입니다.',
  hero: { eyebrow: 'FREE INSURANCE REVIEW', title: '옆집 아이의 정답이\n우리 아이의 정답일까요?', description: '매달 바뀌는 수많은 약관과 보장 조건, 보호자님이 모두 비교하기는 벅찹니다. 백조오브제가 객관적인 시선으로 우리 아이에게 진짜 유리한 선택지를 정리해 드립니다.', image: '', imageAlt: '', primaryCtaLabel: '무료 분석 신청하기', primaryCtaHref: '/insurance/apply' },
  bodyTitle: '왜 백조오브제의 분석일까요?', bodyDescription: '판매가 목적이 아닌, 아이의 생애 주기와 리스크를 먼저 봅니다.',
});

Object.assign(insuranceLanding.defaultContent.body as Record<string, unknown>, {
  benefitItems: [
    { title: '가입 강요 없는 투명함', description: '지금 가입하신 보험이 최선이라면, 유지하시라고 정직하게 말씀드립니다.', visible: true },
    { title: '집요한 약관 분석', description: '눈에 띄는 보장 금액 뒤에 숨은 세부 약관과 면책 조항까지 꼼꼼히 살핍니다.', visible: true },
    { title: '종특과 병력 맞춤 매칭', description: '우리 아이의 품종 특이성과 과거 병력에 꼭 필요한 특약을 찾아냅니다.', visible: true },
  ],
  processVisible: true,
  processTitle: '분석은 이렇게 진행됩니다',
  processItems: [
    { title: '간단한 정보 입력', description: '아이의 정보와 고민을 남겨주세요.', visible: true },
    { title: '전담 분석가 배정', description: '입력하신 내용을 바탕으로 분석가가 배정됩니다.', visible: true },
    { title: '맞춤 약관 시뮬레이션', description: '여러 조건들을 시뮬레이션하며 비교합니다.', visible: true },
    { title: '상세 리포트 도착', description: '정리된 결과를 카카오톡이나 이메일로 받습니다.', visible: true },
  ],
  ctaVisible: true,
  ctaTitle: '1분이면 충분합니다.',
  ctaDescription: '무료 분석 신청 시 어떤 비용이나 가입 의무도 발생하지 않습니다.\n우리 아이를 위한 똑똑한 첫걸음, 지금 시작해보세요.',
  ctaLabel: '무료 분석 신청하기',
  ctaHref: '/insurance/apply',
});
insuranceLanding.sections[1]?.fields.push(
  items('body.benefitItems', '분석 장점 카드', titleDescriptionItemFields),
  toggle('body.processVisible', '진행 과정 표시'),
  text('body.processTitle', '진행 과정 제목'),
  items('body.processItems', '진행 단계', titleDescriptionItemFields),
  toggle('body.ctaVisible', '마지막 신청 안내 표시'),
  text('body.ctaTitle', '마지막 신청 제목'),
  textarea('body.ctaDescription', '마지막 신청 설명'),
  text('body.ctaLabel', '신청 버튼 이름'),
  url('body.ctaHref', '신청 버튼 연결 주소'),
);

const legalPage = (
  key: string,
  title: string,
  route: string,
  effectiveDate: string,
  introduction: string,
  articles: Array<{ title: string; body: string; visible: boolean }>,
  footerNote: string,
): CmsPageDefinition => ({
  key,
  title,
  route,
  group: '정책',
  description: `${title}의 제목, 시행일, 모든 조항과 하단 안내를 관리합니다. 게시 이력은 자동 보관됩니다.`,
  defaultContent: { visible: true, eyebrow: 'Legal', title, effectiveDate, introduction, articles, footerNote, companyBoxVisible: key === 'terms', companyBoxTitle: '사업자 정보' },
  sections: [
    { id: 'document', label: '문서 기본정보', description: '문서 공개 여부, 제목, 시행일과 상단 안내입니다.', fields: [toggle('visible', '문서 공개'), text('eyebrow', '작은 영문 제목'), text('title', '문서 제목'), text('effectiveDate', '시행일'), textarea('introduction', '상단 안내 문구'), toggle('companyBoxVisible', '사업자 정보 상자 표시'), text('companyBoxTitle', '사업자 정보 상자 제목')] },
    { id: 'articles', label: '문서 조항', description: '조항을 추가·수정·삭제하고 표시 순서를 바꿉니다. 게시 전 법률 검토 여부를 확인하세요.', fields: [items('articles', '조항 목록', legalArticleItemFields), textarea('footerNote', '문서 하단 안내')] },
  ],
});

export const CMS_PAGE_DEFINITIONS: CmsPageDefinition[] = [
  siteShell,
  shopIndex,
  brandsIndex,
  reviewsIndex,
  noticesIndex,
  audit,
  b2b,
  concernsIndex,
  experts,
  careKit,
  insuranceLanding,
  legalPage(
    'terms',
    '이용약관',
    '/terms',
    '2026년 9월 1일',
    '',
    [
      { title: '제1장 총칙', body: '', visible: true },
      { title: '제1조 (목적)', body: '이 약관은 백조 오브제(이하 ‘회사’)가 운영하는 웹사이트 및 이에 부수하는 온라인 서비스(이하 ‘몰’)에서 제공하는 통신판매중개서비스의 이용과 관련하여 회사와 이용자의 권리·의무 및 책임사항을 정함을 목적으로 합니다.', visible: true },
      { title: '제2조 (정의)', body: '① ‘이용자’란 몰에 접속하여 회사가 제공하는 서비스를 이용하는 회원과 비회원을 말합니다.\n② ‘회원’이란 이 약관에 동의하고 회사와 서비스 이용계약을 체결한 자를 말하며, ‘비회원’이란 회원가입 없이 서비스를 이용하는 자를 말합니다.\n③ ‘판매자’ 또는 ‘입점업체’란 회사와 별도 계약을 체결하고 몰에서 자기 명의와 책임으로 상품을 판매하는 독립된 사업자를 말합니다.\n④ ‘구매자’란 몰에서 판매자의 상품을 구매하거나 구매를 신청하는 이용자를 말합니다.\n⑤ ‘상품’이란 판매자가 몰에서 판매하는 재화 또는 용역을 말하며, ‘거래’란 판매자와 구매자 사이에 체결되는 상품의 매매 또는 용역 제공 계약을 말합니다.\n⑥ ‘Audit’이란 회사가 정한 기준에 따라 상품 또는 브랜드 관련 자료를 확인·선별하는 민간 큐레이션 절차를 말하며, ‘케어가이드’란 반려생활에 관한 일반적인 정보 및 추천 콘텐츠를 말합니다.\n⑦ ‘게시물’이란 이용자가 몰에 작성하거나 등록한 후기, 평점, 사진, 영상, 문구 및 그 밖의 정보를 말합니다.', visible: true },
      { title: '제3조 (약관의 게시·해석 및 변경)', body: '① 회사는 이 약관과 회사의 상호, 대표자, 주소, 연락처, 사업자등록번호 및 통신판매업 신고번호 등 관계 법령에서 정한 정보를 이용자가 쉽게 확인할 수 있도록 몰의 초기화면 또는 연결화면에 게시합니다.\n② 회사는 서비스별 안내, 운영정책 또는 개별약정을 둘 수 있습니다. 그 내용이 이 약관과 충돌하는 경우에는 관계 법령, 개별약정, 이 약관, 운영정책의 순서로 적용하되, 소비자에게 불리하게 법정 권리를 제한할 수 없습니다. 판매자와 회사의 관계는 별도의 입점·중개계약 및 판매자 운영정책에 따릅니다.\n③ 회사는 관계 법령을 위반하지 않는 범위에서 이 약관을 변경할 수 있습니다. 변경 내용은 적용일 7일 전부터 공지하고, 이용자에게 불리하거나 중요한 변경은 30일 전부터 공지하며 합리적인 방법으로 개별 통지합니다.\n④ 변경약관은 별도 합의나 법령상 근거가 없는 한 적용일 전에 체결된 거래에 소급하여 적용되지 않습니다. 관계 법령상 별도 동의가 필요한 변경은 이용자의 명시적인 동의를 받습니다.\n⑤ 회사가 회원에게 불리한 변경을 30일 전에 공지·통지하면서 적용일까지 거부의사를 표시하지 않으면 동의한 것으로 본다는 뜻을 명확히 알렸음에도 회원이 거부의사를 표시하지 않은 경우에는 변경약관에 동의한 것으로 봅니다. 다만, 회사가 이를 명확히 알리지 않았거나 관계 법령상 별도의 명시적 동의가 필요한 경우에는 그러하지 않습니다. 변경에 동의하지 않는 회원은 적용일 전까지 이용계약을 해지할 수 있습니다.', visible: true },
      { title: '제4조 (회사의 지위 및 거래주체)', body: '① 회사는 판매자와 구매자 사이의 거래를 중개하는 통신판매중개자이며, 상품의 직접 판매자 또는 개별 거래의 당사자가 아닙니다.\n② 회사가 주문 접수, 결제수단 제공, 대금 수령·정산, 배송조회, 고객상담 또는 분쟁조정 업무를 수행한다는 사정만으로 회사가 판매자가 되거나 판매자를 대리하는 것은 아닙니다.\n③ 회사는 자신이 통신판매의 당사자가 아니라는 사실을 몰의 초기화면과 관계 법령에서 정한 화면에 고지합니다.\n④ 상품 상세페이지와 주문·결제화면에 사업자 신원정보가 표시된 입점업체가 해당 상품의 판매자입니다. ‘백조 오브제 셀렉션’, ‘Audit’ 등 회사의 큐레이션·기획 명칭은 실제 판매자를 표시하거나 대체하는 명칭이 아닙니다.', visible: true },
      { title: '제5조 (서비스의 제공·변경 및 중단)', body: '① 회사는 상품정보의 게시·검색, 주문·결제 지원, 거래정보 전달, 배송조회, 청약철회·교환·반품·환급 지원, 고객상담, 브랜드 큐레이션 및 그 밖의 관련 서비스를 제공합니다.\n② 회사는 운영상·기술상 필요에 따라 서비스의 내용을 변경할 수 있습니다. 이용자의 권리·의무에 중대한 영향을 미치는 변경은 그 내용과 적용일을 사전에 알립니다.\n③ 설비 점검, 기술적 장애, 통신두절, 정부의 명령 또는 불가항력 등 상당한 사유가 있는 경우 서비스의 전부 또는 일부를 일시 중단할 수 있습니다. 예측 가능한 경우 사전에 알리고, 긴급한 경우에는 사후 지체 없이 알립니다.', visible: true },
      { title: '제2장 회원 및 서비스 이용', body: '', visible: true },
      { title: '제6조 (회원가입)', body: '① 이용자는 회사가 정한 절차에 따라 이 약관과 개인정보 처리에 관한 사항에 동의하여 회원가입을 신청합니다. 회사는 허위정보 기재, 타인 정보 도용 또는 서비스 운영을 해칠 우려가 있는 경우 가입을 거절하거나 보류할 수 있습니다.\n② 회사는 원칙적으로 만 14세 미만 아동의 회원가입을 받지 않습니다. 미성년자가 법정대리인의 동의 없이 체결한 계약은 관계 법령에 따라 취소할 수 있습니다.\n③ 입점, 제휴 또는 사업자 간 거래는 회원가입만으로 성립하지 않으며, 회사의 별도 심사와 계약 체결이 필요합니다.', visible: true },
      { title: '제7조 (회원정보의 관리)', body: '① 회원은 가입정보를 정확하게 유지하고 변경사항이 있는 경우 지체 없이 수정하여야 합니다. 회원이 이를 수정하지 않아 발생한 불이익에 대하여 회사는 고의 또는 과실이 없는 한 책임을 부담하지 않습니다.\n② 회원은 자신의 계정과 비밀번호를 안전하게 관리하여야 하며 이를 제3자에게 이용하게 해서는 안 됩니다. 도용 또는 무단사용을 인지한 경우 즉시 회사에 알리고 안내에 따라야 합니다.', visible: true },
      { title: '제8조 (회원탈퇴 및 이용제한)', body: '① 회원은 언제든지 탈퇴를 요청할 수 있으며, 회사는 진행 중인 거래와 법령상 보관의무를 확인한 후 지체 없이 처리합니다.\n② 회원이 허위정보 등록, 타인 정보 도용, 부정결제, 반복적인 거래방해 또는 법령·약관의 중대한 위반행위를 한 경우 회사는 상당한 기간을 정하여 시정을 요구한 후 이용을 제한하거나 회원자격을 상실시킬 수 있습니다.\n③ 긴급한 피해 방지, 법령상 의무 이행 또는 시스템 보호를 위하여 필요한 경우 회사는 우선 이용을 제한한 후 그 사유를 알리고 소명 기회를 부여할 수 있습니다.', visible: true },
      { title: '제9조 (회원에 대한 통지)', body: '① 회사는 회원이 제공한 전자우편, 휴대전화번호 또는 몰 내 알림으로 통지할 수 있습니다.\n② 다수 회원에게 공통되는 사항은 7일 이상 공지사항에 게시함으로써 통지에 갈음할 수 있습니다. 다만, 개별 거래 또는 회원의 권리에 중대한 영향을 미치는 사항은 개별 통지를 병행합니다.', visible: true },
      { title: '제3장 구매 및 거래의 중개', body: '', visible: true },
      { title: '제10조 (구매신청 및 거래조건의 확인)', body: '① 구매자는 상품과 판매자를 선택하고 주문정보·배송지·결제수단을 입력한 후 거래조건을 확인하여 판매자에게 구매를 신청합니다.\n② 회사는 구매자가 결제 전에 판매자의 신원정보, 상품가격과 총 결제금액, 배송비, 공급시기, 청약철회·교환·반품·환급 및 A/S 조건을 확인하고 입력 오류를 정정할 수 있도록 합니다.\n③ 상품 상세페이지와 주문·결제화면에 표시된 판매자가 매매계약의 상대방이며, 구매자는 주문 전에 판매자와 상품별 거래조건을 확인하여야 합니다. 여러 판매자의 상품을 함께 주문하는 경우 각 판매자별로 별개의 거래가 성립할 수 있습니다.', visible: true },
      { title: '제11조 (매매계약의 성립 및 주문변경)', body: '① 매매계약은 구매신청에 대하여 판매자의 승낙 의사가 포함된 주문 확인 통지가 구매자에게 도달한 때 판매자와 구매자 사이에 성립합니다. 회사는 판매자로부터 권한을 부여받은 범위에서 해당 통지를 발송할 수 있습니다.\n② 결제승인 또는 결제완료 통지가 단순히 결제 처리사실만을 알리는 경우에는 그 통지만으로 판매자의 승낙이 이루어진 것으로 보지 않습니다. 다만, 판매자가 미리 정한 승낙 기준에 따라 해당 통지에 승낙의 뜻이 명확히 포함된 경우에는 그러하지 않습니다.\n③ 재고 부족, 명백한 가격 표시 오류, 결제 이상 또는 법령상 판매 제한 등 계약 이행이 곤란한 상당한 사유가 있는 경우 판매자는 구매신청을 승낙하지 않을 수 있습니다.\n④ 구매자는 주문 확인 통지를 받은 후 주문 내용의 불일치를 발견하면 즉시 변경 또는 취소를 요청할 수 있습니다. 이미 상품이 발송된 경우에는 청약철회·반품 절차에 따릅니다.', visible: true },
      { title: '제12조 (결제수단 및 거래대금)', body: '① 구매자는 회사가 제공하는 신용카드, 계좌이체, 간편결제 등으로 상품대금을 지급할 수 있습니다. 배송비와 그 밖의 필수 비용은 결제 전에 총액 또는 산정기준을 표시합니다.\n② 회사 또는 전자결제대행사가 판매자를 대신하여 상품대금을 수령하는 경우 이는 결제·정산 대행에 해당합니다. 판매자가 대금 수령 권한을 부여한 결제수단으로 구매자가 대금을 지급하면 그 범위에서 판매자에 대한 대금지급의무가 이행된 것으로 봅니다.\n③ 회사는 관계 법령 및 결제대행사와의 계약에 따라 적용되는 거래에 대하여 결제대금예치 등 구매안전서비스를 이용할 수 있도록 필요한 조치를 하고, 실제 적용 결제수단과 이용방법을 결제화면에서 안내합니다.\n④ 회사는 구매자의 동의나 법령상 근거 없이 이미 등록된 다른 결제수단으로 대금을 임의 결제하지 않습니다.', visible: true },
      { title: '제13조 (판매자 정보 및 거래책임)', body: '① 회사는 구매자가 청약하기 전까지 판매자의 상호·대표자, 주소, 연락처, 사업자등록번호 및 관계 법령상 해당하는 경우 통신판매업 신고번호 등 법령에서 정한 신원정보를 상품 상세페이지 또는 주문·결제화면에서 쉽게 확인할 수 있도록 제공합니다.\n② 상품의 등록·판매, 가격, 표시·광고, 품질·안전, 재고, 배송, 청약철회, 교환·반품·환급, 하자 및 A/S에 관한 거래상 책임은 해당 상품을 판매한 판매자에게 있습니다.\n③ 판매자가 제공한 상품정보와 거래조건이 이 약관과 다르거나 소비자에게 불리한 경우에는 관계 법령과 이 약관이 우선합니다.', visible: true },
      { title: '제14조 (상품의 공급 및 공급불능)', body: '① 판매자는 상품 상세페이지에 안내한 시기와 방법에 따라 상품을 공급하고, 상품의 포장·출고·배송 및 배송정보의 정확성에 책임을 부담합니다. 회사는 구매자가 공급 절차와 진행상황을 확인할 수 있도록 지원합니다.\n② 품절, 생산중단 등으로 상품을 공급하기 곤란한 경우 판매자는 지체 없이 그 사유를 구매자에게 알리고, 선지급식 거래에서는 구매자가 대금의 전부 또는 일부를 지급한 날부터 3영업일 이내에 환급하거나 환급에 필요한 조치를 하여야 합니다. 회사는 통지, 결제 취소, 환급 및 정산 보류 등 필요한 절차를 지원합니다.', visible: true },
      { title: '제4장 청약철회·교환·반품 및 환급', body: '', visible: true },
      { title: '제15조 (청약철회)', body: '① 소비자인 구매자는 계약내용과 거래조건을 기재한 서면을 받은 날부터 7일 이내에 청약철회할 수 있습니다. 여기서 서면은 전자문서를 포함하고 회사 또는 판매자가 발송한 주문확인 통지를 포함합니다. 그 서면을 받은 때보다 상품의 공급이 늦게 이루어진 경우에는 상품을 공급받거나 공급이 시작된 날부터 7일 이내로 합니다.\n② 상품이 표시·광고와 다르거나 계약내용과 다르게 이행된 경우에는 상품을 공급받은 날부터 3개월 이내, 또는 그 사실을 안 날이나 알 수 있었던 날부터 30일 이내에 청약철회할 수 있습니다.\n③ 구매자는 몰의 주문내역, 고객센터, 전자우편 또는 판매자가 안내한 방법으로 청약철회를 신청할 수 있습니다. 회사가 공식 접수창구로 제공한 채널에 접수된 경우 회사가 접수한 때 판매자에게 도달한 것으로 보며 회사는 이를 지체 없이 전달합니다.', visible: true },
      { title: '제16조 (청약철회의 제한)', body: '① 구매자의 책임으로 상품이 멸실·훼손된 경우, 사용·소비로 가치가 현저히 감소한 경우, 시간이 지나 재판매가 곤란해진 경우, 복제 가능한 상품의 포장을 훼손한 경우 또는 용역·디지털콘텐츠의 제공이 개시된 경우 등 관계 법령이 정한 사유가 있으면 청약철회가 제한될 수 있습니다. 다만, 상품의 내용을 확인하기 위한 포장 훼손 등 법령상 예외는 제외합니다.\n② 주문제작 상품 등 법령상 별도 고지와 동의가 필요한 경우 판매자는 결제 전에 청약철회 제한 사실을 명확히 알리고 구매자의 서면 또는 전자문서 동의를 받아야 합니다. 필요한 조치를 하지 않은 경우 그 사유만으로 청약철회를 제한할 수 없습니다.\n③ 표시·광고와 다르거나 계약내용과 다르게 이행된 경우에는 제1항의 제한에도 불구하고 제15조 제2항에 따라 청약철회할 수 있습니다.', visible: true },
      { title: '제17조 (환급)', body: '① 판매자는 재화를 반환받은 날부터 3영업일 이내에 대금을 환급합니다. 용역·디지털콘텐츠 또는 상품 공급 전 청약철회는 청약철회 의사표시를 받은 날부터 3영업일 이내에 환급하며, 지연 시 관계 법령에서 정한 지연배상금을 지급합니다.\n② 회사가 판매자를 대신하여 상품대금을 수령한 경우에는 환급사유가 확인되는 즉시 결제 취소 또는 대금 반환 절차를 진행합니다.\n③ 판매자, 상품대금을 받은 자 또는 계약을 체결한 자가 동일인이 아닌 경우에는 관계 법령에 따라 환급 관련 의무의 이행에 관하여 연대하여 책임을 부담합니다.', visible: true },
      { title: '제18조 (교환·반품 및 비용부담)', body: '① 구매자는 청약철회 후 상품을 지체 없이 판매자가 지정한 반품지와 방법에 따라 반환합니다. 판매자별 반품지, 배송비, 품질보증 및 A/S 기준은 상품 상세페이지와 배송·교환·환불 안내에서 확인할 수 있습니다.\n② 단순변심에 따른 반환 비용은 구매자가 부담하고, 상품이 표시·광고와 다르거나 계약내용과 다르게 이행되는 등 판매자의 책임 있는 사유가 있는 경우에는 판매자가 부담합니다.\n③ 판매자와 회사는 적법한 청약철회를 이유로 위약금 또는 손해배상을 청구하지 않습니다. 교환은 재고 등 사정에 따라 환급 후 재주문 방식으로 처리될 수 있습니다.', visible: true },
      { title: '제5장 개인정보·큐레이션 및 게시물', body: '', visible: true },
      { title: '제19조 (개인정보보호)', body: '① 회사는 서비스 제공에 필요한 최소한의 개인정보를 적법하게 처리하며 구체적인 사항은 개인정보 처리방침에 따릅니다.\n② 회사는 주문·배송·청약철회·교환·반품·환급·고객상담 및 분쟁처리를 위하여 필요한 범위에서 구매자의 개인정보를 해당 판매자에게 제공할 수 있습니다. 회사는 결제 단계에서 해당 판매자를 특정하고, 제공받는 자, 목적, 항목, 보유기간, 동의 거부권 및 거부에 따른 영향을 알린 후 필요한 동의를 받습니다.', visible: true },
      { title: '제20조 (Audit, 케어가이드 및 추천콘텐츠)', body: '① Audit은 판매자가 제출한 자료와 공개된 정보를 회사의 자체 기준에 따라 확인·선별하는 민간 큐레이션 절차이며, 국가기관·공인인증기관 또는 수의학적 전문기관의 인증·허가·검사·진단을 의미하지 않습니다. 구체적인 기준과 확인 범위는 몰의 Audit 안내 페이지에 게시합니다.\n② Audit은 공개된 기준과 확인 범위 안에서 자료를 검토하였다는 의미이며 상품의 모든 품질·안전·효능이나 판매자의 법령 준수 여부를 전면적으로 보증하지 않습니다. 케어가이드와 맞춤 추천은 일반적인 정보로서 수의사의 진단·처방·치료를 대신하지 않습니다.\n③ 본 조는 판매자의 표시·광고, 품질, 안전 및 소비자보호 책임이나 회사가 자체 Audit·추천 콘텐츠와 관련하여 부담하는 법정 책임을 배제하거나 제한하지 않습니다.', visible: true },
      { title: '제21조 (게시물·사용후기 및 지식재산권)', body: '① 이용자가 작성한 후기·사진 등 게시물의 저작권은 원칙적으로 작성자에게 귀속됩니다. 이용자는 회사가 몰 안에서 서비스 운영·노출·검색·공유를 위하여 필요한 범위에서 게시물을 복제·전송·전시하고 형식에 맞게 편집할 수 있도록 허락합니다. 몰 밖의 공식 SNS·블로그 등 외부 마케팅 채널이나 유료 광고소재로 이용하는 경우에는 추가 동의를 받습니다.\n② 회사는 사용후기를 게시하는 경우 후기 작성 자격과 수집방법, 게시·노출 또는 정렬 기준, 게시기간, 평점 산정기준, 삭제기준 및 이의제기 절차 등 관계 법령에서 정한 사항을 이용자가 쉽게 확인할 수 있는 화면에 공개합니다.\n③ 이용자는 허위 후기, 타인의 권리를 침해하는 자료, 불법·유해정보 또는 대가 제공 사실을 숨긴 추천·보증 게시물을 작성해서는 안 됩니다. 회사는 권리침해 신고, 공개된 후기 운영기준 또는 법령상 요청이 있는 경우 게시물을 제한하거나 삭제할 수 있으며, 이용자가 이의를 제기할 수 있는 방법을 안내합니다.\n④ 회사 또는 정당한 권리자가 작성한 몰의 디자인, 상표 및 콘텐츠에 관한 권리는 해당 권리자에게 귀속되며, 이용자는 사전 허락 없이 서비스 이용 목적을 넘어 이용할 수 없습니다.\n⑤ 회원탈퇴 후에도 게시물은 원칙적으로 유지될 수 있습니다. 회원은 탈퇴 전 직접 삭제하거나 탈퇴 전후에 회사에 삭제를 요청할 수 있으며, 회사는 관계 법령과 제3자의 정당한 권리를 고려하여 처리합니다.\n⑥ 회사가 이용자에게 경제적 대가를 제공하고 게시물 작성을 요청하는 경우에는 그 사실이 게시물에 명확히 표시되도록 안내하고 표시 여부를 합리적으로 점검합니다.', visible: true },
      { title: '제6장 당사자의 의무·분쟁해결 및 기타', body: '', visible: true },
      { title: '제22조 (회사의 의무 및 책임)', body: '① 회사는 자신이 통신판매의 당사자가 아니라는 사실을 관계 법령이 정한 화면에 고지하고, 구매자가 청약하기 전까지 판매자의 신원정보를 확인할 수 있도록 제공합니다.\n② 회사가 판매자를 대신하여 구매신청을 접수하거나 상품대금을 수령하는 경우에는 청약내용의 확인·정정·취소, 결제 안전성 및 환급 등 관계 법령이 정한 조치를 이행합니다. 판매자가 해당 의무를 이행하지 않는 경우 회사는 법령이 정한 범위에서 이를 대신 이행합니다.\n③ 회사는 고객센터를 운영하고 소비자 불만과 분쟁을 신속히 처리하기 위하여 판매자에게 필요한 조치를 요청할 수 있습니다. 위법·위해 상품, 허위·기만적인 상품정보 또는 반복적인 품절·출고지연 등 소비자 피해 우려가 있는 사정을 인지한 경우 노출 제한, 판매중지 등 필요한 조치를 할 수 있습니다.\n④ 회사는 판매자 신원정보의 확인·제공, 통신판매중개서비스의 운영 및 회사가 직접 수행하는 업무와 관련하여 회사의 고의 또는 과실로 이용자에게 발생한 손해에 대하여 관계 법령에 따라 책임을 부담합니다.\n⑤ 회사는 자신의 정보처리시스템을 통하여 처리한 범위에서 관계 법령이 정한 거래기록을 보존하고 이용자가 이를 확인할 수 있도록 필요한 조치를 합니다.', visible: true },
      { title: '제23조 (이용자의 의무)', body: '이용자는 허위정보 등록, 타인 정보·결제수단 도용, 부정결제, 허위 후기, 제3자의 권리 침해, 시스템의 비정상적 접근·방해, 회사의 결제·분쟁조정 절차를 부당하게 우회하는 직거래 유도 또는 관계 법령과 공서양속에 반하는 행위를 해서는 안 됩니다.', visible: true },
      { title: '제24조 (불만처리, 분쟁해결 및 책임)', body: '① 구매자는 판매자 또는 회사의 고객센터를 통하여 상품, 주문, 결제, 배송, 청약철회, 교환·반품·환급 및 서비스 이용에 관한 불만이나 피해구제를 신청할 수 있습니다. 판매자는 상품 거래에 관한 불만을 우선 처리하고 회사는 사실관계 파악과 분쟁 해결을 지원합니다.\n② 회사는 소비자 불만이나 분쟁의 원인을 조사하여 접수일부터 3영업일 이내에 진행 경과를 알리고, 10영업일 이내에 조사 결과 또는 처리방안을 알립니다. 부득이하게 지연되는 경우에는 사유와 예상 일정을 안내합니다.\n③ 분쟁이 해결되지 않는 경우 이용자는 1372소비자상담센터(국번 없이 1372, www.ccn.go.kr), 한국소비자원(www.kca.go.kr) 또는 전자문서·전자거래분쟁조정위원회(1661-5714, www.ecmc.or.kr) 등에 상담 또는 조정을 신청할 수 있습니다.\n④ 이 약관은 회사 또는 판매자의 고의·중과실, 개인정보 침해, 인적 손해나 관계 법령상 배제할 수 없는 책임을 면제하거나 소비자의 법정 권리를 제한하지 않습니다.\n⑤ 판매자와 구매자 사이의 거래에 관한 책임은 판매자가 부담합니다. 회사는 판매자가 제공한 상품정보 또는 판매자의 행위로 발생한 손해에 대하여 회사에 고의 또는 과실이 없는 경우 책임을 부담하지 않습니다. 다만, 제4항 및 회사가 제22조에 따라 직접 부담하는 의무와 책임은 제외합니다.\n⑥ 천재지변, 전국적 통신장애, 정부의 조치 등 합리적으로 통제할 수 없는 사유로 의무를 이행하지 못한 경우에는 고의 또는 과실이 없는 범위에서 책임을 부담하지 않습니다. 다만, 사유 발생을 지체 없이 알리고 손해를 줄이기 위한 합리적인 조치를 하여야 합니다.', visible: true },
      { title: '제25조 (준거법 및 관할)', body: '① 이 약관과 통신판매중개서비스 및 몰을 통하여 이루어지는 거래에는 대한민국 법령이 적용됩니다.\n② 소비자인 이용자와 회사 또는 판매자 사이의 소송은 민사소송법 등 관계 법령에 따른 관할법원에 제기합니다. 이 약관은 소비자의 주소지 관할 등 법령상 인정되는 관할을 배제하지 않습니다.', visible: true },
      { title: '부칙', body: '', visible: true },
      { title: '제1조 (시행일)', body: '이 약관은 2026년 9월 1일부터 시행합니다.', visible: true },
    ],
    '',
  ),
  legalPage(
    'privacy',
    '개인정보 처리방침',
    '/privacy',
    '2026년 9월 1일',
    '백조 오브제(이하 ‘회사’)는 개인정보 보호법 등 관계 법령을 준수하고, 이용자의 개인정보를 안전하게 보호하며 관련 고충을 신속하게 처리하기 위하여 다음과 같이 개인정보처리방침을 수립·공개합니다. 회사는 입점 판매자와 구매자 사이의 거래를 연결하는 통신판매중개자로서, 주문 이행에 필요한 개인정보를 결제 단계에서 특정된 판매자에게 제공합니다. 해당 판매자는 회사와 별개의 개인정보처리자로서 제공받은 개인정보를 자신의 책임으로 처리합니다.',
    [
      { title: '6. 개인정보의 파기절차 및 방법', body: '· 회사는 보유기간이 지나거나 처리 목적이 달성되어 개인정보가 불필요하게 되면 지체 없이 파기합니다.\n· 관계 법령에 따라 보존해야 하는 개인정보는 다른 개인정보와 분리하여 보관하고, 보존기간이 끝나면 파기합니다.\n· 전자적 파일은 복구 또는 재생할 수 없도록 안전하게 삭제하고, 종이 문서는 분쇄하거나 소각하는 방법으로 파기합니다.', visible: true },
      { title: '7. 정보주체와 법정대리인의 권리 및 행사방법', body: '· 이용자는 회사에 자신의 개인정보에 대한 열람, 정정·삭제, 처리정지, 동의 철회 및 회원 탈퇴를 요구할 수 있습니다.\n· 권리행사는 마이페이지, 고객센터, 전자우편 또는 전화를 통해 할 수 있습니다. 회사는 본인 또는 정당한 대리인 여부를 확인한 후 관계 법령에서 정한 기간 내에 조치합니다.\n· 이용자는 법정대리인이나 위임을 받은 사람을 통해 권리를 행사할 수 있으며, 회사는 필요한 경우 위임장 등 증빙을 요청할 수 있습니다.\n· 법령에서 열람·삭제·처리정지 등을 제한하는 경우 회사는 그 사유와 이의제기 방법을 안내합니다.\n· 마케팅 수신동의와 선택정보 제공동의는 언제든지 철회할 수 있으며, 철회 전의 적법한 처리에는 영향을 미치지 않습니다.', visible: true },
      { title: '8. 만 14세 미만 아동의 개인정보', body: '회사는 만 14세 미만 아동의 회원가입을 받지 않으며, 법정대리인의 동의 없이 만 14세 미만 아동의 개인정보를 수집하지 않습니다. 회사가 이를 알게 된 경우 해당 정보를 지체 없이 삭제하는 등 필요한 조치를 합니다.', visible: true },
      { title: '9. 쿠키 등 자동 수집 장치의 설치·운영 및 거부', body: '· 회사는 로그인 상태 유지, 보안, 이용환경 개선 및 서비스 이용 통계를 위하여 쿠키(cookie)를 사용할 수 있습니다.\n· 쿠키는 웹사이트 서버가 이용자의 브라우저에 보내는 소량의 정보로서 이용자의 기기에 저장될 수 있습니다.\n· 이용자는 브라우저 설정에서 쿠키 저장을 허용하거나 차단할 수 있습니다. 쿠키를 차단하면 로그인 유지 등 일부 기능 이용이 제한될 수 있습니다.\n- Chrome : 설정 → 개인정보 및 보안 → 서드 파티 쿠키\n- Edge : 설정 → 쿠키 및 사이트 권한 → 쿠키 및 사이트 데이터 관리\n- Safari : 설정(또는 환경설정) → 개인정보 보호 → 쿠키 및 웹사이트 데이터', visible: true },
      { title: '10. 맞춤형 추천 및 자동화된 처리', body: '· 회사는 이용자가 선택적으로 입력한 반려동물 정보와 서비스 이용기록을 활용하여 상품·콘텐츠를 추천할 수 있습니다.\n· 추천 결과는 생활관리와 상품 탐색을 돕기 위한 참고정보이며, 이용자의 법적 권리 또는 의무에 중대한 영향을 미치는 자동화된 결정을 하지 않습니다.\n· 이용자는 마이페이지 또는 고객센터를 통해 맞춤정보의 수정·삭제나 추천 이용 중단을 요청할 수 있습니다.', visible: true },
    ],
    '',
  ),
  legalPage(
    'refund-policy',
    '배송·교환·환불 안내',
    '/refund-policy',
    '2026년 7월 16일',
    '',
    [
      { title: '1. 배송 안내', body: `- 배송지역: 대한민국 전 지역으로 배송합니다. 단, 도서·산간 지역은 배송 기간이 추가로 소요되거나 추가 배송비가 발생할 수 있습니다.\n- 배송비: ${DEFAULT_COMMERCE_POLICY.shippingLabel}. 상품별 배송비가 다른 경우 각 상품 상세 페이지의 안내를 우선합니다.\n- 출고 일정: ${DEFAULT_COMMERCE_POLICY.deliveryEstimate}\n- 배송조회: 상품 발송 후 마이페이지 또는 고객센터를 통해 운송장 번호와 배송 진행 상황을 확인할 수 있습니다.`, visible: true },
      { title: '2. 교환·반품 안내', body: '- 교환·반품 신청기간: 상품 수령일로부터 7일 이내 고객센터 또는 상품 문의를 통해 신청할 수 있습니다.\n- 단순 변심에 따른 교환·반품 배송비는 고객 부담입니다. 상품 불량 또는 오배송의 경우 배송비는 판매자가 부담합니다.\n- 반품 주소는 교환·반품 접수 시 고객센터에서 개별 안내합니다.\n- 상품을 사용했거나 훼손·오염된 경우, 구성품이 누락된 경우, 맞춤제작·신선식품 등 재판매가 어려운 상품은 교환·반품이 제한될 수 있습니다.', visible: true },
      { title: '3. 환불 안내', body: '- 반품 상품 회수 및 검수 완료 후 결제수단에 따라 환불이 진행됩니다.\n- 신용카드 결제 취소는 카드사 정책에 따라 영업일 기준 3–7일 정도 소요될 수 있습니다.\n- 무통장입금 주문은 환불 계좌 확인 후 영업일 기준 3일 이내 환불 처리합니다.\n- 표시·광고 내용과 다르거나 계약 내용과 다르게 이행된 경우 관련 법령에 따라 교환·반품·환불을 처리합니다.', visible: true },
      { title: '4. 고객센터', body: '고객센터: {{company.tel}}\n이메일: {{company.email}}\n운영시간: {{company.supportHours}}', visible: true },
    ],
    '',
  ),
];

const privacyDefinition = CMS_PAGE_DEFINITIONS.find((definition) => definition.key === 'privacy');
if (privacyDefinition) {
  Object.assign(privacyDefinition.defaultContent, {
    featuredNotice: {
      visible: true,
      title: '※핵심 안내',
      body: '필수정보는 회원관리와 주문 중개에 필요한 최소 범위에서 처리하고, 마케팅 및 반려동물 맞춤정보는 선택적으로 처리합니다. 판매자 제공은 주문별로 별도 동의를 받으며, 회사는 만 14세 미만 아동의 회원가입을 받지 않습니다.',
    },
    purposeTable: {
      visible: true,
      title: '1. 개인정보의 처리 목적 및 항목',
      description: '회사는 다음 목적에 필요한 최소한의 개인정보를 처리합니다. 선택항목을 입력하거나 선택 동의 하지 않아도 해당 선택 기능 외의 기본 서비스는 이용할 수 있습니다.',
      footerNote: '회사는 주민등록번호 등 고유식별정보 또는 이용자 본인의 건강정보 등 민감정보를 원칙적으로 수집하지 않습니다. 이용자가 문의·게시물 등에 불필요한 개인정보나 민감정보를 기재하지 않도록 유의해 주시기 바랍니다.',
      headers: {
        category: '구분',
        purpose: '처리목적',
        items: '처리항목',
      },
      rows: [
        {
          category: '· 회원가입\n· 관리',
          purpose: '회원 식별, 가입 의사 확인, 본인 및 만 14세 이상 확인, 부정이용 방지, 고지·통지',
          requiredItems: '· 필수 : 이름, 이메일 주소, 비밀번호, 휴대전화번호, 만 14세 이상 확인값',
          optionalItems: '',
          note: '',
          visible: true,
        },
        {
          category: '· 주문\n· 통신판매중개',
          purpose: '구매신청, 주문 전달, 배송·취소·교환·반품·환급 지원, 거래 기록 관리',
          requiredItems: '· 필수 : 구매자 이름·연락처·이메일, 수령인 이름·연락처·배송지, 주문상품·수량·금액',
          optionalItems: '· 선택 : 배송요청사항',
          note: '',
          visible: true,
        },
        {
          category: '· 결제\n· 환급 지원',
          purpose: '결제 승인·취소, 대금 정산 지원, 부정결제 방지, 환급 처리',
          requiredItems: '결제수단, 결제 승인·취소정보, 환급이 필요한 경우 예금주·은행명·계좌번호',
          optionalItems: '',
          note: '※카드번호 등 원결제 정보는 회사가 직접 저장하지 않음',
          visible: true,
        },
        {
          category: '· 고객상담\n· 분쟁처리',
          purpose: '문의자 확인, 문의·불만 처리, 사실관계 확인, 결과 통지',
          requiredItems: '· 필수 : 이름, 연락처, 이메일, 주문번호, 문의내용',
          optionalItems: '· 선택 : 첨부파일·이미지',
          note: '',
          visible: true,
        },
        {
          category: '· 후기\n· 게시물',
          purpose: '구매후기 운영, 게시물 관리, 부정게시물 방지',
          requiredItems: '회원 식별정보, 주문내역, 게시물 내용, 첨부 이미지',
          optionalItems: '',
          note: '',
          visible: true,
        },
        {
          category: '· 케어가이드\n· 맞춤추천',
          purpose: '반려동물 생활관리 정보와 상품·콘텐츠 추천',
          requiredItems: '',
          optionalItems: '· 선택 : 반려동물 이름, 종류, 품종, 나이, 체중, 생활·케어 관심사항',
          note: '',
          visible: true,
        },
        {
          category: '· 입점\n· B2B 문의',
          purpose: '입점·제휴 검토, 담당자 연락, 계약 및 업무 협의',
          requiredItems: '· 필수 : 상호, 사업자등록번호, 대표자명, 담당자 이름·연락처·이메일, 문의내용',
          optionalItems: '· 선택 : 제안서·증빙서류',
          note: '',
          visible: true,
        },
        {
          category: '· 마케팅',
          purpose: '이벤트·혜택·신규 서비스 안내',
          requiredItems: '',
          optionalItems: '· 선택 : 이름, 휴대전화번호, 이메일, 수신동의 일시·방법',
          note: '',
          visible: true,
        },
        {
          category: '· 자동생성정보',
          purpose: '접속 유지, 보안, 부정이용 방지, 서비스 이용 통계와 품질 개선',
          requiredItems: 'IP 주소, 쿠키, 접속 일시, 서비스 이용기록, 기기·브라우저 정보',
          optionalItems: '',
          note: '',
          visible: true,
        },
      ],
    },
    collectionMethods: {
      visible: true,
      title: '2. 개인정보의 수집 방법',
      items: [
        { body: '회원가입, 주문·결제, 고객센터, 후기 작성, 케어가이드, 입점·제휴 문의 과정에서 이용자가 직접 입력하는 방법', visible: true },
        { body: '서비스 이용 과정에서 쿠키, 접속기록 등 정보가 자동으로 생성·수집되는 방법', visible: true },
        { body: '전자결제대행사 등 서비스 제공 과정에서 이용자의 동의를 받은 사업자로부터 제공받는 방법', visible: true },
      ],
    },
    retentionTable: {
      visible: true,
      title: '3. 개인정보의 처리 및 보유기간',
      description: '회사는 개인정보의 처리 목적이 달성되거나 보유기간이 끝나면 지체 없이 파기합니다. 다만, 관계 법령에 따른 보존의무가 있거나 이용자에게 별도로 동의받은 경우에는 해당 기간 동안 분리하여 보관합니다.',
      headers: {
        information: '처리정보',
        period: '원칙적 보유기간',
      },
      rows: [
        { information: '회원정보', period: '회원 탈퇴 시까지. 다만 진행 중인 거래·분쟁 또는 법령상 보존의무가 있으면 해당 종료 시까지', visible: true },
        { information: '케어가이드·맞춤추천 정보', period: '이용자가 삭제하거나 동의를 철회한 때 또는 회원 탈퇴 시까지', visible: true },
        { information: '마케팅 수신정보', period: '동의 철회 또는 회원 탈퇴 시까지', visible: true },
        { information: '입점·B2B 문의', period: '문의 처리 완료 후 3년. 계약이 체결된 경우 계약 및 관계 법령상 보존기간까지', visible: true },
      ],
    },
    statutoryRetentionTable: {
      visible: true,
      headers: {
        record: '보존기록',
        period: '보존기간',
        basis: '근거',
      },
      rows: [
        { record: '표시·광고에 관한 기록', period: '6개월', basis: '전자상거래 등에서의 소비자보호에 관한 법률', visible: true },
        { record: '계약 또는 청약철회 등에 관한 기록', period: '5년', basis: '전자상거래 등에서의 소비자보호에 관한 법률', visible: true },
        { record: '대금결제 및 재화 등의 공급에 관한 기록', period: '5년', basis: '전자상거래 등에서의 소비자보호에 관한 법률', visible: true },
        { record: '소비자 불만 또는 분쟁처리에 관한 기록', period: '3년', basis: '전자상거래 등에서의 소비자보호에 관한 법률', visible: true },
        { record: '웹사이트 접속기록', period: '3개월', basis: '통신비밀보호법 등 관계 법령', visible: true },
        { record: '세금계산서 등 거래 증빙', period: '5년', basis: '국세기본법 등 세법', visible: true },
      ],
    },
    thirdPartyProvision: {
      visible: true,
      title: '4. 개인정보의 제3자 제공',
      introduction: '회사는 원칙적으로 이용자의 개인정보를 처리 목적 범위 내에서만 이용하며, 이용자의 동의 없이 제3자에게 제공하지 않습니다. 다만, 법률에 특별한 규정이 있거나 법령상 요건을 충족하는 경우에는 예외로 합니다.\n회사는 통신판매중개 서비스를 위해 결제 단계에서 제공받는 자를 특정하고 별도의 동의를 받은 후, 해당 주문의 판매자에게 다음 정보를 제공합니다.',
      headers: {
        category: '구분',
        content: '내용',
      },
      rows: [
        { category: '제공받는 자', content: '해당 주문의 상품 상세페이지 및 주문·결제 화면에 표시된 판매자', visible: true },
        { category: '제공 목적', content: '주문 확인, 상품 배송, 청약철회·취소·교환·반품·환급, A/S, 고객상담 및 분쟁처리', visible: true },
        { category: '제공 항목', content: '구매자 이름·연락처·이메일, 수령인 이름·연락처·배송지, 주문상품 정보, 배송 요청사항', visible: true },
        { category: '보유·이용기간', content: '거래 목적 달성 시까지. 다만 제공받는 자가 관계 법령에 따라 보존할 의무가 있는 경우 해당 기간까지', visible: true },
      ],
      refusalTitle: '※동의 거부 안내',
      refusalBody: '이용자는 판매자에 대한 개인정보 제공 동의를 거부할 수 있습니다. 다만 주문·배송 이행에 반드시 필요한 정보이므로 동의를 거부하면 해당 상품을 구매할 수 없습니다.',
    },
    outsourcing: {
      visible: true,
      title: '5. 개인정보 처리업무의 위탁',
      introduction: '회사는 원활한 서비스 제공을 위하여 다음과 같이 개인정보 처리업무를 위탁합니다. 회사는 위탁계약에서 처리 목적 외 이용금지, 안전성 확보조치, 재위탁 제한, 관리·감독 및 손해배상 등 관계 법령상 필요한 사항을 정하고 수탁자를 관리·감독합니다.',
      headers: {
        trustee: '수탁자',
        work: '위탁업무',
        period: '보유·이용기간',
      },
      rows: [
        {
          trustee: '토스페이먼츠(주)',
          work: '전자결제, 결제취소·환급 지원, 결제대금예치 및 부정결제 방지',
          period: '위탁계약 종료 또는 처리 목적 달성 시까지. 다만 관계 법령상 보존기간은 해당 기간까지',
          visible: true,
        },
      ],
      footerNote: '수탁자 또는 위탁업무가 추가·변경되는 경우 회사는 지체 없이 이 방침을 통해 공개합니다. 입점 판매자는 회사의 수탁자가 아니라 구매자와 직접 거래하는 별도의 개인정보처리자입니다.',
    },
    securityMeasuresTable: {
      visible: true,
      title: '11. 개인정보의 안전성 확보조치',
      introduction: '회사는 개인정보가 분실·도난·유출·위조·변조 또는 훼손되지 않도록 다음 조치를 시행합니다.',
      headers: {
        category: '구분',
        measure: '주요 조치',
      },
      rows: [
        { category: '관리적 조치', measure: '개인정보 보호책임자 지정, 내부관리계획 수립·시행, 취급자 최소화 및 교육, 수탁자 관리·감독', visible: true },
        { category: '기술적 조치', measure: '접근권한 관리, 비밀번호 등 중요정보 암호화, 접속기록 보관 및 위·변조 방지, 보안프로그램 설치·갱신', visible: true },
        { category: '물리적 조치', measure: '개인정보 보관장소 및 서류에 대한 접근통제', visible: true },
      ],
    },
    privacyContactTable: {
      visible: true,
      title: '12. 개인정보 보호책임자 및 열람청구 접수처',
      introduction: '회사는 개인정보 처리에 관한 업무를 총괄하고 관련 문의, 불만처리, 피해구제 및 열람청구를 처리하기 위하여 아래와 같이 개인정보 보호책임자와 접수처를 지정합니다.',
      headers: {
        category: '구분',
        content: '내용',
      },
      rows: [
        { category: '개인정보 보호책임자', content: '백보윤 / 대표', visible: true },
        { category: '담당·접수부서', content: '백조 오브제 고객센터', visible: true },
        { category: '전화', content: '010-5683-1725', visible: true },
        { category: '전자우편', content: 'thebaekjo@naver.com', visible: true },
      ],
      footerNote: '이용자는 서비스 이용 중 발생한 모든 개인정보 보호 관련 문의와 권리행사를 위 연락처로 요청할 수 있으며, 회사는 지체 없이 답변하고 처리하겠습니다.',
    },
    rightsReliefTable: {
      visible: true,
      title: '13. 권익침해 구제방법',
      introduction: '이용자는 회사의 자체 처리 결과에 만족하지 않거나 별도의 상담·분쟁조정이 필요한 경우 다음 기관에 문의할 수 있습니다.',
      headers: {
        agency: '기관',
        phone: '전화',
        homepage: '홈페이지',
      },
      rows: [
        { agency: '개인정보침해 신고센터', phone: '국번 없이 118', homepage: 'privacy.kisa.or.kr', visible: true },
        { agency: '개인정보분쟁조정위원회', phone: '1833-6972', homepage: 'www.kopico.go.kr', visible: true },
        { agency: '대검찰청 1301 검찰콜센터', phone: '국번 없이 1301', homepage: 'www.spo.go.kr', visible: true },
        { agency: '경찰청 사이버범죄 신고시스템', phone: '국번 없이 182', homepage: 'ecrm.police.go.kr', visible: true },
      ],
    },
    policyChanges: {
      visible: true,
      title: '14. 개인정보처리방침의 변경',
      items: [
        { body: '이 방침은 2026년 9월 1일부터 시행합니다.', visible: true },
        { body: '방침이 변경되는 경우 회사는 시행일 7일 전부터 홈페이지 공지사항 등을 통해 알립니다. 이용자의 권리에 중대한 영향을 미치는 변경은 시행일 30일 전부터 알립니다.', visible: true },
        { body: '회사는 이전 방침을 이용자가 확인할 수 있도록 개정 이력을 공개합니다.', visible: true },
      ],
      effectiveDateLabel: '시행일',
      effectiveDate: '2026년 9월 1일',
    },
  });
  privacyDefinition.sections.splice(
    1,
    0,
    {
      id: 'featured-notice',
      label: '핵심 안내 상자',
      description: '개인정보 처리방침 첫 설명 아래의 테두리 안내 상자입니다.',
      fields: [
        toggle('featuredNotice.visible', '핵심 안내 표시'),
        text('featuredNotice.title', '안내 제목'),
        textarea('featuredNotice.body', '안내 내용'),
      ],
    },
    {
      id: 'purpose-table',
      label: '개인정보 처리 목적 및 항목 표',
      description: '고객 화면의 3열 표입니다. 행을 추가·수정·삭제하고 순서를 바꿀 수 있습니다.',
      fields: [
        toggle('purposeTable.visible', '표 표시'),
        text('purposeTable.title', '표 위 제목'),
        textarea('purposeTable.description', '표 위 설명'),
        text('purposeTable.headers.category', '첫 번째 열 제목'),
        text('purposeTable.headers.purpose', '두 번째 열 제목'),
        text('purposeTable.headers.items', '세 번째 열 제목'),
        items('purposeTable.rows', '처리 목적 및 항목', privacyPurposeRowItemFields, '각 행이 고객 화면의 표 한 줄과 모바일 카드 하나로 표시됩니다.'),
        textarea('purposeTable.footerNote', '표 아래 민감정보 안내'),
      ],
    },
    {
      id: 'collection-methods',
      label: '2. 개인정보 수집 방법',
      description: '개인정보를 어떤 경로로 받는지 목록으로 표시합니다.',
      fields: [
        toggle('collectionMethods.visible', '수집 방법 표시'),
        text('collectionMethods.title', '제목'),
        items('collectionMethods.items', '수집 방법 목록', privacyCollectionMethodItemFields, '항목을 추가·수정·삭제하고 순서를 바꿀 수 있습니다.'),
      ],
    },
    {
      id: 'retention-table',
      label: '3. 개인정보 처리 및 보유기간',
      description: '처리정보별 보유기간을 데스크톱 표와 모바일 카드로 표시합니다.',
      fields: [
        toggle('retentionTable.visible', '보유기간 표 표시'),
        text('retentionTable.title', '표 위 제목'),
        textarea('retentionTable.description', '표 위 설명'),
        text('retentionTable.headers.information', '첫 번째 열 제목'),
        text('retentionTable.headers.period', '두 번째 열 제목'),
        items('retentionTable.rows', '처리정보별 보유기간', privacyRetentionRowItemFields, '각 행이 고객 화면의 표 한 줄과 모바일 카드 하나로 표시됩니다.'),
      ],
    },
    {
      id: 'statutory-retention-table',
      label: '법정 보존기록 표',
      description: '3번 보유기간 표 바로 아래에 법령상 보존기록·기간·근거를 표시합니다.',
      fields: [
        toggle('statutoryRetentionTable.visible', '법정 보존기록 표 표시'),
        text('statutoryRetentionTable.headers.record', '첫 번째 열 제목'),
        text('statutoryRetentionTable.headers.period', '두 번째 열 제목'),
        text('statutoryRetentionTable.headers.basis', '세 번째 열 제목'),
        items('statutoryRetentionTable.rows', '법정 보존기록', privacyStatutoryRetentionRowItemFields, '행을 추가·수정·삭제하고 순서를 바꿀 수 있습니다.'),
      ],
    },
    {
      id: 'third-party-provision',
      label: '4. 개인정보의 제3자 제공',
      description: '판매자에게 제공되는 개인정보와 동의 거부 안내를 관리합니다.',
      fields: [
        toggle('thirdPartyProvision.visible', '제3자 제공 영역 표시'),
        text('thirdPartyProvision.title', '제목'),
        textarea('thirdPartyProvision.introduction', '제3자 제공 설명'),
        text('thirdPartyProvision.headers.category', '첫 번째 열 제목'),
        text('thirdPartyProvision.headers.content', '두 번째 열 제목'),
        items('thirdPartyProvision.rows', '제3자 제공 내역', privacyThirdPartyRowItemFields, '행을 추가·수정·삭제하고 순서를 바꿀 수 있습니다.'),
        text('thirdPartyProvision.refusalTitle', '동의 거부 안내 제목'),
        textarea('thirdPartyProvision.refusalBody', '동의 거부 안내 내용'),
      ],
    },
    {
      id: 'outsourcing',
      label: '5. 개인정보 처리업무의 위탁',
      description: '수탁자별 위탁업무와 보유기간을 관리합니다. 각 행은 PC 표 한 줄과 모바일 카드 하나로 연결됩니다.',
      fields: [
        toggle('outsourcing.visible', '위탁 영역 표시'),
        text('outsourcing.title', '제목'),
        textarea('outsourcing.introduction', '위탁 설명'),
        text('outsourcing.headers.trustee', '첫 번째 열 제목'),
        text('outsourcing.headers.work', '두 번째 열 제목'),
        text('outsourcing.headers.period', '세 번째 열 제목'),
        items('outsourcing.rows', '수탁자 및 위탁업무', privacyOutsourcingRowItemFields, '수탁자를 추가·수정·삭제하고 표시 순서를 바꿀 수 있습니다.'),
        textarea('outsourcing.footerNote', '표 아래 안내'),
      ],
    },
  );
  privacyDefinition.sections.push(
    {
      id: 'security-measures-table',
      label: '11. 개인정보의 안전성 확보조치',
      description: '안전성 확보조치를 PC 표와 모바일 카드로 관리합니다.',
      fields: [
        toggle('securityMeasuresTable.visible', '안전조치 영역 표시'),
        text('securityMeasuresTable.title', '제목'),
        textarea('securityMeasuresTable.introduction', '표 위 설명'),
        text('securityMeasuresTable.headers.category', '첫 번째 열 제목'),
        text('securityMeasuresTable.headers.measure', '두 번째 열 제목'),
        items('securityMeasuresTable.rows', '안전성 확보조치', privacySecurityMeasureRowItemFields, '조치를 추가·수정·삭제하고 표시 순서를 바꿀 수 있습니다.'),
      ],
    },
    {
      id: 'privacy-contact-table',
      label: '12. 개인정보 보호책임자 및 열람청구 접수처',
      description: '개인정보 보호책임자와 접수처를 PC 표와 모바일 카드로 관리합니다.',
      fields: [
        toggle('privacyContactTable.visible', '책임자·접수처 영역 표시'),
        text('privacyContactTable.title', '제목'),
        textarea('privacyContactTable.introduction', '표 위 설명'),
        text('privacyContactTable.headers.category', '첫 번째 열 제목'),
        text('privacyContactTable.headers.content', '두 번째 열 제목'),
        items('privacyContactTable.rows', '책임자 및 접수처', privacyContactRowItemFields, '담당자나 접수처를 추가·수정·삭제하고 표시 순서를 바꿀 수 있습니다.'),
        textarea('privacyContactTable.footerNote', '표 아래 문의 안내'),
      ],
    },
    {
      id: 'rights-relief-table',
      label: '13. 권익침해 구제방법',
      description: '상담·분쟁조정 기관의 전화와 홈페이지를 PC 표와 모바일 카드로 관리합니다.',
      fields: [
        toggle('rightsReliefTable.visible', '구제기관 영역 표시'),
        text('rightsReliefTable.title', '제목'),
        textarea('rightsReliefTable.introduction', '표 위 설명'),
        text('rightsReliefTable.headers.agency', '첫 번째 열 제목'),
        text('rightsReliefTable.headers.phone', '두 번째 열 제목'),
        text('rightsReliefTable.headers.homepage', '세 번째 열 제목'),
        items('rightsReliefTable.rows', '권익침해 구제기관', privacyReliefAgencyRowItemFields, '기관을 추가·수정·삭제하고 표시 순서를 바꿀 수 있습니다.'),
      ],
    },
    {
      id: 'policy-changes',
      label: '14. 개인정보처리방침의 변경',
      description: '방침의 시행일과 변경 공지 기준을 관리합니다.',
      fields: [
        toggle('policyChanges.visible', '방침 변경 안내 표시'),
        text('policyChanges.title', '제목'),
        items('policyChanges.items', '변경 안내 목록', privacyPolicyChangeItemFields, '안내를 추가·수정·삭제하고 표시 순서를 바꿀 수 있습니다.'),
        text('policyChanges.effectiveDateLabel', '시행일 이름'),
        text('policyChanges.effectiveDate', '시행일'),
      ],
    },
  );
}

export const CMS_PAGE_DEFINITION_MAP = new Map(
  CMS_PAGE_DEFINITIONS.map((definition) => [definition.key, definition]),
);

export function getCmsPageDefinition(pageKey: string): CmsPageDefinition | null {
  return CMS_PAGE_DEFINITION_MAP.get(pageKey) ?? null;
}
