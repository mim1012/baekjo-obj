import { test, expect } from '@playwright/test';
import { defaultHomeSettings, normalizeHomeSettings } from '../../src/data/homeContent';

test.describe('홈 쇼핑 카테고리 설정', () => {
  test('기본 설정은 요청된 6개 항목만 가진다', () => {
    expect(defaultHomeSettings.quickShop.title).toBe('');
    expect(defaultHomeSettings.quickShop.links.map((link) => link.name)).toEqual([
      '강아지',
      '고양이',
      '소동물',
      '사료·간식',
      '위생·배변',
      '건강관리',
    ]);
  });

  test('기존 9개 저장 배열은 전체 상품을 제외하고 기존 문구를 보존한다', () => {
    const normalized = normalizeHomeSettings({
      quickShop: {
        links: [
          { name: '전체 상품' },
          { name: '강아지 맞춤' },
          { name: '고양이 맞춤' },
          { name: '소동물 맞춤' },
          { name: '사료 간식 맞춤' },
          { name: '위생 배변 맞춤' },
          { name: '건강관리 맞춤' },
          { name: '고민별 케어' },
          { name: '브랜드관' },
        ],
      },
    });

    expect(normalized.quickShop.links.map((link) => link.name)).toEqual([
      '강아지 맞춤',
      '고양이 맞춤',
      '소동물 맞춤',
      '사료 간식 맞춤',
      '위생 배변 맞춤',
      '건강관리 맞춤',
    ]);
  });

  test('소동물이 없던 기존 9개 저장 배열에는 기본 소동물을 삽입한다', () => {
    const normalized = normalizeHomeSettings({
      quickShop: {
        links: [
          { name: '전체 상품' },
          { name: '강아지' },
          { name: '고양이' },
          { name: '사료·간식' },
          { name: '위생·배변' },
          { name: '건강관리' },
          { name: '고민별 케어' },
          { name: '브랜드관' },
          { name: '브랜드관' },
        ],
      },
    });

    expect(normalized.quickShop.links.map((link) => link.name)).toEqual([
      '강아지',
      '고양이',
      '소동물',
      '사료·간식',
      '위생·배변',
      '건강관리',
    ]);
  });

  test('이전 6개 저장 배열에는 소동물을 삽입하고 고민별 케어를 제거한다', () => {
    const normalized = normalizeHomeSettings({
      quickShop: {
        links: [
          { name: '강아지' },
          { name: '고양이' },
          { name: '사료·간식' },
          { name: '위생·배변' },
          { name: '건강관리' },
          { name: '고민별 케어' },
        ],
      },
    });

    expect(normalized.quickShop.links.map((link) => link.name)).toEqual([
      '강아지',
      '고양이',
      '소동물',
      '사료·간식',
      '위생·배변',
      '건강관리',
    ]);
  });

  test('2026-08-14 HWPX의 홈 문구를 기본 설정에 반영한다', () => {
    expect(defaultHomeSettings.hero.descriptionLines).toEqual([
      '좋은 브랜드는 결과입니다. 백조오브제는 그 과정까지 확인합니다.',
    ]);
    expect(defaultHomeSettings.hero.trustNote).toBe('백조오브제 Audit을 통과한 브랜드만 소개합니다.');
    expect(defaultHomeSettings.curation.title).toBe('우리 아이 고민에 맞는 케어 가이드');
    expect(defaultHomeSettings.curation.description).toBe(
      '우리 아이는 매일 작은 신호를 보냅니다. 그 신호를 이해하는 것부터 케어는 시작됩니다.',
    );
    expect(defaultHomeSettings.audit.criteria).toEqual([
      { title: '브랜드 철학', desc: '브랜드가 추구하는 가치를 확인합니다.' },
      { title: '성분·원료', desc: '성분과 원료를 확인합니다.' },
      { title: '제조 과정', desc: '제품이 만들어지는 과정을 확인합니다.' },
      { title: '사용 경험', desc: '실제 보호자의 경험을 확인합니다.' },
    ]);
    expect(defaultHomeSettings.solutions.cards[2]?.linkLabel).toBe('보험 분석 시작하기');
    expect(defaultHomeSettings.insuranceBanner.buttonLabel).toBe('보험 분석 시작하기');
  });
});
