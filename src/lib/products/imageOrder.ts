// 상품 이미지 순서 편집 순수 헬퍼 — DB·컴포넌트 의존 없음(tests/products/product-image-order.spec.ts).
// 관리자 폼은 대표 이미지(image)와 추가 이미지(images)를 한 줄의 순서(ordered[0] → image, 나머지 →
// images)로 보여준다. 이 파일은 그 변환·이동·대표 지정 로직만 담당하고, 실제 폼 상태 연결은
// ProductForm.tsx/formPayload.ts(U5)가 담당한다 — 여기서는 절대 그 파일들을 참조하지 않는다.

/** DB에 저장되는 두 필드(대표 이미지 1장 + 나머지 이미지 목록). */
export interface ProductImageFields {
  image: string;
  images: string[];
}

/** 항목이 실제 값을 담고 있는지(공백만 있는 문자열은 빈 것으로 취급). */
function hasContent(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * 대표 이미지(image)와 추가 이미지(images)를 한 줄의 순서로 합친다.
 * 공백뿐이거나 빈 문자열 항목은 제거하고, 값이 있는 항목은 원문 그대로(trim 하지 않고) 보존한다
 * — 순서 편집 중에는 어떤 유효한 항목도 잃지 않아야 한다.
 */
export function normalizeImageOrder(
  image: string | undefined,
  images: string[] | undefined,
): string[] {
  const combined = [image, ...(images ?? [])];
  return combined.filter(hasContent);
}

/** ordered[0] → image, 나머지 → images 로 되돌린다(입력 배열은 변형하지 않는다). */
function toProductImageFields(ordered: string[]): ProductImageFields {
  const [image = '', ...images] = ordered;
  return { image, images };
}

/**
 * index 위치의 이미지를 한 칸 위(direction='up') 또는 아래(direction='down')로 옮긴다.
 * index 또는 이동 대상이 배열 범위를 벗어나면 아무 변화 없이 원본과 같은 내용을 반환한다
 * (입력 배열 자체는 절대 변형하지 않는다).
 */
export function moveImage(ordered: string[], index: number, direction: 'up' | 'down'): string[] {
  const target = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || index >= ordered.length || target < 0 || target >= ordered.length) {
    return [...ordered];
  }

  const next = [...ordered];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/**
 * index 위치의 이미지를 새 대표(image)로 지정하고, 나머지 항목은 원래 상대 순서를 보존한 채
 * images 로 되돌려준다. index 가 이미 대표(0)이거나 범위를 벗어나면 현재 순서를 그대로 나눈
 * 결과를 반환한다(입력 배열은 변형하지 않는다) — 그래서 index=0 호출은 순수 분리(split) 용도로도
 * 쓸 수 있다.
 */
export function setRepresentative(ordered: string[], index: number): ProductImageFields {
  if (index <= 0 || index >= ordered.length) {
    return toProductImageFields(ordered);
  }

  const promoted = [ordered[index], ...ordered.slice(0, index), ...ordered.slice(index + 1)];
  return toProductImageFields(promoted);
}
