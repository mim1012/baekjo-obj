import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function source(...segments: string[]): string {
  return fs.readFileSync(path.join(root, ...segments), 'utf8');
}

test('product detail editor exposes clear block insertion and multi-image upload controls', () => {
  const editor = source('src', 'components', 'admin-new', 'products', 'ProductDetailEditor.tsx');
  const form = source('src', 'components', 'admin-new', 'products', 'ProductForm.tsx');

  expect(editor).toContain('multiple');
  expect(editor).toContain('handleBulkImageUpload');
  expect(editor).toContain('여러 이미지');
  expect(editor).toContain('여기에 텍스트 추가');
  expect(editor).toContain('여기에 이미지 추가');
  expect(editor).toContain('`텍스트 ${counts.text + 1}`');
  expect(editor).toContain('`이미지 ${counts.image + 1}`');
  expect(form).toContain('상세페이지 본문 편집하기');
  // PR3: 대표 이미지(1장)와 추가 이미지 갤러리가 하나의 이미지 순서 UI로 합쳐지며 안내 문구도
  // "1번=대표" 설명으로 바뀌었다(구 문구 '상세 상단 갤러리용 이미지입니다.'는 제거됨).
  expect(form).toContain('1번 사진이 상품 카드와 상품 상세 첫 화면의 대표 이미지입니다.');
});
