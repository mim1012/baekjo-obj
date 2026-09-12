import type { BrandPageCopy } from '@/types';

export const defaultBrandPageCopy: BrandPageCopy = {
  backToBrandsLabel: '모든 브랜드 보기',
  auditCompletedLabel: 'Audit Completed',
  categoryLabel: '카테고리',
  concernLabel: '관련 고민',
  storyEyebrow: 'BRAND STORY',
  auditTitle: '백조오브제 검토 완료',
  auditSubtitle: 'BAEKJO OBJET AUDIT',
  auditIntro: '아래 항목을 중심으로 검토를 완료하였습니다.',
  auditLinkLabel: 'Audit 자세히 보기',
  sourceLinkLabel: '브랜드 자료 더 보기',
  productsTitle: '이 브랜드의 상품',
  productsDescription: '{brand}의 공개 상품을 소개합니다.',
  allProductsLabel: '전체 상품 보기',
  emptyProductsTitle: '아직 등록된 상품이 없어요.',
  emptyProductsDescription: '상품 정보가 준비되는 대로 차근차근 채워둘게요.',
  reviewsTitle: '반려가족 후기',
  reviewsDescription: '{brand}을 사용한 보호자들의 솔직한 후기를 확인해보세요.',
  allReviewsLabel: '전체 후기 보기',
  emptyReviewsTitle: '아직 도착한 후기가 없어요.',
  emptyReviewsDescription: '이 브랜드의 첫 번째 후기를 남겨주세요.',
  otherBrandsTitle: '다른 검증 브랜드도 살펴보세요.',
  otherBrandsDescription: '백조오브제가 까다롭게 검토한 다양한 브랜드를 만나보세요.',
  otherBrandsButtonLabel: '전체 브랜드 보기',
};

export const brandPageCopyFields: readonly {
  key: keyof BrandPageCopy;
  label: string;
  multiline?: boolean;
}[] = [
  { key: 'backToBrandsLabel', label: '상단 · 모든 브랜드 보기' },
  { key: 'auditCompletedLabel', label: '상단 · Audit 완료 표시' },
  { key: 'categoryLabel', label: '요약 · 카테고리' },
  { key: 'concernLabel', label: '요약 · 관련 고민' },
  { key: 'storyEyebrow', label: '스토리 · 영문 소제목' },
  { key: 'auditTitle', label: 'Audit · 제목' },
  { key: 'auditSubtitle', label: 'Audit · 영문 소제목' },
  { key: 'auditIntro', label: 'Audit · 안내 문구', multiline: true },
  { key: 'auditLinkLabel', label: 'Audit · 자세히 보기' },
  { key: 'sourceLinkLabel', label: 'Audit · 브랜드 자료 보기' },
  { key: 'productsTitle', label: '상품 · 제목' },
  { key: 'productsDescription', label: '상품 · 설명 ({brand} 사용 가능)', multiline: true },
  { key: 'allProductsLabel', label: '상품 · 전체 보기 버튼' },
  { key: 'emptyProductsTitle', label: '상품 없음 · 제목' },
  { key: 'emptyProductsDescription', label: '상품 없음 · 설명', multiline: true },
  { key: 'reviewsTitle', label: '후기 · 제목' },
  { key: 'reviewsDescription', label: '후기 · 설명 ({brand} 사용 가능)', multiline: true },
  { key: 'allReviewsLabel', label: '후기 · 전체 보기 버튼' },
  { key: 'emptyReviewsTitle', label: '후기 없음 · 제목' },
  { key: 'emptyReviewsDescription', label: '후기 없음 · 설명', multiline: true },
  { key: 'otherBrandsTitle', label: '하단 · 다른 브랜드 제목' },
  { key: 'otherBrandsDescription', label: '하단 · 다른 브랜드 설명', multiline: true },
  { key: 'otherBrandsButtonLabel', label: '하단 · 전체 브랜드 버튼' },
];

export function normalizeBrandPageCopy(input: unknown): BrandPageCopy {
  const source = input && typeof input === 'object' && !Array.isArray(input)
    ? input as Record<string, unknown>
    : {};
  return Object.fromEntries(
    Object.entries(defaultBrandPageCopy).map(([key, fallback]) => [
      key,
      typeof source[key] === 'string' ? source[key] : fallback,
    ]),
  ) as unknown as BrandPageCopy;
}

export function renderBrandPageCopy(template: string, brandName: string): string {
  return template.replaceAll('{brand}', brandName);
}
