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

  // 2026-09-15 회귀 #1: 통합 이미지 순서 편집기가 images를 그대로 map하면, 신규 상품(images=[])일
  // 때 대표 이미지 <input type="file">가 화면에 하나도 렌더되지 않아 필수 대표 이미지를 올릴
  // 방법이 없었다(golden admin-crud-products.spec.ts/admin-crud-product-gallery-removal.spec.ts
  // 회귀). 최초 수정은 ProductImageOrderEditor 안에 로컬 placeholder(rows) 폴백을 뒀지만, 그
  // 폴백은 대표가 이미 채워진 뒤 "이미지 추가"가 만드는 빈 슬롯까지는 못 지켜줬다(회귀 #2).
  //
  // 2026-09-15 회귀 #2: ProductForm이 orderedImages를 normalizeImageOrder(빈 문자열 제거)로
  // 계산하면, "이미지 추가"가 images에 붙인 빈 슬롯이 다음 렌더에서 걸러져 사라진다 — 그 슬롯의
  // 업로더가 렌더되지 않으니 두 번째 업로드가 인덱스 0(대표)을 덮어써 대표가 바뀌는 결함이 났다
  // (admin-crud-product-fields.spec.ts/admin-crud-product-gallery-removal.spec.ts 실측).
  // 최종 수정: 대표 슬롯 폴백과 "빈 슬롯 유지"를 모두 ProductForm의 비파괴 병합
  // ([image, ...images], 정규화 없음)으로 해결한다 — 편집기는 images를 그대로 rows로 그리기만
  // 하면 된다.
  test('orderedImages는 정규화 없이 비파괴 병합해, 대표 placeholder와 "이미지 추가" 빈 슬롯을 모두 다음 렌더까지 보존한다', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src', 'components', 'admin-new', 'products', 'ProductForm.tsx'),
      'utf8',
    );
    expect(source).toContain("const orderedImages = [formData.image ?? '', ...images];");
    expect(source).not.toContain('normalizeImageOrder(formData.image, images)');
    expect(source).toContain('const rows = images;');
    expect(source).toContain('{rows.map((img, idx) => (');
  });
});

// 2026-09-15 회귀: 고민 태그 칩이 상태 마커를 텍스트로 붙여("✓ 피부"/"+ 피부") 접근성 이름이
// 라벨과 달라지면 golden admin-crud-product-fields.spec.ts의
// getByRole('button', { name: '피부', exact: true })가 선택 전/후 모두 못 찾는다. 칩의 접근성
// 이름은 aria-label로 라벨 그대로 고정하고, 마커는 aria-hidden으로 감춰 시각 정보와 접근성
// 이름을 분리해야 한다(선택 여부는 텍스트가 아니라 aria-pressed로 판별).
test.describe('ProductForm — 고민 태그 칩 접근성 이름 회귀 방지', () => {
  test('태그 칩은 aria-label로 라벨 그대로를 노출하고 상태 마커는 aria-hidden으로 감춘다', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src', 'components', 'admin-new', 'products', 'ProductForm.tsx'),
      'utf8',
    );
    expect(source).toContain('aria-label={tag.label}');
    expect(source).toContain('<span aria-hidden="true">{selected ? \'✓ \' : \'+ \'}</span>');
  });
});
