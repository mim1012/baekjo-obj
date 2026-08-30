import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

test('고민 상세는 추천 브랜드 구역과 브랜드 조회 기능을 포함하지 않는다', () => {
  const source = fs.readFileSync(path.join(root, 'src', 'app', 'concerns', '[slug]', 'page.tsx'), 'utf8');

  for (const removedCopy of [
    '이 고민과 함께 살펴볼 브랜드',
    '모든 브랜드 보기',
    '추천 브랜드 가로 스크롤',
    'recommendedBrands',
    'listCachedPublicBrands',
    'BrandLogo',
    'formatBrandDisplayName',
    'id="brands"',
  ]) {
    expect(source, `${removedCopy}가 고민 상세 소스에 남아 있습니다.`).not.toContain(removedCopy);
  }

  expect(source).toContain('일상 관리에 함께 볼 상품');
  expect(source).toContain('많이 궁금해하시는 점');
  expect(source).toContain('const allProducts = await listCachedPublicProducts();');
});
