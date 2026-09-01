import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  moveProductImage,
  promoteProductImage,
  toOrderedProductImages,
  toProductImageFields,
} from '../../src/lib/products/imageOrder';

test.describe('상품 대표 이미지 순서', () => {
  test('대표 이미지와 추가 이미지를 한 순서로 합치고 다시 DB 필드로 나눈다', () => {
    const ordered = toOrderedProductImages('main.jpg', ['detail-1.jpg', 'detail-2.jpg']);
    expect(ordered).toEqual(['main.jpg', 'detail-1.jpg', 'detail-2.jpg']);
    expect(toProductImageFields(ordered)).toEqual({
      image: 'main.jpg',
      images: ['detail-1.jpg', 'detail-2.jpg'],
    });
  });

  test('대표 이미지를 아래로 이동하면 다음 사진이 새 대표가 된다', () => {
    const moved = moveProductImage(['main.jpg', 'detail-1.jpg', 'detail-2.jpg'], 0, 1);
    expect(toProductImageFields(moved)).toEqual({
      image: 'detail-1.jpg',
      images: ['main.jpg', 'detail-2.jpg'],
    });
  });

  test('원하는 추가 이미지를 바로 대표로 지정하고 나머지 순서를 보존한다', () => {
    const promoted = promoteProductImage(['main.jpg', 'detail-1.jpg', 'detail-2.jpg'], 2);
    expect(toProductImageFields(promoted)).toEqual({
      image: 'detail-2.jpg',
      images: ['main.jpg', 'detail-1.jpg'],
    });
  });

  test('관리 화면은 1번 대표 안내와 순서 변경 조작을 명확히 제공한다', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src', 'components', 'admin-new', 'products', 'ProductForm.tsx'),
      'utf8',
    );
    expect(source).toContain('1번 사진이 상품 카드와 상품 상세 첫 화면의 대표 이미지입니다.');
    expect(source).toContain('대표로 지정');
    expect(source).toContain('번 이미지 위로 이동');
    expect(source).toContain('번 이미지 아래로 이동');
  });
});
