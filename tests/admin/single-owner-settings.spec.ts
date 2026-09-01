import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');
const src = (...segments: string[]) => fs.readFileSync(path.join(root, ...segments), 'utf8');

test.describe('관리자 중복 설정 방지', () => {
  test('상품 노출·추천·베스트는 상품 진열만 수정한다', () => {
    const form = src('src', 'components', 'admin-new', 'products', 'ProductForm.tsx');
    const list = src('src', 'components', 'admin-new', 'products', 'AdminProductsClient.tsx');
    const display = src('src', 'components', 'admin-new', 'products', 'ProductDisplayManager.tsx');
    const payload = src('src', 'lib', 'products', 'formPayload.ts');

    expect(form).not.toContain('<SectionCard title="노출 상태">');
    expect(form).not.toMatch(/handleChange\('(isVisible|isBest|isRecommended)'/);
    expect(list).not.toContain('performBulkUpdate');
    expect(display).toContain("field: 'isBest' | 'isRecommended' | 'isVisible'");
    expect(display).toContain("label: '베스트 상품'");
    expect(display).toContain("label: '추천 상품 (MD)'");
    expect(display).toContain("label: '스토어 노출 상태'");
    expect(display).toContain('이 화면 한 곳에서만 변경합니다.');
    expect(display).toContain("label: '홈 추천 상품 순서'");
    expect(display).toContain("label: '스토어 추천 상품 순서'");
    expect(display).toContain("label: '스토어 전체 상품 기본 순서'");
    expect(display).toContain('이 상품이 어디에 보이는지 먼저 확인하세요');
    expect(display).toContain('선택한 화면의 순서만 바뀌며 다른 화면 순서는 바뀌지 않습니다.');

    const updateBuilder = payload.slice(
      payload.indexOf('export function buildProductUpdatePayload('),
      payload.indexOf('export function buildProductCreatePayload('),
    );
    expect(updateBuilder).not.toContain('isVisible');
    expect(updateBuilder).not.toContain('isBest');
    expect(updateBuilder).not.toContain('isRecommended');
  });

  test('기존 브랜드는 전체 수정 화면만 변경하고 목록은 상태만 보여준다', () => {
    const list = src('src', 'app', 'admin', 'brands', 'page.tsx');
    const create = src('src', 'components', 'admin-new', 'brands', 'BrandForm.tsx');
    const detail = src('src', 'components', 'admin-new', 'brands', 'BrandDetailEditor.tsx');

    expect(list).not.toContain('handleToggleVisible');
    expect(list).not.toContain('handleEdit');
    expect(list).not.toContain('빠른 수정');
    expect(create).not.toContain('updateBrand');
    expect(detail).toContain('updateBrand');
    expect(list).toContain('전체 수정');
  });

  test('이름이 비슷해도 공개 연결 위치가 다른 태그·고민 관리는 유지한다', () => {
    expect(fs.existsSync(path.join(root, 'src', 'app', 'admin', 'products', 'tags', 'page.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'src', 'app', 'admin', 'concerns', 'page.tsx'))).toBe(true);
  });
});
