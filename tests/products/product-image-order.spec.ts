import { test, expect } from '@playwright/test';
import { moveImage, normalizeImageOrder, setRepresentative } from '@/lib/products/imageOrder';

// imageOrder 순수 헬퍼 회귀 스펙 — 브라우저·DB·네트워크 불필요.
// 관리자 상품 폼은 image(대표)/images(추가)를 한 줄의 순서로 보여주고 편집한다:
// ordered[0] → image, 나머지 → images. 이 스펙은 그 변환·이동·대표 지정만 검증한다
// (ProductForm.tsx 실제 화면 문구·조작 UI 검증은 U5 유닛에서 폼을 연결한 뒤 별도로 다룬다).
test.describe('imageOrder — 상품 대표 이미지 순서', () => {
  test('기존 image/images 는 손실 없이 정규화되어 다시 나뉜다(round-trip)', () => {
    const ordered = normalizeImageOrder('main.jpg', ['detail-1.jpg', 'detail-2.jpg']);
    expect(ordered).toEqual(['main.jpg', 'detail-1.jpg', 'detail-2.jpg']);
    expect(setRepresentative(ordered, 0)).toEqual({
      image: 'main.jpg',
      images: ['detail-1.jpg', 'detail-2.jpg'],
    });
  });

  test('대표 이미지를 아래로 이동하면 다음 사진이 새 대표가 된다', () => {
    const ordered = normalizeImageOrder('main.jpg', ['detail-1.jpg', 'detail-2.jpg']);
    const moved = moveImage(ordered, 0, 'down');
    expect(setRepresentative(moved, 0)).toEqual({
      image: 'detail-1.jpg',
      images: ['main.jpg', 'detail-2.jpg'],
    });
  });

  test('추가 이미지 하나를 대표로 지정하면 새 대표를 반영하고 나머지 순서를 보존한다', () => {
    const ordered = normalizeImageOrder('main.jpg', ['detail-1.jpg', 'detail-2.jpg']);
    const result = setRepresentative(ordered, 2);
    expect(result).toEqual({
      image: 'detail-2.jpg',
      images: ['main.jpg', 'detail-1.jpg'],
    });
  });

  test('범위를 벗어나는 이동은 아무 변화 없이 그대로 반환된다(no-op)', () => {
    const ordered = normalizeImageOrder('main.jpg', ['detail-1.jpg', 'detail-2.jpg']);
    expect(moveImage(ordered, 0, 'up')).toEqual(ordered);
    expect(moveImage(ordered, ordered.length - 1, 'down')).toEqual(ordered);
    expect(moveImage(ordered, -1, 'up')).toEqual(ordered);
    expect(moveImage(ordered, ordered.length + 5, 'down')).toEqual(ordered);
  });

  test('범위를 벗어나는 대표 지정도 아무 변화 없이 현재 순서를 그대로 나눈다(no-op)', () => {
    const ordered = normalizeImageOrder('main.jpg', ['detail-1.jpg', 'detail-2.jpg']);
    const expected = { image: 'main.jpg', images: ['detail-1.jpg', 'detail-2.jpg'] };
    expect(setRepresentative(ordered, -1)).toEqual(expected);
    expect(setRepresentative(ordered, ordered.length)).toEqual(expected);
  });

  test('공백/빈 문자열 항목은 제거되고 값이 있는 항목은 모두 보존된다', () => {
    const ordered = normalizeImageOrder('   ', ['detail-1.jpg', '', '   ', 'detail-2.jpg']);
    expect(ordered).toEqual(['detail-1.jpg', 'detail-2.jpg']);
  });

  test('image 와 images 가 모두 비어 있으면 빈 배열을 반환한다', () => {
    expect(normalizeImageOrder(undefined, undefined)).toEqual([]);
    expect(normalizeImageOrder('', [])).toEqual([]);
  });

  test('moveImage 와 setRepresentative 는 입력 배열을 변형하지 않는다', () => {
    const original = ['main.jpg', 'detail-1.jpg', 'detail-2.jpg'];
    const snapshot = [...original];

    moveImage(original, 0, 'down');
    moveImage(original, 0, 'up');
    setRepresentative(original, 2);
    setRepresentative(original, -1);

    expect(original).toEqual(snapshot);
  });
});

// ProductForm.tsx + ProductImageOrderEditor 합성 시나리오 회귀 방지.
// ProductForm은 orderedImages를 normalizeImageOrder(빈 문자열 제거)가 아니라 비파괴 병합
// [image ?? '', ...images]로 계산한다 — normalizeImageOrder를 썼을 때는 "이미지 추가"가 만든
// 빈 슬롯이 다음 렌더에서 걸러져 사라져, 그 슬롯의 업로더가 렌더되지 않고 두 번째 업로드가
// 인덱스 0(대표)을 덮어쓰는 회귀가 있었다(admin-crud-product-fields.spec.ts,
// admin-crud-product-gallery-removal.spec.ts 골든플로우에서 실측). 이 스펙은 그 합성 흐름을
// (setRepresentative만으로) 재현해 대표가 바뀌지 않고 images가 2개로 늘어나는지 검증한다.
test.describe('ProductForm 합성 시나리오 — 비파괴 병합(orderedImages) 왕복', () => {
  test('신규 상품: 대표 업로드 → 이미지 추가 → 두 번째 업로드 → images 2개, 대표 교체 없음', () => {
    let image = '';
    let images: string[] = [];

    // ProductForm.handleOrderedImagesChange와 동일: 항상 setRepresentative(next, 0)만 쓴다.
    const setFields = (next: string[]) => {
      const fields = setRepresentative(next, 0);
      image = fields.image;
      images = fields.images;
    };
    // ProductForm의 orderedImages 계산과 동일한 비파괴 병합(정규화로 빈 문자열을 걸러내지 않음).
    const ordered = () => [image, ...images];

    // 1) 신규 상품 — 대표 placeholder 1행만 있다.
    expect(ordered()).toEqual(['']);

    // 2) 대표 이미지 업로드 — ProductImageOrderEditor.update(0, url).
    setFields(ordered().map((v, i) => (i === 0 ? 'main.png' : v)));
    expect(ordered()).toEqual(['main.png']);

    // 3) "이미지 추가" 클릭 — ProductImageOrderEditor.add(): 빈 슬롯이 끝에 붙고,
    //    비파괴 병합이므로 다음 렌더에서도 사라지지 않아야 한다.
    setFields([...ordered(), '']);
    expect(ordered()).toEqual(['main.png', '']);

    // 4) 방금 추가된(두 번째) 슬롯에 업로드 — update(1, url). 대표(인덱스 0)는 그대로여야 한다.
    setFields(ordered().map((v, i) => (i === 1 ? 'gallery.png' : v)));
    expect(ordered()).toEqual(['main.png', 'gallery.png']);
    expect(image).toBe('main.png');
    expect(images).toEqual(['gallery.png']);
  });
});
