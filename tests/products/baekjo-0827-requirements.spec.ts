import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { defaultHomeSettings, normalizeHomeSettings } from '@/data/homeContent';
import { shopCategoryFilters } from '@/data/shopFilters';
import { defaultConcernsConfig } from '@/lib/concerns/config';
import { formatBrandDisplayName, getBrandPresentation } from '@/lib/brands/presentation';

const ROOT = path.resolve(__dirname, '..', '..');
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

test.describe('2026-08-27 고객 요구사항 표시 계약', () => {
  test('헤더와 푸터 메뉴가 정본 순서와 구성으로 유지된다', () => {
    const header = read('src/components/common/Header.tsx');
    const footer = read('src/components/common/Footer.tsx');
    for (const label of ['셀렉션', '브랜드', '케어', '펫보험', '백조오브제', 'B2B']) {
      expect(header, `${label} 메뉴`).toContain(label);
    }
    for (const submenu of ['백조오브제 Audit의 검토 기준', '전문가 칼럼', '보호자 후기', '소식']) {
      expect(header).toContain(submenu);
    }
    expect(header).not.toContain('백조 Audit');
    expect(header).not.toContain('먼저 경험한 보호자들의 기록');
    expect(footer).toContain('@BAEKJO OBJET');
    expect(footer).toContain("label: '배송·교환·환불'");
    expect(footer).not.toContain('PET LIFE CURATION');
  });

  test('홈 핵심 카피와 추천 상품 상한이 정본과 일치한다', () => {
    const home = read('src/components/home/HomeClient.tsx');
    expect(defaultHomeSettings.hero.eyebrow).toBe('Curated Pet Brands');
    expect(defaultHomeSettings.hero.titleLines.join(' ')).toBe('좋은 브랜드를 찾고 계셨나요?');
    expect(defaultHomeSettings.hero.descriptionLines).toEqual([
      '좋은 브랜드는 결과입니다. 백조오브제는 그 과정까지 확인합니다.',
    ]);
    expect(defaultHomeSettings.hero.trustNote).toBe('백조오브제 Audit을 통과한 브랜드만 소개합니다.');
    expect(defaultHomeSettings.insuranceBanner.description).toBe(
      '같은 품종이라도, 나이와 기왕력에 따라 우리 아이에게 맞는 보험은 달라집니다.',
    );
    expect(defaultHomeSettings.insuranceBanner.buttonLabel).toBe('보험 분석 시작하기');
    expect(home).toContain(".slice(0, 3)");
    expect(home).toContain('보호자 후기');
    expect(home).toContain('소식');
    expect(home).toContain('data-testid="home-soft-open-notice"');
    expect(home).toContain('가오픈 진행 중');
    expect(home).toContain('현재 결제는 무통장입금으로 진행됩니다.');
    expect(home).not.toContain('이용 안내 보기');
  });

  test('Audit·보호자 후기·소식 화면이 최신 콘텐츠 정본과 일치한다', () => {
    const audit = read('src/app/audit/page.tsx');
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
      expect(audit).toContain(copy);
    }
    expect(audit).not.toContain('100 to 5');
    expect(audit).not.toContain('검증 브랜드 보기');
    expect(audit).not.toContain('검토 기준 살펴보기');

    for (const copy of ['REAL EXPERIENCES', '보호자 후기', "['small', '소동물']", "['other', '기타']"]) {
      expect(reviews).toContain(copy);
    }
    expect(reviews).toContain('return review.petType === filter;');
    expect(reviews).not.toContain('반려가족의 리얼 후기');
    expect(reviews).not.toContain('reviewConcernTagsByProductId');
    expect(reviewsAdmin).toContain("label: '반려동물 종류 (필수)'");
    expect(reviewsAdmin).toContain('required: true');
    expect(reviewsAdmin).toContain("{ value: '', label: '종류를 선택해 주세요' }");

    expect(notices).toContain('NEWS &amp; NOTICE');
    expect(notices).toContain('백조오브제의 새로운 소식과 안내');
    for (const hiddenColumn of ['<div>글쓴이</div>', '<div>조회수</div>', '<div>좋아요</div>']) {
      expect(notices).not.toContain(hiddenColumn);
    }
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
    const productCard = read('src/components/common/ProductCard.tsx');
    expect(shopCategoryFilters.map((category) => category.label)).toEqual([
      '식품·영양', '케어', '패션', '펫로스', '라이프',
    ]);
    for (const label of ['전체', '2만원 미만', '2-5만원', '5-10만원', '10만원 이상']) {
      expect(shop).toContain(label);
    }
    for (const label of ['피부', '관절', '체중', '구강', '냄새']) {
      expect(shop).toContain(`title: '${label}'`);
    }
    expect(shop).toContain('소동물');
    expect(shop).not.toContain('title="연령"');
    expect(shop).toContain('DAILY PICK');
    expect(shop).not.toContain('지금 백조오브제가 가장 주목하는 제품');
    expect(shop).not.toContain('조건을 조금 넓혀 다시 살펴볼까요?');
    expect(shop).toContain('필터 초기화');
    expect(shop).not.toContain('선택한 조건 모두 지우기');
    expect(productCard).not.toContain('SELECTED');
    expect(productCard).not.toContain('잠시 품절');
    expect(productCard).toContain('product.reviewCount > 0');
  });

  test('눈물 케어 문구와 신호 목록이 정본과 일치한다', () => {
    const overview = read('src/app/concerns/page.tsx');
    const detail = read('src/app/concerns/[slug]/page.tsx');
    const tear = defaultConcernsConfig.items.find((concern) => concern.slug === 'tear');
    expect(overview).toContain('/images/care-guide-hero-pet-family.png');
    expect(overview).toContain('h-[640px]');
    expect(overview).toContain('md:h-[480px]');
    for (const slug of ['tear', 'joint', 'skin', 'obesity', 'stress', 'oral']) {
      expect(detail).toContain(`/images/care-detail-hero-${slug}.png`);
    }
    expect(detail).toContain('data-testid="concern-detail-hero"');
    expect(detail).toContain('data-testid="concern-detail-hero-image"');
    expect(detail).not.toContain('/images/care-hero-tear.webp');
    expect(tear?.symptoms).toEqual([
      '눈 밑의 갈색·적갈색 자국이 짙어짐', '평소보다 눈물 양이 많아짐',
      '눈 주위 털이 계속 축축하게 젖어 있음', '노란 눈곱이 생기거나 눈곱 양이 많아짐',
      '눈을 평소보다 자주 비비거나 긁음', '한쪽 눈의 눈물만 유독 많아짐',
    ]);
    expect(detail).toContain('눈물 자국, 닦아주는 것만으로 충분할까요?');
    expect(detail).toContain('매일 닦아도 반복된다면, 관리 방법부터 다시 살펴볼 필요가 있어요.');
    for (const sign of [
      '눈이 심하게 붉어지거나 부어오름', '노란색·녹색 눈곱이 계속 생김', '눈을 잘 뜨지 못하거나 계속 찡그림',
      '눈을 반복해서 심하게 비비거나 긁음', '눈이 평소보다 뿌옇게 보임', '눈 또는 눈꺼풀에 상처가 보임',
    ]) {
      expect(detail).toContain(sign);
    }
  });

  test('피부 케어 문구와 추천·FAQ 구성이 정본과 일치한다', () => {
    const overview = read('src/app/concerns/page.tsx');
    const detail = read('src/app/concerns/[slug]/page.tsx');
    const skin = defaultConcernsConfig.items.find((concern) => concern.slug === 'skin');
    const stress = defaultConcernsConfig.items.find((concern) => concern.slug === 'stress');

    expect(overview).toContain('우리 아이가 보내는 작은 신호부터 살펴보세요.');
    expect(overview).toContain('일상에서 알아두면 좋은 케어 기준을 정리했습니다.');
    expect(overview).not.toContain('/* 4. 핵심 정보 요약 바 */');
    expect(stress?.shortDescription).toBe('평소보다 불안하거나 예민해졌나요?');

    expect(detail).toContain("title: '자꾸 긁는 우리 아이,\\n피부부터 살펴보세요'");
    expect(detail).toContain('최근 달라진 식사나 생활 환경은 없는지 살펴보세요.');
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
    for (const text of [
      "title: '변화 살펴보기'",
      "description: '평소 생활에서 확인할 수 있는 몸과 행동의 변화'",
      "title: '병원 방문 판단하기'",
      "description: '병원 진료를 고려해야 할 신호와 기준'",
      '긁거나 핥는 행동이 계속되거나 심해짐',
      '피부 변화와 함께 식욕이나 활동량이 평소와 달라짐',
      '우리 아이에게 필요한 보장은 무엇일까요?',
      '후기 전체 보기',
      '{concern.title} 관련 상품 보기',
    ]) {
      expect(detail).toContain(text);
    }
    expect(detail).not.toContain('MessageCircleQuestion');
    expect(detail).not.toContain('더 궁금한 점이 있으신가요?');
    expect(detail).not.toContain('함께 읽을 이야기가 아직 없어요');
    expect(detail).toContain('concern.recommendedProductIds.flatMap');
    expect(detail).toContain('concern.recommendedBrandIds.flatMap');
  });

  test('체중·구강·관절·행동 상세 문구와 추천 노출 규칙이 최신 시안과 일치한다', () => {
    const overview = read('src/app/concerns/page.tsx');
    const detail = read('src/app/concerns/[slug]/page.tsx');
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
    for (const faq of [
      '이 정보는 어떻게 활용하면 되나요?',
      '여러 고민이 함께 보이면 어떻게 살펴봐야 하나요?',
      '언제 진료가 필요한가요?',
      '이 정보만으로 건강 상태를 판단해도 되나요?',
    ]) {
      expect(overview).toContain(faq);
    }
    expect(overview).not.toContain('사랑하는 아이를 위한 든든한 준비');
    expect(overview).toContain('우리 아이에게 필요한 보장은 무엇일까요?');
    expect(overview).toContain('나이와 건강 상태를 바탕으로 우리 아이에게 맞는 보험을 살펴보세요.');
    expect(overview).toContain('보험 분석하기');
    expect(overview).toContain('<Link href="/insurance"');
    expect(overview).not.toContain('href="/insurance/recommend"');

    expect(detail).toContain("title: '우리 아이의 체중,\\n괜찮은 걸까요?'");
    expect(detail).toContain("title: '구강, 어디서부터 살펴볼까요?'");
    expect(detail).toContain("title: '걸음걸이가 예전과 달라졌나요?'");
    expect(detail).toContain("title: '평소와 다른 행동이 자주 보이나요?'");
    expect(detail).not.toContain("title: '관리 기준 알아보기'");
    expect(detail).not.toContain('href="#management"');
    expect(detail).toContain('href="#signals"');
    expect(detail).toContain('recommendedBrands.length > 0 &&');
    expect(detail).toContain('recommendedProducts.length > 0 &&');
    expect(detail).toContain('relatedReviews.length > 0 &&');
    expect(detail).toContain('보험 분석하기');
    expect(detail).not.toContain('보험 보장 범위 분석하기');
    expect(detail).toContain('href="/insurance"');
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
    expect(detail).toContain('불안하거나 두려워하는 행동으로 일상생활이 어려워 보임');
  });

  test('공개 상품 구매 제한 해제 마이그레이션은 상품과 옵션 재고를 함께 연다', () => {
    const migration = read('supabase/migrations/0105_unlock_visible_product_purchases.sql');
    expect(migration).toContain('where is_visible = true');
    expect(migration).toContain('stock = 999');
    expect(migration).toContain("jsonb_build_object('stock', 999)");
  });

  test('저장된 홈 설정의 브랜드 표기도 백조오브제로 갱신한다', () => {
    const migration = read('supabase/migrations/0107_baekjo_objet_display_name.sql');
    expect(migration).toContain('백조오브제는 그 과정까지 확인합니다.');
    expect(migration).toContain('검토 기준 자세히 보기');
    expect(migration).toContain("where id = 'home'");
  });

  test('브랜드 8개 표시 문구를 이름 변형과 무관하게 정규화한다', () => {
    const brandsPage = read('src/components/brands/BrandsContent.tsx');
    const brandCard = read('src/components/common/BrandCard.tsx');
    expect(brandsPage).toContain('/images/brands-hero-cat-architectural.png');
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

  test('써니사이드업 Audit 상세는 배송 안내 아래에서 공개된다', () => {
    const detail = read('src/app/brands/[id]/page.tsx');
    const migration = read('supabase/migrations/0094_sunny_side_up_audit_report.sql');
    expect(detail.indexOf('<BrandShippingInfo brand={brand} />')).toBeLessThan(detail.indexOf('<BrandAuditReport brand={brand} />'));
    expect(migration).toContain("'reportNo', 'BOA-2026-005'");
    expect(migration).toContain("'headline', '존중을 증명하는 기술'");
    expect(migration).toContain("'동물실험 대체 연구 방식'");
    expect(migration).toContain("'대표 제품인 애니마크 피부 연고는 반려동물이 핥는 상황까지 고려하여 개발되었습니다.");
  });

  test('오미프로 상세 제목은 제공된 가로 로고를 원본 비율로 표시한다', () => {
    const detail = read('src/app/brands/[id]/page.tsx');
    const migration = read('supabase/migrations/0095_omipro_wordmark_image.sql');
    expect(detail).toContain('b2: { width: 208, height: 48 }');
    expect(detail).toContain('h-[28px]');
    expect(migration).toContain("'/brands/omipro-wordmark-red.png'");
  });

  test('오미프로 브랜드 스토리는 연구와 직접 섭취 검증 내용을 표시한다', () => {
    const detail = read('src/app/brands/[id]/page.tsx');
    const migration = read('supabase/migrations/0096_omipro_brand_story.sql');
    expect(detail).toContain("brand.id === 'b2'");
    expect(detail).toContain("? '오미프로'");
    expect(migration).toContain('오미프로는 반려동물의 몸에서 일어나는 작은 변화까지 세심하게 살펴봅니다.');
    expect(migration).toContain('대표는 지금도 직접 제품을 섭취하며 스스로 경험하고 확인하는 일을 이어가고 있습니다.');
    expect(migration).toContain('사람이 섭취하는 천연 식품 원료를 사용한 제품 설계');
    expect(migration).toContain('제품의 적응 과정을 고려한 단계적 급여 설계');
  });

  test('페네핏 상세 제목은 영문 텍스트 대신 제공된 초록색 로고를 표시한다', () => {
    const detail = read('src/app/brands/[id]/page.tsx');
    const migration = read('supabase/migrations/0097_penefit_wordmark_image.sql');
    expect(detail).toContain('b1: { width: 123, height: 27 }');
    expect(detail).toContain('{presentation.displayName}</span>');
    expect(detail).toContain('brand.wordmarkImage || brand.logo');
    expect(detail).toContain('md:h-[32px] md:w-[178px]');
    expect(migration).toContain("'/brands/penefit-wordmark-green.png'");
  });

  test('메종슈슈 브랜드 스토리는 착용감과 패턴 설계 내용을 표시한다', () => {
    const detail = read('src/app/brands/[id]/page.tsx');
    const migration = read('supabase/migrations/0098_maison_chouchou_brand_story.sql');
    expect(detail).toContain("brand.id === 'b7'");
    expect(detail).toContain("? '메종슈슈'");
    expect(migration).toContain('그 옷을 편안하게 입고 움직이는 순간까지 중요하게 생각합니다.');
    expect(migration).toContain('체형과 움직임을 고려한 패턴 설계');
    expect(migration).toContain('제품 특성에 맞춰 선택한 소재와 신축성');
  });

  test('메종슈슈 Audit 요약은 완료 상태와 확정 검토 항목을 표시한다', () => {
    const detail = read('src/app/brands/[id]/page.tsx');
    const migration = read('supabase/migrations/0099_maison_chouchou_audit_points.sql');
    expect(detail).toContain("brand.id === 'b7'");
    expect(detail).toContain('title="백조오브제 검토 완료"');
    expect(detail).toContain("const auditStatusText = 'Audit Completed'");
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
    const migration = read('supabase/migrations/0100_maison_chouchou_audit_report.sql');
    expect(detail.indexOf('<BrandShippingInfo brand={brand} />')).toBeLessThan(detail.indexOf('<BrandAuditReport brand={brand} />'));
    expect(migration).toContain("'reportNo', 'BOA-2026-006'");
    expect(migration).toContain("'headline', '편안함으로 완성되는 아름다움의 기준'");
    expect(migration).toContain("'제품 디자인 및 패턴 설계'");
    expect(migration).toContain('쇼룸과 작업실에서는 반려견이 직접 피팅해 사이즈와 착용감을 확인할 수 있습니다.');
    expect(migration).toContain('메종슈슈를 BOA-2026-006 Audit 브랜드로 기록합니다.');
  });

  test('RE:펫 스토리와 Audit 요약은 맞춤 제작 및 완료 상태를 표시한다', () => {
    const detail = read('src/app/brands/[id]/page.tsx');
    const migration = read('supabase/migrations/0101_repet_story_and_audit_points.sql');
    expect(detail).toContain("brand.id === 'b6'");
    expect(detail).toContain("? 'RE : 펫'");
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

  test('모든 브랜드 상세의 Audit 상태는 완료로 통일한다', () => {
    const detail = read('src/app/brands/[id]/page.tsx');
    expect(detail).toContain("const auditStatusText = 'Audit Completed'");
    expect(detail).toContain('title="백조오브제 검토 완료"');
    expect(detail).toContain('아래 항목을 중심으로 검토를 완료하였습니다.');
    expect(detail).toContain('Audit 자세히 보기 <ArrowRight');
    expect(detail).not.toContain('백조오브제 검토 상태');
    expect(detail).not.toContain('꼼꼼히 확인하고 있습니다.');
  });

  test('RE:펫 Audit 상세는 PDF 내용을 배송 안내 아래에서 공개한다', () => {
    const detail = read('src/app/brands/[id]/page.tsx');
    const migration = read('supabase/migrations/0102_repet_audit_report.sql');
    expect(detail.indexOf('<BrandShippingInfo brand={brand} />')).toBeLessThan(detail.indexOf('<BrandAuditReport brand={brand} />'));
    expect(migration).toContain("'reportNo', 'BOA-2026-007'");
    expect(migration).toContain("'headline', '그리운 모습을 다시 마주하는 시간'");
    expect(migration).toContain("'작품 제작 관련 전문 자격'");
    expect(migration).toContain('반려동물 양모펠트 지도사 2급');
    expect(migration).toContain('RE:펫을 BOA-2026-007 Audit 브랜드로 기록합니다.');
  });

  test('B2B·보험 CTA와 RE:펫 결정 문서 연결이 정본과 일치한다', () => {
    const b2b = read('src/app/b2b/page.tsx');
    const brands = read('src/components/brands/BrandsContent.tsx');
    const insurance = read('src/app/insurance/page.tsx');
    const matrix = read('docs/baekjo-0827/source-matrix.md');
    expect(b2b).toContain('기준이 같다면, 함께 만들어갑니다.');
    expect(b2b).toContain('파트너십 문의하기');
    expect(brands).toContain('self-center items-center justify-center whitespace-nowrap');
    expect(brands).toContain('md:self-start');
    expect(insurance).toContain('보험 분석 시작하기');
    expect(matrix).not.toMatch(/BRAND-REPET, AUDIT-01, DEC-003/);
    expect(matrix.match(/BRAND-REPET, AUDIT-01, DEC-004/g)).toHaveLength(3);
  });
});
