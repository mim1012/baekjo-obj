import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { defaultHomeSettings, normalizeHomeSettings } from '@/data/homeContent';
import { shopCategoryFilters } from '@/data/shopFilters';
import {
  applySourceConcernCardCopy,
  applySourceConcernFaqCopy,
  defaultConcernsConfig,
  STRESS_CONCERN_FAQ,
  TEAR_CONCERN_FAQ,
} from '@/lib/concerns/config';
import { formatBrandDisplayName, getBrandPresentation } from '@/lib/brands/presentation';
import { getSourceAuditReport, getSourceBrandContent } from '@/lib/brands/sourceContent';
import { defaultKitsConfig } from '@/lib/kits/config';

const ROOT = path.resolve(__dirname, '..', '..');
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

test.describe('2026-08-27 고객 요구사항 표시 계약', () => {
  test('헤더와 푸터 메뉴가 정본 순서와 구성으로 유지된다', () => {
    const header = read('src/components/common/Header.tsx');
    const footer = read('src/components/common/Footer.tsx');
    const cmsDefaults = read('src/lib/cms/pageDefinitions.ts');
    for (const label of ['셀렉션', '브랜드', '케어', '펫보험', '백조오브제', 'B2B']) {
      expect(`${header}\n${cmsDefaults}`, `${label} 메뉴`).toContain(label);
    }
    for (const submenu of ['백조오브제 Audit의 검토 기준', '전문가 칼럼', '보호자 후기', '소식']) {
      expect(cmsDefaults).toContain(submenu);
    }
    for (const removedDescription of [
      '브랜드를 살펴보는 네 가지 확인 기준',
      '전문가가 전하는 반려생활 기준',
      '먼저 경험한 보호자들의 기록',
      '새로운 서비스와 안내',
    ]) {
      expect(header).not.toContain(removedDescription);
    }
    expect(header).not.toContain('백조 Audit');
    expect(cmsDefaults).toContain('@BAEKJO OBJET');
    expect(cmsDefaults).toContain("label: '배송·교환·환불'");
    expect(footer).not.toContain('PET LIFE CURATION');
  });

  test('홈 핵심 카피와 추천 상품 상한이 정본과 일치한다', () => {
    const home = read('src/components/home/HomeClient.tsx');
    const homeContent = read('src/data/homeContent.ts');
    const homeAdmin = read('src/app/admin/settings/page.tsx');
    expect(defaultHomeSettings.hero.eyebrow).toBe('Curated Pet Brands');
    expect(defaultHomeSettings.hero.titleLines.join(' ')).toBe('좋은 브랜드를 찾고 계셨나요?');
    expect(defaultHomeSettings.hero.descriptionLines).toEqual([
      '좋은 브랜드는 결과입니다. 백조오브제는 과정까지 확인합니다.',
    ]);
    expect(defaultHomeSettings.hero.trustNote).toBe('백조오브제 Audit을 통과한 브랜드만 소개합니다.');
    expect(defaultHomeSettings.insuranceBanner.description).toBe(
      '같은 품종이라도, 나이와 기왕력에 따라 우리 아이에게 맞는 보험은 달라집니다.',
    );
    expect(defaultHomeSettings.insuranceBanner.buttonLabel).toBe('보험 분석 시작하기');
    expect(home).toContain(".slice(0, 3)");
    expect(home).toContain('보호자 후기');
    expect(home).toContain('소식');
    for (const removedBadgeCopy of ['Audit Passed', '검증 기준 통과', 'badgeTitle', 'badgeSubtitle']) {
      expect(`${home}\n${homeContent}\n${homeAdmin}`).not.toContain(removedBadgeCopy);
    }
  });

  test('Audit·보호자 후기·소식 화면이 최신 콘텐츠 정본과 일치한다', () => {
    const audit = read('src/app/audit/page.tsx');
    const cmsDefaults = read('src/lib/cms/pageDefinitions.ts');
    const reviews = read('src/app/reviews/page.tsx');
    const notices = read('src/app/notices/page.tsx');
    const reviewsAdmin = read('src/app/admin/reviews/page.tsx');

    for (const copy of [
      '확인하는 기준이 있습니다.',
      '브랜드 둘러보기',
      '모든 브랜드를 소개하지 않습니다. 확인하고 선택한 브랜드만 소개합니다.',
      '브랜드를 바라보는 기준',
      'Audit은 완료된 뒤에도 이어집니다',
      '추가 확인 중',
      '화면에서는 이렇게 표시됩니다.',
      '확인한 기준은 선택으로 이어집니다.',
    ]) {
      expect(`${audit}\n${cmsDefaults}`).toContain(copy);
    }
    expect(audit).not.toContain('100 to 5');
    expect(audit).not.toContain('검증 브랜드 보기');
    expect(audit).not.toContain('검토 기준 살펴보기');

    for (const copy of ['REAL EXPERIENCES', '보호자 후기']) {
      expect(`${reviews}\n${cmsDefaults}`).toContain(copy);
    }
    expect(cmsDefaults).toContain("{ value: 'small', label: '소동물', visible: true }");
    expect(cmsDefaults).toContain("{ value: 'other', label: '기타', visible: true }");
    expect(reviews).toContain('return review.petType === filter;');
    expect(reviews).not.toContain('반려가족의 리얼 후기');
    expect(reviews).not.toContain('reviewConcernTagsByProductId');
    expect(reviewsAdmin).toContain("label: '반려동물 종류'");
    expect(reviewsAdmin).toContain('required: true');
    expect(reviewsAdmin).toContain("{ value: '', label: '종류를 선택해 주세요' }");

    expect(`${notices}\n${cmsDefaults}`).toContain('NEWS & NOTICE');
    expect(`${notices}\n${cmsDefaults}`).toContain('백조오브제의 새로운 소식과 안내');
    for (const hiddenColumn of ['<div>글쓴이</div>', '<div>조회수</div>', '<div>좋아요</div>']) {
      expect(notices).not.toContain(hiddenColumn);
    }
  });

  test('케어키트 프로젝트와 협업 문의 문구가 최신 시안과 일치한다', () => {
    const careKit = read('src/app/landing/care-kit/page.tsx');
    const cmsDefaults = read('src/lib/cms/pageDefinitions.ts');
    const inquiryForm = read('src/components/care-kit/PartnerInquiryForm.tsx');
    const migration = read('supabase/migrations/0110_care_kit_project_content.sql');

    for (const copy of [
      '필요한 순간에 맞는',
      '파트너십 문의하기',
      'MOMENTS OF CARE',
      '파트너와 함께 만드는 케어',
      'CARE KIT PARTNER',
      '첫 케어키트 프로젝트는 페네핏과 함께 기획하고 제작합니다.',
      '현재 상세 구성 및 디자인 이미지는 공개하지 않습니다.',
      '협업·제휴 문의',
    ]) {
      expect(`${careKit}\n${cmsDefaults}`).toContain(copy);
    }
    expect(cmsDefaults).toContain("partnerLogo: '/brands/penefit-official.png'");
    expect(cmsDefaults).toContain("partnerLogoAlt: '페네핏 로고'");
    expect(`${careKit}\n${cmsDefaults}`).not.toContain('/brands/penefit-wordmark-green.png');
    expect(read('src/lib/kits/config.ts')).toContain("legacyDefaultKitNames");
    expect(careKit).toContain('resolvePublicKitsConfig(saved)');
    expect(inquiryForm).toContain('협업·제휴 문의하기');
    expect(defaultKitsConfig.items.map((kit) => kit.name)).toEqual([
      '웰컴 케어',
      '위로 케어',
      '기억 케어',
      '맞춤 케어',
    ]);
    expect(migration).toContain("'웰컴 케어'");
    expect(migration).toContain("'맞춤 케어'");
  });

  test('빠른 쇼핑은 6개 카테고리로 통일하고 기존 9개 설정을 호환한다', () => {
    const expected = ['강아지', '고양이', '소동물', '사료·간식', '위생·배변', '건강관리'];
    expect(defaultHomeSettings.quickShop.links.map((link) => link.name)).toEqual(expected);
    const normalized = normalizeHomeSettings({
      quickShop: {
        links: [
          '전체 상품', '강아지', '고양이', '소동물', '사료·간식',
          '위생·배변', '건강관리', '고민별 케어', '브랜드관',
        ].map((name) => ({ name })),
      },
    });
    expect(normalized.quickShop.links.map((link) => link.name)).toEqual(expected);
  });

  test('셀렉션 필터, 배지, 빈 상태가 0827 계약과 일치한다', () => {
    const shop = read('src/components/shop/ShopContent.tsx');
    const cmsDefaults = read('src/lib/cms/pageDefinitions.ts');
    const productTags = read('src/lib/productTags/config.ts');
    const shopContract = `${shop}\n${cmsDefaults}\n${productTags}`;
    expect(shopCategoryFilters.map((category) => category.label)).toEqual([
      '푸드', '영양', '케어', '패션', '펫로스', '라이프',
    ]);
    for (const label of ['전체', '2만원 미만', '2-5만원', '5-10만원', '10만원 이상']) {
      expect(shopContract).toContain(label);
    }
    for (const label of ['피부', '관절', '체중', '구강', '냄새']) {
      expect(productTags).toContain(`label: '${label}'`);
    }
    expect(shopContract).toContain('소동물');
    expect(shop).not.toContain('title="연령"');
    expect(shopContract).toContain('DAILY PICK');
    expect(shop).not.toContain('지금 백조오브제가 가장 주목하는 제품');
    expect(shop).not.toContain('조건을 조금 넓혀 다시 살펴볼까요?');
    expect(shopContract).toContain('필터 초기화');
    expect(shop).not.toContain('선택한 조건 모두 지우기');
    // ProductCard.tsx(SELECTED/잠시 품절/reviewCount 배지) 관련 단언은 옵션재고 묶음 B에서
    // 함께 바뀌는 파일이라 A묶음에서는 제외했다 — bundle B에서 ProductCard와 함께 복원한다.
  });

  test('눈물 케어 문구와 신호 목록이 정본과 일치한다', () => {
    const overview = read('src/app/concerns/page.tsx');
    const detail = read('src/app/concerns/[slug]/page.tsx');
    const concernDefaults = read('src/lib/concerns/config.ts');
    const cmsDefaults = read('src/lib/cms/pageDefinitions.ts');
    const tear = defaultConcernsConfig.items.find((concern) => concern.slug === 'tear');
    expect(`${overview}\n${cmsDefaults}`).toContain('/images/care-guide-hero-pet-family.png');
    expect(overview).toContain('h-[640px]');
    expect(overview).toContain('md:h-[480px]');
    for (const slug of ['tear', 'joint', 'skin', 'obesity', 'stress', 'oral']) {
      expect(concernDefaults).toContain(`/images/care-detail-hero-${slug}.png`);
    }
    expect(detail).toContain('data-testid="concern-detail-hero"');
    expect(detail).toContain('data-testid="concern-detail-hero-image"');
    expect(detail).not.toContain('/images/care-hero-tear.webp');
    expect(tear?.symptoms).toEqual([
      '눈 밑의 갈색·적갈색 자국이 짙어짐', '평소보다 눈물 양이 많아짐',
      '눈 주위 털이 계속 축축하게 젖어 있음', '노란 눈곱이 생기거나 눈곱 양이 많아짐',
      '눈을 평소보다 자주 비비거나 긁음', '한쪽 눈의 눈물만 유독 많아짐',
    ]);
    expect(concernDefaults).toContain('눈물 자국, 닦아주는 것만으로 충분할까요?');
    expect(concernDefaults).toContain('매일 닦아도 반복된다면, 관리 방법부터 다시 살펴볼 필요가 있어요.');
    for (const sign of [
      '눈이 심하게 붉어지거나 부어오름', '노란색·녹색 눈곱이 계속 생김', '눈을 잘 뜨지 못하거나 계속 찡그림',
      '눈을 반복해서 심하게 비비거나 긁음', '눈이 평소보다 뿌옇게 보임', '눈 또는 눈꺼풀에 상처가 보임',
    ]) {
      expect(concernDefaults).toContain(sign);
    }

    expect(tear?.faq).toEqual(TEAR_CONCERN_FAQ);
    const staleTearFaqConfig = {
      ...defaultConcernsConfig,
      items: defaultConcernsConfig.items.map((item) => (
        item.slug === 'tear'
          ? { ...item, faq: [{ question: '눈물 자국은 왜 갈색으로 변하나요?', answer: '이전 내용' }] }
          : item
      )),
    };
    expect(
      applySourceConcernFaqCopy(staleTearFaqConfig).items.find((item) => item.slug === 'tear')?.faq,
    ).toEqual(TEAR_CONCERN_FAQ);
    const tearFaqMigration = read('supabase/migrations/0143_tear_faq_source_copy.sql');
    for (const faq of TEAR_CONCERN_FAQ) {
      expect(tearFaqMigration).toContain(faq.question);
      expect(tearFaqMigration).toContain(faq.answer);
    }
  });

  test('피부 케어 문구와 추천·FAQ 구성이 정본과 일치한다', () => {
    const overview = read('src/app/concerns/page.tsx');
    const detail = read('src/app/concerns/[slug]/page.tsx');
    const concernDefaults = read('src/lib/concerns/config.ts');
    const cmsDefaults = read('src/lib/cms/pageDefinitions.ts');
    const skin = defaultConcernsConfig.items.find((concern) => concern.slug === 'skin');
    const stress = defaultConcernsConfig.items.find((concern) => concern.slug === 'stress');

    expect(cmsDefaults).toContain('우리 아이가 보내는 작은 신호부터 살펴보세요.');
    expect(cmsDefaults).toContain('일상에서 알아두면 좋은 케어 기준을 정리했습니다.');
    expect(overview).toContain('whitespace-pre-line');
    expect(overview).not.toContain('<br className="hidden sm:block" />');
    expect(overview).not.toContain('/* 4. 핵심 정보 요약 바 */');
    expect(stress?.shortDescription).toBe('평소보다 불안하거나 예민해졌나요?');

    const staleConfig = {
      ...defaultConcernsConfig,
      items: defaultConcernsConfig.items.map((item) => ({ ...item, shortDescription: `${item.slug} 이전 문구` })),
    };
    const normalized = applySourceConcernCardCopy(staleConfig);
    const expectedCardCopy = {
      tear: '눈물 자국이 걱정되시나요?',
      joint: '걸음걸이가 불편해 보이나요?',
      skin: '자꾸 긁거나 피부가 붉어지나요?',
      obesity: '체중 관리가 필요한가요?',
      stress: '평소보다 불안하거나 예민해졌나요?',
      oral: '입 냄새나 치석이 신경 쓰이나요?',
    } as const;
    for (const [slug, shortDescription] of Object.entries(expectedCardCopy)) {
      expect(normalized.items.find((item) => item.slug === slug)?.shortDescription).toBe(shortDescription);
    }
    expect(normalized.items.find((item) => item.slug === 'picky')?.shortDescription).toBe('picky 이전 문구');

    expect(concernDefaults).toContain("title: '자꾸 긁는 우리 아이,\\n피부부터 살펴보세요'");
    expect(concernDefaults).toContain('우리 아이가 보내는 작은 신호부터 살펴보세요. 일상에서 알아두면 좋은 케어 기준을 정리했습니다.');
    expect(detail).not.toContain('최근 달라진 식사나 생활 환경은 없는지 살펴보세요.');
    expect(skin?.symptoms).toEqual([
      '몸을 자주 긁거나 핥음',
      '피부가 붉어지거나 평소와 다른 변화가 생김',
      '비듬이나 각질이 많아짐',
      '털이 평소보다 많이 빠지거나 부분적으로 빠짐',
      '특정 부위에서 평소와 다른 냄새가 남',
    ]);
    expect(skin?.recommendedProductIds).toEqual(['p4', 'p5', 'p21', 'p12', 'p17', 'p18']);
    expect(skin?.recommendedBrandIds).toEqual(['b5', 'b2', 'b9', 'b8']);
    expect(skin?.faq).toHaveLength(4);
    expect(skin?.faq[0].question).toBe('목욕은 얼마나 자주 하는 게 좋을까요?');
    for (const faq of [
      '이 정보는 어떻게 활용하면 되나요?',
      '평소 우리 아이의 모습과 비교해 몸이나 행동에 달라진 점이 있는지 살펴보는 데 참고해 주세요. 작은 변화도 평소와 비교해 알아차리는 것이 중요합니다.',
      '여러 고민이 함께 보이면 어떻게 살펴봐야 하나요?',
      '하나의 변화가 여러 원인과 관련될 수 있고, 여러 변화가 함께 나타나기도 합니다. 한 가지 증상만 따로 보기보다 우리 아이에게 함께 나타나는 변화를 살펴보세요.',
      '언제 진료가 필요한가요?',
      '각 상세의 병원 진료를 고려해야 할 신호를 참고해 주세요. 해당하지 않더라도 평소와 다른 변화가 걱정되거나 판단하기 어렵다면 수의사에게 확인해보는 것이 좋습니다.',
      '이 정보만으로 건강 상태를 판단해도 되나요?',
      '이 내용은 보호자가 일상에서 변화를 알아차리는 데 도움을 주기 위한 참고 정보입니다. 같은 변화도 원인이 다를 수 있으므로 특정 질환을 판단하거나 진단하는 기준으로 사용하지 않습니다.',
    ]) {
      expect(cmsDefaults).toContain(faq);
    }
    for (const text of [
      "title: '원인 살펴보기'",
      "description: '식사·환경·피부 상태 등 피부 변화에 영향을 줄 수 있는 원인'",
      "title: '집에서 관리하기'",
      "description: '피부 청결과 식사·환경 등 일상에서 챙겨야 할 관리 방법'",
      "description: '피부 상태와 행동으로 구분하는 진료가 필요한 신호'",
      '긁거나 핥는 행동이 계속되거나 심해짐',
      '피부 변화와 함께 식욕이나 활동량이 평소와 달라짐',
      '우리 아이에게 필요한 보장은 무엇일까요?',
      '후기 전체 보기',
      'concern.productsLinkLabel',
    ]) {
      expect(`${detail}\n${concernDefaults}`).toContain(text);
    }
    expect(detail).not.toContain('MessageCircleQuestion');
    expect(detail).not.toContain('더 궁금한 점이 있으신가요?');
    expect(detail).not.toContain('함께 읽을 이야기가 아직 없어요');
    expect(detail).toContain('concern.recommendedProductIds.flatMap');
    expect(detail).not.toContain('concern.recommendedBrandIds.flatMap');
    expect(detail).not.toContain('이 고민과 함께 살펴볼 브랜드');
  });

  test('체중·구강·관절·행동 상세 문구와 추천 노출 규칙이 최신 시안과 일치한다', () => {
    const overview = read('src/app/concerns/page.tsx');
    const detail = read('src/app/concerns/[slug]/page.tsx');
    const concernDefaults = read('src/lib/concerns/config.ts');
    const cmsDefaults = read('src/lib/cms/pageDefinitions.ts');
    const bySlug = (slug: string) => defaultConcernsConfig.items.find((concern) => concern.slug === slug);
    const obesity = bySlug('obesity');
    const oral = bySlug('oral');
    const joint = bySlug('joint');
    const stress = bySlug('stress');

    expect(overview).not.toContain('CARE EDIT');
    expect(overview).not.toContain('함께 알아두면 좋은 정보');
    expect(overview).not.toContain("title: '변화 살펴보기'");
    expect(overview).not.toContain("title: '병원 방문 판단하기'");
    expect(overview).not.toContain('더 궁금한 점이 있으신가요?');
    expect(overview).not.toContain('1:1 문의하기');
    expect(overview).not.toContain('사랑하는 아이를 위한 든든한 준비');
    expect(cmsDefaults).toContain('우리 아이에게 필요한 보장은 무엇일까요?');
    expect(cmsDefaults).toContain('나이와 건강 상태를 바탕으로 우리 아이에게 맞는 보험을 살펴보세요.');
    expect(cmsDefaults).toContain('보험 분석하기');
    expect(overview).toContain("content.insurance.buttonHref || '/insurance'");
    expect(overview).not.toContain('href="/insurance/recommend"');

    expect(concernDefaults).toContain("title: '우리 아이의 체중,\\n괜찮은 걸까요?'");
    expect(concernDefaults).toContain("title: '구강, 어디서부터 살펴볼까요?'");
    expect(concernDefaults).toContain("title: '걸음걸이가 예전과 달라졌나요?'");
    expect(concernDefaults).toContain("title: '평소와 다른 행동이 자주 보이나요?'");
    for (const copy of [
      '식사량·활동량·생활 습관 등 체중 증가에 영향을 줄 수 있는 원인',
      '식사와 활동량 등 일상에서 챙겨야 할 체중 관리 방법',
      '체중 변화와 몸 상태로 구분하는 진료가 필요한 신호',
      '치아·잇몸 상태와 구강 위생 등 구강 문제에 영향을 줄 수 있는 원인',
      '양치와 구강 청결 등 일상에서 챙겨야 할 관리 방법',
      '입 냄새·잇몸 상태·먹는 행동 등으로 구분하는 진료가 필요한 신호',
      '체중·활동량·생활 환경 등 관절에 부담을 줄 수 있는 요인',
      '체중 관리와 적절한 활동 등 일상에서 챙겨야 할 관리 방법',
      '걸음걸이와 움직임의 변화로 구분하는 진료가 필요한 신호',
    ]) {
      expect(concernDefaults).toContain(copy);
    }
    expect(detail).toContain('const quickGuideItems = concern.quickGuideItems ?? [];');
    expect(detail).not.toContain('href="#management"');
    expect(concernDefaults).toContain("href: '#signals'");
    expect(detail).toContain('href={item.href}');
    expect(detail).not.toContain('recommendedBrands.length > 0 &&');
    expect(detail).not.toContain('모든 브랜드 보기');
    expect(detail).not.toContain('{recommendedProducts.length > 0 && (');
    expect(detail).toContain('recommendedProducts.length > 0 ? (');
    expect(detail).toContain('data-testid="concern-products-empty"');
    expect(detail).toContain('concern.productsEmptyText');
    expect(detail).toContain('relatedReviews.length > 0 &&');
    expect(detail).toContain('concern.insuranceButtonLabel');
    expect(detail).not.toContain('보험 보장 범위 분석하기');
    expect(detail).toContain("concern.insuranceButtonHref ?? '/insurance'");
    expect(detail).not.toContain('href="/insurance/recommend"');
    expect(detail).not.toContain('더 궁금한 점이 있으신가요?');

    expect(obesity?.recommendedBrandIds).toEqual(['b1']);
    expect(obesity?.recommendedProductIds).toEqual(['p1', 'p2', 'p3']);
    expect(obesity?.faq).toHaveLength(4);
    expect(obesity?.symptoms[0]).toBe('갈비뼈가 쉽게 만져지지 않음');

    expect(oral?.recommendedBrandIds).toEqual(['b3']);
    expect(oral?.recommendedProductIds).toEqual(['p7', 'p8']);
    expect(oral?.faq).toHaveLength(4);
    expect(oral?.symptoms[1]).toBe('치아에 누렇거나 갈색의 치석이 보임');

    expect(joint?.recommendedBrandIds).toEqual([]);
    expect(joint?.recommendedProductIds).toEqual([]);
    expect(joint?.faq).toHaveLength(4);
    expect(joint?.symptoms[4]).toBe('다리나 관절 주변을 만질 때 불편해하는 모습을 보임');

    expect(stress?.symptoms).toContain('평소와 다르게 숨거나 사람·다른 동물과의 접촉을 피함');
    expect(stress?.faq).toEqual(STRESS_CONCERN_FAQ);
    const staleStressFaqConfig = {
      ...defaultConcernsConfig,
      items: defaultConcernsConfig.items.map((item) => (
        item.slug === 'stress'
          ? { ...item, faq: [{ question: '분리 불안을 어떻게 완화할 수 있나요?', answer: '이전 내용' }] }
          : item
      )),
    };
    expect(
      applySourceConcernFaqCopy(staleStressFaqConfig).items.find((item) => item.slug === 'stress')?.faq,
    ).toEqual(STRESS_CONCERN_FAQ);
    const stressFaqMigration = read('supabase/migrations/0142_stress_faq_source_copy.sql');
    for (const faq of STRESS_CONCERN_FAQ) {
      expect(stressFaqMigration).toContain(faq.question);
      expect(stressFaqMigration).toContain(faq.answer);
    }
    expect(stressFaqMigration).not.toContain('분리 불안을 어떻게 완화할 수 있나요?');
    expect(concernDefaults).toContain('불안하거나 두려워하는 행동으로 일상생활이 어려워 보임');
  });


  test('저장된 홈 설정의 브랜드 표기도 백조오브제로 갱신한다', () => {
    const migration = read('supabase/migrations/0107_baekjo_objet_display_name.sql');
    expect(migration).toContain('백조오브제는 그 과정까지 확인합니다.');
    expect(migration).toContain('검토 기준 자세히 보기');
    expect(migration).toContain("where id = 'home'");
  });

  test('브랜드 8개 표시 문구를 이름 변형과 무관하게 정규화한다', () => {
    const brandsPage = read('src/components/brands/BrandsContent.tsx');
    const cmsDefaults = read('src/lib/cms/pageDefinitions.ts');
    const brandCard = read('src/components/common/BrandCard.tsx');
    expect(`${brandsPage}\n${cmsDefaults}`).toContain('/images/brands-hero-cat-architectural.png');
    expect(brandCard).toContain('{presentation.displayName}');
    expect(brandCard).toContain('min-h-[24px]');
    const cases = [
      ['노블독 (NobleDog)', '노블독', '노블독 (Noble Dog)', '꾸준한 구강 관리가 일상에 자리 잡을 수 있도록 돕는 브랜드'],
      ['알로밍 (ALLOMING)', '알로밍', '알로밍 (ALLOMING)', '오랜 그루밍 연구를 바탕으로, 보호자가 받은 사랑에 같은 방식으로 보답할 수 있도록 돕는 브랜드'],
      ['오미프로 (OMIPRO)', '오미프로', '오미프로 (OMIPRO)', '연구가 끝난 뒤에도 스스로 확인을 멈추지 않는 영양 브랜드'],
      ['페네핏 (PENEFIT)', '페네핏', '페네핏 (PENEFIT)', '기호성과 영양을 함께 고민하며 선택지를 넓혀가는 브랜드'],
      ['써니 사이드업 (Sunny Side Up)', '써니사이드업', '써니사이드업 (SUNNY SIDE UP)', '세포배양 기반 연구를 바탕으로 제품과 기술에 생명을 향한 존중을 이어가는 브랜드'],
      ['챠콜스토리 (Charcoal Story)', '챠콜스토리', '챠콜스토리 (Charcoal Story)', '숯의 본질적인 가치를 아이들의 건강한 일상에 이어가는 브랜드'],
      ['RE:펫', 'RE:펫', 'RE:펫 (RE:PET)', '그리운 아이의 모습을 정성스럽게 구현해 다시 마주할 수 있게 하는 브랜드'],
      ['메종슈슈 (Maison Chouchou)', '메종슈슈', '메종슈슈 (Maison Chouchou)', '입는 아이의 편안함까지 생각하며 아름다움을 완성하는 브랜드'],
    ] as const;

    for (const [name, displayName, fullDisplayName, detailDescription] of cases) {
      const presentation = getBrandPresentation({ name, description: 'fallback' });
      expect(presentation.displayName).toBe(displayName);
      expect(formatBrandDisplayName(name)).toBe(fullDisplayName);
      expect(presentation.detailDescription).toBe(detailDescription);
    }
  });

  test('브랜드 8개의 카테고리와 관련 고민은 브랜드별 정본 문구만 표시한다', () => {
    const detail = read('src/app/brands/[id]/page.tsx');
    const expected = {
      b1: ['푸드 · 영양', '반려동물 식품관리사가 직접 설계한 영양 제품을 소개합니다.', '편식 · 영양 관리', '먹는 즐거움은 지키면서 필요한 영양을 챙길 수 있도록 돕습니다.'],
      b2: ['푸드 · 영양', '냄새 문제에서 시작해 장과 뼈 건강을 고려한 영양 제품을 소개합니다.', '장 · 뼈 건강', '먹는 영양으로 배변 냄새 관리에 도움을 줍니다.'],
      b3: ['케어', '양치가 어려운 아이들도 다양한 방식으로 사용할 수 있는 구강 케어 제품을 소개합니다.', '구강 · 양치', '향에 민감한 아이를 고려한 무향 설계로 일상적인 구강 관리를 돕습니다.'],
      b5: ['케어 · 라이프', '털의 특성과 보호자의 손길까지 고려한 그루밍 제품을 소개합니다.', '그루밍 · 교감', '반려동물의 그루밍 방식을 담은 브러시로 편안한 교감을 돕습니다.'],
      b6: ['펫로스 · 라이프', '한 아이의 특징을 세밀하게 구현한 맞춤 작품을 소개합니다.', '펫로스 · 추억', '소중한 기억을 오래 곁에 간직할 수 있도록 돕습니다.'],
      b7: ['패션 · 라이프', '체형과 움직임을 고려해 직접 디자인한 반려견 의류를 소개합니다.', '체형 · 착용감', '다양한 사이즈와 직접 피팅으로 편안한 옷 선택을 돕습니다.'],
      b8: ['케어 · 라이프', '숯의 본래 특성을 반려생활에 적용한 제품을 소개합니다.', '탈취 · 습기', '냄새와 습기를 관리해 쾌적한 생활환경을 돕습니다.'],
      b9: ['케어 · 라이프', '아이를 위한 케어부터 보호자를 위한 제품까지 소개합니다.', '피부 · 데일리케어', '상처부터 건조함까지 일상 속 피부 관리를 돕습니다.'],
    } as const;

    for (const [id, values] of Object.entries(expected)) {
      const source = getSourceBrandContent({ id, philosophy: '', highlights: [], auditPoints: [] });
      expect([
        source.summaryCategoryLabel,
        source.summaryCategoryNote,
        source.summaryConcernLabel,
        source.summaryConcernNote,
      ], id).toEqual(values);
    }

    expect(detail).not.toContain('아이의 건강한 습관을 돕는 제품을 소개합니다.');
    expect(detail).not.toContain('전반적인 컨디션을 세심하게 케어합니다.');
  });

  test('제공된 브랜드 Audit 원문은 DB 적용 상태와 무관하게 모든 본문 섹션을 유지한다', () => {
    const expected = {
      b2: { process: 8, material: 6, curator: 5, conclusion: 0 },
      b3: { process: 6, material: 5, curator: 6, conclusion: 0 },
      b5: { process: 12, material: 7, curator: 5, conclusion: 0 },
      b6: { process: 7, material: 5, curator: 3, conclusion: 0 },
      b7: { process: 7, material: 5, curator: 3, conclusion: 0 },
      b8: { process: 9, material: 5, curator: 5, conclusion: 0 },
      b9: { process: 8, material: 6, curator: 4, conclusion: 0 },
    } as const;

    for (const [id, counts] of Object.entries(expected)) {
      const report = getSourceAuditReport({ id, auditReport: undefined });
      expect(report, `${id} Audit 원문`).toBeDefined();
      expect(report!.selectionReason.trim().length, `${id} Selection Reason`).toBeGreaterThan(0);
      expect(report!.process, `${id} Audit Process`).toHaveLength(counts.process);
      expect(report!.materialReview, `${id} Material & Quality Review`).toHaveLength(counts.material);
      expect(report!.curatorNote, `${id} Curator's Note`).toHaveLength(counts.curator);
      expect(report!.auditConclusion ?? [], `${id} Audit Conclusion`).toHaveLength(counts.conclusion);
    }

    const penefitReport = {
      reportNo: 'BOA-2026-004',
      auditedAt: '2026.06',
      status: 'Audit Completed',
      headline: '반려동물의 식탁을 넓히는 영양 설계',
      summaryTitle: '성분을 감추지 않는 자신감',
      summary: '페네핏 Audit 요약',
      selectionReason: '페네핏 Selection Reason',
      process: ['페네핏 Audit Process'],
    };
    const resolvedPenefitReport = getSourceAuditReport({ id: 'b1', auditReport: penefitReport });
    expect(resolvedPenefitReport).toMatchObject(penefitReport);
    expect(resolvedPenefitReport?.headline).toBe(penefitReport.headline);
    expect(resolvedPenefitReport?.selectionReason).toBe(penefitReport.selectionReason);
    expect(resolvedPenefitReport?.process).toEqual(penefitReport.process);
    expect(resolvedPenefitReport?.checkpoints).toHaveLength(9);
    expect(resolvedPenefitReport?.materialReview).toHaveLength(7);
    expect(resolvedPenefitReport?.curatorNote).toHaveLength(5);
  });

  test('The Audit Checkpoints는 상세 Audit 7개에 서로 다른 브랜드별 정본을 표시한다', () => {
    const expected = {
      b2: ['사람이 섭취하는 천연 식품 원료', '기호성을 고려한 강아지·고양이용 별도 배합', '8년에 걸친 연구 개발', '오미자 발효 부산물을 활용한 사료 첨가제 제조방법 등록 특허', '미국 FDA 식품시설 등록', '중국 MARA 제품 심사 및 수입등록', '실제 사용자 검증 완료'],
      b3: ['구강 건강을 중요하게 바라보는 브랜드 방향', '향에 민감한 반려동물을 고려한 무향 설계', '상황에 따라 선택할 수 있는 다양한 구강 관리 방식', '집중 분사를 고려한 부리형 분사 구조', '구강 구조를 고려한 초미세모 칫솔 및 S·M 사이즈 구성', '동물용의약외품 신고 및 시험성적서 확인', '실제 사용자 검증 완료'],
      b5: ['사랑에 답하는 브랜드 철학', '그루밍 행동을 바탕으로 한 제품 설계', '그루밍 세기·속도 및 혀 돌기 구조 연구', '손의 움직임을 고려한 그립형 구조', '장모용·단모용 교체형 모듈 설계', '그립형·교체형 모듈 구조의 펫브러시 등록 특허', '자체 개발 및 국내 생산', '유아용 식기 등급 실리콘 적용', 'Good Design Korea 은상', 'Pin-up Design Awards Best of Best', '실제 사용자 피드백 및 개선사항 반영'],
      b6: ['직접 펫로스를 경험한 작가의 작업 철학', '반려동물 작품 제작 관련 3종 지도사 자격', '전 작품 작가 직접 제작', '개체별 특징을 구현하는 맞춤 제작', '완성 단계에서 보호자 확인 및 수정 요청 반영', '실제 작품에서 확인되는 높은 재현도'],
      b7: ['반려견의 체형과 움직임을 고려한 의류 설계', '제품 특성에 따라 달라지는 소재 구성', '활동성을 고려한 신축성 및 패턴 적용', '반려견 직접 피팅이 가능한 쇼룸·작업실 운영', '착용과 움직임을 고려한 세부 구조', '자체 디자인 및 국내 제작'],
      b8: ['19년에 걸친 숯 연구 및 제품 개발', '숯 활용 기술 관련 등록 특허', '제품 관련 디자인등록', '자체 공장을 기반으로 한 제품 생산', '탈취·습기 관리를 위한 숯 적용', '차콜프레시 시료의 탈취·항균 시험', '기존 숯 제품군의 안전 관련 자료', '실제 사용자 검증 완료'],
      b9: ['동물의 입장에서 시작하는 브랜드 철학', '하나의 메시지로 연결된 제품 설계', '동물실험 대체 연구 방식', '사람용 제품에도 적용되는 안전 기준', '2024 벤처기업부 장관 표창', '2023 대한민국 베스트 신상품 대상', '2021 와디즈 동물 헬스케어 카테고리 1위', '실제 사용자 검증 완료'],
    } as const;

    const serialized = new Set<string>();
    for (const [id, checkpoints] of Object.entries(expected)) {
      const report = getSourceAuditReport({ id, auditReport: undefined });
      expect(report?.checkpoints, id).toEqual(checkpoints);
      serialized.add(JSON.stringify(report?.checkpoints));
    }
    expect(serialized.size).toBe(Object.keys(expected).length);
  });

  test('챠콜스토리 Selection Reason은 제공된 5개 문단을 그대로 표시한다', () => {
    const report = getSourceAuditReport({ id: 'b8', auditReport: undefined });
    expect(report?.selectionReason.split('\n\n')).toEqual([
      '반려동물과 함께하는 공간에서 냄새와 습기는 쉽게 반복되는 문제입니다. 그때마다 무언가를 더해 잠시 가릴 수도 있지만, 챠콜스토리는 문제를 만드는 환경 자체에 주목했습니다.',
      '챠콜스토리는 펫 제품을 위해 새롭게 숯을 선택한 브랜드가 아닙니다. 19년에 걸쳐 숯을 연구하고 다양한 제품과 기술로 개발해온 경험을 바탕으로, 그 전문성을 반려동물의 생활환경까지 확장하고 있습니다.',
      '고양이 화장실의 냄새와 습기, 반려동물이 오래 머무는 공간까지 챠콜스토리는 탈취·흡습·항균이라는 숯의 특성을 반려생활에 필요한 방식으로 적용했습니다.',
      '백조오브제는 브랜드 철학과 제품 개발 방향, 연구 및 개발 이력, 등록 특허 및 지식재산권 자료, 자체 생산 체계, 시험자료와 실제 사용자 경험을 함께 검토하였습니다.',
      '그 결과 챠콜스토리는 19년간 축적해온 숯에 대한 전문성을 반려동물에게 필요한 새로운 쓰임으로 이어가고 있음을 확인하였습니다.',
    ]);
  });

  test('노블독 검토 완료 4개와 상세 Checkpoints 7개·Selection Reason 5개 문단을 구분한다', () => {
    const source = getSourceBrandContent({ id: 'b3', philosophy: '', highlights: [], auditPoints: [] });
    const report = getSourceAuditReport({ id: 'b3', auditReport: undefined });
    const paragraphs = report?.selectionReason.split('\n\n') ?? [];

    expect(source.auditPoints).toEqual([
      '동물용의약외품 신고 정보 확인',
      '제품 성분 및 시험성적서 확인',
      '스프레이·칫솔 구조 및 사용 방식 확인',
      '다양한 구강 관리 방식 확인',
    ]);
    expect(report?.checkpoints).toHaveLength(7);
    expect(paragraphs).toEqual([
      '반려동물에게 구강 관리는 중요합니다. 하지만 양치를 어려워하는 아이에게 매일 같은 방법을 요구하는 것은 쉽지 않습니다.',
      '노블독은 구강 관리를 한 가지 방법에만 두지 않습니다. 직접 분사하거나 칫솔과 거즈를 함께 사용하고, 상황에 따라 마시는 물이나 사료와 함께 급여할 수 있도록 여러 방법을 제안하며 관리가 중단되지 않는 데 집중하고 있습니다.',
      '백조오브제는 브랜드 철학과 제품 개발 방향을 비롯해 동물용의약외품 신고 정보, 제품의 성분과 시험성적서, 스프레이와 칫솔의 구조 및 사용 방식, 실제 사용자 피드백, 대표자 인터뷰를 함께 검토하였습니다.',
      '특히 사용의 편의성에 그치지 않고, 제품 구조가 실제 구강 관리 과정에서 어떤 역할을 하도록 설계되었는지를 중점적으로 확인하였습니다.',
      '그 결과 노블독은 하나의 방법을 정답으로 두기보다, 반려동물과 보호자가 각자의 상황에서 구강 관리를 이어갈 수 있도록 제품의 형태와 사용 방법을 구체적으로 설계하고 있음을 확인하였습니다.',
    ]);
  });

  test('알로밍 검토 완료 6개와 상세 PDF의 11개 Checkpoints·6개 Selection Reason 문단을 구분한다', () => {
    const source = getSourceBrandContent({ id: 'b5', philosophy: '', highlights: [], auditPoints: [] });
    const report = getSourceAuditReport({ id: 'b5', auditReport: undefined });

    expect(source.auditPoints).toEqual([
      '약 4년에 걸친 연구 및 개발 과정 확인',
      '펫브러시 구조 관련 등록 특허 확인',
      '유아용 식기 등급 실리콘 소재 확인',
      '자체 개발 및 국내 생산 체계 확인',
      'Good Design Korea 은상 수상 내역 확인',
      'Pin-up Design Awards Best of Best 수상 내역 확인',
    ]);

    expect(report?.checkpoints).toEqual([
      '사랑에 답하는 브랜드 철학',
      '그루밍 행동을 바탕으로 한 제품 설계',
      '그루밍 세기·속도 및 혀 돌기 구조 연구',
      '손의 움직임을 고려한 그립형 구조',
      '장모용·단모용 교체형 모듈 설계',
      '그립형·교체형 모듈 구조의 펫브러시 등록 특허',
      '자체 개발 및 국내 생산',
      '유아용 식기 등급 실리콘 적용',
      'Good Design Korea 은상',
      'Pin-up Design Awards Best of Best',
      '실제 사용자 피드백 및 개선사항 반영',
    ]);

    expect(report?.selectionReason.split('\n\n')).toEqual([
      '시장에는 다양한 반려동물 브러시가 있습니다. 하지만 단순히 털을 관리하는 도구를 넘어, 반려동물의 행동을 연구하고 그 경험을 제품 구조로 구현하는 브랜드는 많지 않습니다.',
      '알로밍을 전개하는 캣코드(CATCODE)는 키보드 위를 지나간 고양이가 남긴, 사람에게는 의미를 알 수 없는 문자에서 이름이 시작되었습니다. 호기심·창의성·도전을 주요 가치로 두고 있으며, 반려동물용 배변장치 개발을 시작으로 반려동물의 생활에서 발견한 문제를 제품으로 풀어왔습니다.',
      '알로밍은 ‘사람은 반려동물에게 사랑을 받기만 하는 존재가 아니라, 그 사랑에 답할 수 있어야 한다’는 생각에서 시작되었습니다. 그루밍은 반려동물이 사랑을 표현하는 방식이며, 알로밍은 사람도 같은 방식으로 그 사랑에 답할 수 있도록 제품을 설계하였습니다.',
      '백조오브제는 기업과 브랜드의 철학뿐 아니라 제품 구조와 설계 방식, 연구 및 개발 과정, 국내 생산 체계, 소재, 지식재산권 자료, 디자인 수상 이력, 실제 사용자 경험까지 함께 검토하였습니다.',
      '특히 약 4년에 걸친 개발과 테스트 과정에서 그루밍의 세기와 속도, 고양이 혀 돌기의 구조 등을 연구하고, 그 결과를 제품의 형태와 사용 방식에 구체적으로 반영하고 있음을 확인하였습니다.',
      '그 결과 알로밍은 반려동물의 행동에 대한 관찰과 연구를 제품의 구조와 사용 경험으로 구현하며, 브랜드가 추구하는 철학을 실제 제품에 일관되게 반영하고 있음을 확인하였습니다.',
    ]);
  });

  test('써니사이드업 Audit 상세는 배송 안내 아래에서 공개된다', () => {
    const detail = read('src/app/brands/[id]/page.tsx');
    const migration = read('supabase/migrations/0112_sunny_side_up_audit_source_copy.sql');
    const sourceCopy = read('supabase/migrations/0132_sunny_side_up_audit_detail_source_copy.sql');
    const conclusionRemoval = read('supabase/migrations/0133_remove_sunny_side_up_audit_conclusion.sql');
    const report = getSourceAuditReport({ id: 'b9', auditReport: undefined });
    expect(detail.indexOf('<BrandShippingInfo brand={brand} />')).toBeLessThan(detail.indexOf('<BrandAuditReport brand={publicBrand} />'));
    expect(migration).toContain("'reportNo', 'BOA-2026-005'");
    expect(migration).toContain("'headline', '존중을 증명하는 기준'");
    expect(migration).toContain("'동물실험 대체 연구 방식'");
    expect(migration).toContain("'제품 안전성 및 사용 기준'");
    expect(migration).toContain("'대표자 인터뷰'");
    expect(migration).toContain("'2024 벤처기업부 장관 표창'");
    expect(migration).toContain("'써니사이드업을 Baekjo Objet Audit BOA-2026-005 Audit 브랜드로 기록합니다.'");
    expect(migration).not.toContain('AI 기반 기술 개발');
    expect(report?.materialReview).toEqual([
      '써니사이드업은 자체 연구와 기술 개발을 바탕으로 다양한 제품을 선보이고 있으며, 동물실험을 대체하는 세포배양(In vitro) 기반의 연구 방식을 적용하고 있습니다.',
      '대표 제품인 애니마크 피부연고는 반려동물이 핥는 상황까지 고려하여 개발되었습니다. 제품의 안전성과 효능을 확인하기 위해 국내외 시험 자료를 함께 검토하였으며, 국내 효능 임상시험을 통해 염증 개선, 피부 장벽 강화, 보습력 및 흡수력에 관한 시험 결과를 확인하였습니다. 또한 미국 Consumer Product Testing Company(CPT)가 수행한 Toxicological Safety Assessment 자료를 통해 제품의 독성학적 안전성 평가 내용도 확인하였습니다.',
      '제품은 스테로이드와 항생제 등 내성 우려 성분을 배제하고, 다양한 동물의 사용 환경을 고려하여 설계되었습니다. 연고 사용 후 활용하는 노즈워크 장난감까지 하나의 케어 경험으로 연결하고 있다는 점도 함께 확인하였습니다.',
      '이러한 기준은 사람을 위한 제품에도 이어지고 있습니다. 사람용 향수 역시 반려동물과 함께 생활하는 환경을 고려하여 개발되었으며, 제품의 안전성과 관련된 테스트 자료와 사용 기준을 함께 확인하였습니다.',
      '제품에 반영된 기준은 기술 영역으로도 이어지고 있습니다. 보호자가 반려동물의 상태를 이해하고, 제품으로 관리할 수 있는 경우와 보다 전문적인 케어가 필요한 상황을 판단하는 데 도움을 주기 위해 AI 기술을 반려동물 케어에 접목하고 있습니다.',
      '이와 함께 국내외의 다양한 수상 이력도 확인하였습니다. 제품의 기능뿐 아니라 연구 방식과 안전성, 사용 환경과 그 이후의 경험까지 하나의 기준이 제품과 기술 전반에 이어지고 있음을 확인하였습니다.',
    ]);
    expect(report?.curatorNote).toHaveLength(4);
    expect(report?.auditConclusion ?? []).toEqual([]);
    expect(sourceCopy).toContain('Toxicological Safety Assessment');
    expect(sourceCopy).toContain('AI 기술을 반려동물 케어에 접목하고 있습니다.');
    expect(conclusionRemoval).toContain("- 'auditConclusion'");
  });

  test('오미프로는 전체 화면에서 흰 배경 없는 영문 워드마크를 표시한다', () => {
    const detail = read('src/app/brands/[id]/page.tsx');
    const brandLogo = read('src/components/common/BrandLogo.tsx');
    expect(detail).toContain('size="md"');
    expect(detail).toContain('srcOverride={titleLogoSrc}');
    expect(detail).toContain("scaleOverride={brand.id === 'b2' ? 1 : undefined}");
    expect(brandLogo).toContain("b2: '/brands/omipro-wordmark-transparent-exact.png'");
    expect(brandLogo).toContain('displayLogoMap[brand.id] ?? brand.wordmarkImage ?? brand.logo');
  });

  test('오미프로 브랜드 스토리는 연구와 직접 섭취 검증 내용을 표시한다', () => {
    const detail = read('src/app/brands/[id]/page.tsx');
    const migration = read('supabase/migrations/0088_omipro_brand_story.sql');
    expect(detail).toContain('{presentation.displayName}');
    expect(migration).toContain('오미프로는 반려동물의 몸에서 일어나는 작은 변화까지 세심하게 살펴봅니다.');
    expect(migration).toContain('대표는 지금도 직접 제품을 섭취하며 스스로 경험하고 확인하는 일을 이어가고 있습니다.');
    expect(migration).toContain('사람이 섭취하는 천연 식품 원료를 사용한 제품 설계');
    expect(migration).toContain('제품의 적응 과정을 고려한 단계적 급여 설계');
  });

  test('오미프로 상단 요약과 검토 완료는 확정된 문구와 6개 항목을 유지한다', () => {
    const detail = read('src/app/brands/[id]/page.tsx');
    const migration = read('supabase/migrations/0120_omipro_summary_and_review_source_copy.sql');
    const detailMigration = read('supabase/migrations/0134_omipro_audit_checkpoints_source_copy.sql');
    const source = getSourceBrandContent({ id: 'b2', philosophy: '', highlights: [], auditPoints: [] });
    const report = getSourceAuditReport({ id: 'b2', auditReport: undefined });

    expect(detail).toContain('title="백조오브제 검토 완료"');
    expect(detail).toContain('아래 항목을 중심으로 검토를 완료하였습니다.');
    expect(source.summaryCategoryNote).toBe('냄새 문제에서 시작해 장과 뼈 건강을 고려한 영양 제품을 소개합니다.');
    expect(source.summaryConcernNote).toBe('먹는 영양으로 배변 냄새 관리에 도움을 줍니다.');
    expect(source.auditPoints).toHaveLength(6);
    expect(report?.checkpoints).toHaveLength(7);
    expect(report?.checkpoints).not.toEqual(source.auditPoints);
    expect(migration).toContain('오미자 발효 부산물 활용 제조방법 등록 특허 확인');
    expect(migration).toContain('미국 FDA·중국 MARA 등 해외 등록 자료 확인');
    expect(migration).toContain('실제 급여 경험 확인');
    expect(detailMigration).toContain('사람이 섭취하는 천연 식품 원료');
    expect(detailMigration).toContain('중국 MARA 제품 심사 및 수입등록');
  });

  test('오미프로 상세 Audit에는 Audit Conclusion을 표시하지 않는다', () => {
    const report = getSourceAuditReport({ id: 'b2', auditReport: undefined });
    const migration = read('supabase/migrations/0121_remove_omipro_audit_conclusion.sql');

    expect(report?.auditConclusion ?? []).toEqual([]);
    expect(migration).toContain("'{auditReport}'");
    expect(migration).toContain("- 'auditConclusion'");
  });

  test('페네핏은 전체 화면에서 심볼과 흰 배경 없는 영문 워드마크를 표시한다', () => {
    const detail = read('src/app/brands/[id]/page.tsx');
    const brandLogo = read('src/components/common/BrandLogo.tsx');
    expect(detail).toContain('{presentation.displayName}</span>');
    expect(detail).toContain('getBrandTitleDisplayLogo(brand)');
    expect(detail).toContain('uniformScale');
    expect(brandLogo).toContain("b1: '/brands/penefit-wordmark-transparent.png'");
    expect(brandLogo).toContain('displayLogoMap[brand.id] ?? brand.wordmarkImage ?? brand.logo');
  });

  test('메종슈슈 브랜드 스토리는 착용감과 패턴 설계 내용을 표시한다', () => {
    const detail = read('src/app/brands/[id]/page.tsx');
    const migration = read('supabase/migrations/0090_maison_chouchou_brand_story.sql');
    const source = getSourceBrandContent({ id: 'b7', philosophy: '', highlights: [], auditPoints: [] });
    expect(detail).toContain('{presentation.displayName}');
    expect(detail).toContain('brand.summaryCategoryLabel ?? sourceContent.summaryCategoryLabel');
    expect(source.summaryCategoryLabel).toBe('패션 · 라이프');
    expect(source.summaryCategoryNote).toBe('체형과 움직임을 고려해 직접 디자인한 반려견 의류를 소개합니다.');
    expect(source.summaryConcernLabel).toBe('체형 · 착용감');
    expect(source.summaryConcernNote).toBe('다양한 사이즈와 직접 피팅으로 편안한 옷 선택을 돕습니다.');
    expect(migration).toContain('그 옷을 편안하게 입고 움직이는 순간까지 중요하게 생각합니다.');
    expect(migration).toContain('체형과 움직임을 고려한 패턴 설계');
    expect(migration).toContain('제품 특성에 맞춰 선택한 소재와 신축성');
  });

  test('메종슈슈 Audit 요약은 완료 상태와 확정 검토 항목을 표시한다', () => {
    const detail = read('src/app/brands/[id]/page.tsx');
    const migration = read('supabase/migrations/0091_maison_chouchou_audit_points.sql');
    expect(detail).toContain('title="백조오브제 검토 완료"');
    expect(detail).toContain("const auditStatusText = hasCompletedAudit ? 'Audit Completed' : ''");
    expect(detail).toContain('Audit 자세히 보기 <ArrowRight');
    for (const point of [
      '제품별 소재 및 혼용률 확인',
      '사이즈 구성 및 착용 방식 확인',
      '쇼룸·작업실 반려견 직접 피팅 확인',
      '자체 디자인 및 국내 제작 방식 확인',
    ]) {
      expect(migration).toContain(point);
    }
  });

  test('메종슈슈 Audit 상세는 PDF 내용을 배송 안내 아래에서 공개한다', () => {
    const detail = read('src/app/brands/[id]/page.tsx');
    const migration = read('supabase/migrations/0092_maison_chouchou_audit_report.sql');
    const removal = read('supabase/migrations/0126_remove_maison_chouchou_audit_conclusion.sql');
    const report = getSourceAuditReport({ id: 'b7', auditReport: undefined });
    expect(detail.indexOf('<BrandShippingInfo brand={brand} />')).toBeLessThan(detail.indexOf('<BrandAuditReport brand={publicBrand} />'));
    expect(migration).toContain("'reportNo', 'BOA-2026-006'");
    expect(migration).toContain("'headline', '편안함으로 완성되는 아름다움의 기준'");
    expect(migration).toContain("'제품 디자인 및 패턴 설계'");
    expect(migration).toContain('쇼룸과 작업실에서는 반려견이 직접 피팅해 사이즈와 착용감을 확인할 수 있습니다.');
    expect(report?.auditConclusion ?? []).toEqual([]);
    expect(removal).toContain("- 'auditConclusion'");
  });

  test('RE:펫 스토리와 Audit 요약은 맞춤 제작 및 완료 상태를 표시한다', () => {
    const detail = read('src/app/brands/[id]/page.tsx');
    const migration = read('supabase/migrations/0093_repet_story_and_audit_points.sql');
    expect(detail).toContain('{presentation.displayName}');
    for (const copy of [
      'RE:펫은 직접 펫로스를 경험한 작가가 그리운 아이의 모습을 다시 마주하고 싶은 마음에서 시작되었습니다.',
      '한 아이의 특징을 살리는 개별 맞춤 제작',
      '전 작품 작가가 직접 제작',
      '작가의 작업 철학 및 전문 자격 확인',
      '완성 단계의 보호자 확인 및 수정 방식 확인',
      '실제 완성 작품의 재현도 확인',
    ]) {
      expect(migration).toContain(copy);
    }
  });

  // '모든 브랜드 상세의 Audit 상태는 완료로 통일한다' 테스트는 PR #244가 auditStatusText를
  // 미발행 브랜드에도 항상 "Audit Completed"로 하드코딩한 사실 오류를 그대로 고정하는
  // 테스트였다. A묶음 작업 지침에 따라 hasPublishedAudit 조건부(미발행 시 '입점 자료 확인
  // 중')로 되돌렸으므로 이 테스트는 제외한다 — src/app/brands/[id]/page.tsx의
  // auditStatusText/title 조건부 분기 참고.

  test('RE:펫 Audit 상세는 PDF 내용을 배송 안내 아래에서 공개한다', () => {
    const detail = read('src/app/brands/[id]/page.tsx');
    const migration = read('supabase/migrations/0094_repet_audit_report.sql');
    const removal = read('supabase/migrations/0140_remove_repet_audit_conclusion.sql');
    const report = getSourceAuditReport({ id: 'b6', auditReport: undefined });
    expect(detail.indexOf('<BrandShippingInfo brand={brand} />')).toBeLessThan(detail.indexOf('<BrandAuditReport brand={publicBrand} />'));
    expect(migration).toContain("'reportNo', 'BOA-2026-007'");
    expect(migration).toContain("'headline', '그리운 모습을 다시 마주하는 시간'");
    expect(migration).toContain("'작품 제작 관련 전문 자격'");
    expect(migration).toContain('반려동물 양모펠트 지도사 2급');
    expect(migration).toContain('RE:펫을 BOA-2026-007 Audit 브랜드로 기록합니다.');
    expect(report?.auditConclusion ?? []).toEqual([]);
    expect(removal).toContain("- 'auditConclusion'");
  });

  test('B2B·보험 CTA와 RE:펫 결정 문서 연결이 정본과 일치한다', () => {
    const cmsDefaults = read('src/lib/cms/pageDefinitions.ts');
    const brands = read('src/components/brands/BrandsContent.tsx');
    const insurance = read('src/app/insurance/page.tsx');
    const matrix = read('docs/baekjo-0827/source-matrix.md');
    expect(cmsDefaults).toContain('BAEKJO OBJET FOR BUSINESS');
    expect(cmsDefaults).toContain('백조오브제 B2B는 기관과 브랜드의 목적에 맞춰 상품과 콘텐츠, 필요한 구성을 함께 제안합니다.');
    expect(cmsDefaults).toContain('목적에 따라 협업의 방식도 달라집니다.');
    expect(cmsDefaults).toContain('필요에 맞는 협업 방식을 제안합니다.');
    expect(cmsDefaults).toContain('프로젝트는 충분한 협의와 준비를 거쳐 공개하며');
    expect(cmsDefaults).toContain('협업은 이렇게 진행됩니다.');
    expect(cmsDefaults).toContain('진행 중인 프로젝트와 검토 일정에 따라 기획 및 제안까지');
    expect(cmsDefaults).toContain('필요한 순간과 목적을 들려주세요.');
    expect(cmsDefaults).toContain('서로의 가치를 지키며 함께 성장할 수 있는 관계를 만들어갑니다.');
    expect(cmsDefaults).toContain('B2B 문의하기');
    expect(brands).toContain('self-center items-center justify-center whitespace-nowrap');
    expect(brands).toContain('md:self-start');
    expect(insurance).toContain('보험 분석 시작하기');
    expect(matrix).not.toMatch(/BRAND-REPET, AUDIT-01, DEC-003/);
    expect(matrix.match(/BRAND-REPET, AUDIT-01, DEC-004/g)).toHaveLength(3);
  });
});
