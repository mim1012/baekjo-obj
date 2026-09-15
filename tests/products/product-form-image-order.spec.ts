import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// ProductForm.tsx가 실제로 통합 이미지 순서 UI(1번=대표, 위/아래 이동, 대표로 지정)를
// 제공하는지 소스 문구를 grep으로 잠근다 — imageOrder.ts 자체 로직은
// tests/products/product-image-order.spec.ts가 순수 함수로 검증하고, 이 스펙은 그 로직이
// ProductForm 화면에 실제로 연결돼 안내 문구·조작 버튼이 남아있는지만 확인한다(마크업 리팩터
// 중 안내 문구가 조용히 사라지는 회귀 방지).
test.describe('ProductForm — 상품 이미지 순서 UI 문구 회귀 방지', () => {
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
