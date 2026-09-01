export interface ProductImageFields {
  image: string;
  images: string[];
}

/**
 * 관리자에서는 대표 이미지와 추가 이미지를 한 줄의 순서로 보여준다.
 * 첫 번째 값은 공개 상품 카드와 상세 첫 화면의 대표 이미지다.
 */
export function toOrderedProductImages(image: string | undefined, images: string[] | undefined): string[] {
  return [image ?? '', ...(images ?? [])];
}

/** 한 줄로 편집한 순서를 기존 DB 필드(image + images)로 다시 나눈다. */
export function toProductImageFields(orderedImages: string[]): ProductImageFields {
  const [image = '', ...images] = orderedImages;
  return { image, images };
}

export function moveProductImage(orderedImages: string[], index: number, direction: -1 | 1): string[] {
  const target = index + direction;
  if (index < 0 || index >= orderedImages.length || target < 0 || target >= orderedImages.length) {
    return orderedImages;
  }

  const next = [...orderedImages];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function promoteProductImage(orderedImages: string[], index: number): string[] {
  if (index <= 0 || index >= orderedImages.length) return orderedImages;
  return [orderedImages[index], ...orderedImages.slice(0, index), ...orderedImages.slice(index + 1)];
}
