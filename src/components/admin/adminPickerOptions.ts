import type { Brand, Product } from '@/types';
import type { AdminIdPickerOption } from './AdminIdMultiPicker';

/**
 * 관리자 추천 상품/브랜드 선택 드롭다운의 옵션을 만든다. concerns·survey 두 화면이 동일한
 * 라벨/서브라벨 규약을 쓰도록 한곳에 모아 드리프트를 막는다(§4).
 * 상품 서브라벨은 "브랜드명 · id" — 이름이 같은 상품을 브랜드로 구분하고 레거시 id 도 보이게 한다.
 */
export function buildProductOptions(products: Product[], brands: Brand[]): AdminIdPickerOption[] {
  const brandNameById = new Map(brands.map((brand) => [brand.id, brand.name]));
  return products.map((product) => {
    const brandName = product.brandName ?? brandNameById.get(product.brandId) ?? product.brandId;
    return {
      id: product.id,
      label: product.name,
      sublabel: `${brandName} · ${product.id}`,
      // isVisible 이 명시적으로 false 일 때만 숨김 — 미지정(undefined)은 노출로 본다.
      isHidden: product.isVisible === false,
    };
  });
}

/** 브랜드 선택 옵션 — 라벨=브랜드명, 서브라벨=id. */
export function buildBrandOptions(brands: Brand[]): AdminIdPickerOption[] {
  return brands.map((brand) => ({
    id: brand.id,
    label: brand.name,
    sublabel: brand.id,
    isHidden: brand.isVisible === false,
  }));
}
