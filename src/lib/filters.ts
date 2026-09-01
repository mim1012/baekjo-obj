import { Product } from '@/types';
import { normalizeShopCategory } from '@/data/shopFilters';
import { hasManagedProductOrder, sortByManagedProductOrder } from '@/lib/products/displayOrder';
import { productSupportsPetType } from '@/lib/products/petTypes';

export function filterProducts(
  products: Product[],
  filters: {
    petType?: string;
    category?: string;
    lifestyleCategory?: string;
    concern?: string;
    brandId?: string;
    ageGroup?: string;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    search?: string;
  }
): Product[] {
  return products.filter((p) => {
    if (
      filters.petType &&
      filters.petType !== 'all' &&
      !productSupportsPetType(p.petType, filters.petType)
    ) return false;
    if (
      filters.category &&
      filters.category !== 'all' &&
      normalizeShopCategory(p.categorySlug ?? p.category) !== normalizeShopCategory(filters.category)
    ) return false;
    if (
      filters.lifestyleCategory &&
      filters.lifestyleCategory !== 'all' &&
      normalizeShopCategory(p.categorySlug ?? p.lifestyleCategory) !== normalizeShopCategory(filters.lifestyleCategory)
    ) return false;
    if (filters.concern && filters.concern !== 'all' && !p.concernTags.includes(filters.concern)) return false;
    if (filters.brandId && filters.brandId !== 'all' && p.brandId !== filters.brandId) return false;
    if (filters.ageGroup && filters.ageGroup !== 'all' && p.ageGroup !== filters.ageGroup && p.ageGroup !== 'all') return false;
    if (filters.minPrice && (p.salePrice ?? p.price ?? 0) < filters.minPrice) return false;
    if (filters.maxPrice && (p.salePrice ?? p.price ?? Infinity) > filters.maxPrice) return false;
    if (filters.minRating && p.rating < filters.minRating) return false;
    if (filters.search) {
      const normalizeSearchText = (value: string) => value.toLocaleLowerCase('ko-KR').replace(/[\s:·()[\]_-]+/g, '');
      const q = normalizeSearchText(filters.search);
      const searchableText = [
        p.name,
        p.brandName ?? '',
        p.description,
        p.category,
        p.categoryName ?? '',
        p.categorySlug ?? '',
        ...(p.tags ?? []),
        ...p.concernTags,
      ].join(' ');
      const normalizedSearchableText = normalizeSearchText(searchableText);
      if (!normalizedSearchableText.includes(q)) return false;
    }
    return true;
  });
}

export type SortOption = 'recommended' | 'popular' | 'newest' | 'reviews' | 'price-low' | 'price-high';

export function sortProducts(products: Product[], sort: SortOption): Product[] {
  const sorted = [...products];
  switch (sort) {
    case 'popular':
      return sorted.sort((a, b) => (b.rating * b.reviewCount) - (a.rating * a.reviewCount));
    case 'newest':
      return sorted.sort((a, b) => b.id.localeCompare(a.id));
    case 'reviews':
      return sorted.sort((a, b) => b.reviewCount - a.reviewCount);
    case 'price-low':
      return sorted.sort((a, b) => (a.salePrice ?? a.price ?? Infinity) - (b.salePrice ?? b.price ?? Infinity));
    case 'price-high':
      return sorted.sort((a, b) => (b.salePrice ?? b.price ?? 0) - (a.salePrice ?? a.price ?? 0));
    case 'recommended':
    default:
      if (hasManagedProductOrder(sorted, 'catalogOrder')) {
        return sortByManagedProductOrder(sorted, 'catalogOrder');
      }
      return sorted.sort((a, b) => (b.isRecommended ? 1 : 0) - (a.isRecommended ? 1 : 0));
  }
}
