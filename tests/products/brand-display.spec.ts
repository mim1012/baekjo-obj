import { test, expect } from '@playwright/test';
import { getBrandDisplayTags } from '../../src/lib/brands/display';
import { getBrandPresentation } from '../../src/lib/brands/presentation';

test.describe('브랜드 카드 표시 태그', () => {
  test('HWPX에서 지정한 표시 태그를 우선한다', () => {
    expect(
      getBrandDisplayTags({
        displayTags: ['그루밍/케어'],
        relatedConcernSlugs: ['skin'],
      }),
    ).toEqual(['그루밍/케어']);
  });

  test('표시 태그가 없는 기존 브랜드는 기존 고민 라벨을 유지한다', () => {
    expect(
      getBrandDisplayTags({
        relatedConcernSlugs: ['oral'],
      }),
    ).toEqual(['구강/위생']);
  });

  test('브랜드별 기본 카드 태그가 최종 운영 태그와 일치한다', () => {
    const expectedTags = [
      ['노블독', '구강/위생'],
      ['알로밍', '그루밍/케어'],
      ['오미프로', '장/뼈건강'],
      ['페네핏', '영양/간식'],
      ['써니사이드업', '케어/라이프'],
      ['챠콜스토리', '탈취/위생'],
      ['RE:펫', '펫로스/오브제'],
      ['메종슈슈', '의류/패션'],
    ] as const;

    for (const [name, tag] of expectedTags) {
      expect(getBrandPresentation({ name, description: '' }).cardTags).toBe(tag);
    }
  });
});
