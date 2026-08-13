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
});
