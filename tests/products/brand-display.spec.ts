import { test, expect } from '@playwright/test';
import { getBrandDisplayTags } from '../../src/lib/brands/display';

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
});
