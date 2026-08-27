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
    for (const label of ['셀렉션', '브랜드', '케어', '펫보험', '백조 오브제', 'B2B']) {
      expect(header, `${label} 메뉴`).toContain(label);
    }
    for (const submenu of ['검증 기준', '전문가 칼럼', '보호자 후기', '소식']) {
      expect(header).toContain(submenu);
    }
    expect(footer).toContain('@BAEKJO OBJET');
    expect(footer).toContain("label: '배송·교환·환불'");
    expect(footer).not.toContain('PET LIFE CURATION');
  });

  test('홈 핵심 카피와 추천 상품 상한이 정본과 일치한다', () => {
    const home = read('src/components/home/HomeClient.tsx');
    expect(defaultHomeSettings.hero.eyebrow).toBe('Curated Pet Brands');
    expect(defaultHomeSettings.hero.titleLines.join(' ')).toBe('좋은 브랜드를 찾고 계셨나요?');
    expect(defaultHomeSettings.hero.descriptionLines).toEqual([
      '좋은 브랜드는 결과입니다. 백조 오브제는 그 과정까지 확인합니다.',
    ]);
    expect(defaultHomeSettings.hero.trustNote).toBe('백조오브제 Audit을 통과한 브랜드만 소개합니다.');
    expect(defaultHomeSettings.insuranceBanner.description).toBe(
      '같은 품종이라도, 나이와 기왕력에 따라 우리 아이에게 맞는 보험은 달라집니다.',
    );
    expect(defaultHomeSettings.insuranceBanner.buttonLabel).toBe('보험 분석 시작하기');
    expect(home).toContain(".slice(0, 3)");
    expect(home).toContain('보호자 후기');
    expect(home).toContain('소식');
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
    for (const label of ['2만원 미만', '2-5만원', '5-10만원', '10만원 이상']) {
      expect(shop).toContain(label);
    }
    expect(shop).toContain('소동물');
    expect(shop).not.toContain('title="연령"');
    expect(shop).toContain('DAILY PICK');
    expect(shop).not.toContain('지금 백조오브제가 가장 주목하는 제품');
    expect(shop).not.toContain('조건을 조금 넓혀 다시 살펴볼까요?');
    expect(shop).toContain('필터 초기화');
    expect(productCard).not.toContain('SELECTED');
    expect(productCard).not.toContain('잠시 품절');
    expect(productCard).toContain('product.reviewCount > 0');
  });

  test('눈물 케어 문구와 신호 목록이 정본과 일치한다', () => {
    const detail = read('src/app/concerns/[slug]/page.tsx');
    const tear = defaultConcernsConfig.items.find((concern) => concern.slug === 'tear');
    expect(tear?.symptoms).toEqual([
      '갈색·적갈색 자국', '눈물 양 증가', '눈 주변 털 축축함',
      '노란 눈곱', '눈 비빔·긁음', '한쪽 눈물 증가',
    ]);
    expect(detail).toContain('눈물 자국, 닦아주는 것만으로 충분할까요?');
    expect(detail).toContain('매일 닦아도 반복된다면, 관리 방법부터 다시 살펴볼 필요가 있어요.');
    for (const sign of [
      '심한 충혈·부음', '노란색·녹색 눈곱 지속', '눈을 잘 못 뜸·찡그림',
      '반복적인 심한 비빔·긁음', '눈이 뿌옇게 보임', '눈 또는 눈꺼풀 상처',
    ]) {
      expect(detail).toContain(sign);
    }
  });

  test('브랜드 8개 표시 문구를 이름 변형과 무관하게 정규화한다', () => {
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

  test('B2B·보험 CTA와 RE:펫 결정 문서 연결이 정본과 일치한다', () => {
    const b2b = read('src/app/b2b/page.tsx');
    const insurance = read('src/app/insurance/page.tsx');
    const matrix = read('docs/baekjo-0827/source-matrix.md');
    expect(b2b).toContain('기준이 같다면, 함께 만들어갑니다.');
    expect(b2b).toContain('파트너십 문의하기');
    expect(insurance).toContain('보험 분석 시작하기');
    expect(matrix).not.toMatch(/BRAND-REPET, AUDIT-01, DEC-003/);
    expect(matrix.match(/BRAND-REPET, AUDIT-01, DEC-004/g)).toHaveLength(3);
  });
});
