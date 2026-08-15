import type { Brand } from '@/types';

const concernLabels: Record<string, string> = {
  picky: '입맛/편식',
  nutrition: '영양/보양',
  oral: '구강/위생',
  grooming: '그루밍',
  stress: '스트레스/행동',
  digestion: '소화/장',
  skin: '피부/모질',
  living: '생활환경',
};

export function getBrandDisplayTags(
  input: Pick<Brand, 'displayTags' | 'relatedConcernSlugs'>,
): string[] {
  const explicitTags = input.displayTags
    ?.map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
  if (explicitTags && explicitTags.length > 0) return explicitTags;

  const firstConcern = input.relatedConcernSlugs[0];
  return [firstConcern ? concernLabels[firstConcern] ?? '프리미엄 펫 브랜드' : '프리미엄 펫 브랜드'];
}
