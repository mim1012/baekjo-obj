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
