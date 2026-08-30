import { test, expect } from '@playwright/test';
import { normalizeBrandAlias } from '@/lib/brands/alias';

test.describe('입점 브랜드 별칭 매칭', () => {
  test('공백·괄호·하이픈을 제거하고 대소문자를 무시한다', () => {
    expect(normalizeBrandAlias(' 페네핏 (PENEFIT) ')).toBe('페네핏penefit');
    expect(normalizeBrandAlias('Maison-Chouchou')).toBe('maisonchouchou');
  });

  test('빈 입력은 매칭 가능한 별칭이 아니다', () => {
    expect(normalizeBrandAlias('   ')).toBe('');
  });

  test('기존 8개 브랜드의 대표 별칭은 충돌 없이 정규화된다', () => {
    const aliases = [
      '페네핏 (PENEFIT)',
      '오미프로 (OMIPRO)',
      '노블독 (NobleDog)',
      '캣코드 (Catcode)',
      '알로밍 (ALLOMING)',
      're펫',
      '메종슈슈 (Maison Chouchou)',
      '챠콜스토리 (Charcoal Story)',
    ];
    expect(new Set(aliases.map(normalizeBrandAlias)).size).toBe(8);
  });
});
