export interface ProductTagDefinition {
  /** 상품 concernTags와 스토어 필터 URL이 함께 쓰는 변경하지 않는 연결값. */
  slug: string;
  /** 고객 상품 카드와 필터에 보이는 이름. */
  label: string;
  /** false면 기존 상품 연결은 유지하되 고객 카드에서는 숨긴다. */
  isVisible: boolean;
  /** 현재 스토어 왼쪽 '고민' 필터에 표시할지 여부. */
  showInShopFilter: boolean;
}

export interface ProductTagsConfig {
  items: ProductTagDefinition[];
  /** 삭제한 slug가 상품에 남아 있어도 다시 자동 등록되지 않게 하는 삭제 기록. */
  hiddenSlugs: string[];
}

export interface AdminProductTagsConfig extends ProductTagsConfig {
  /** false면 현재 홈페이지 기본값은 읽을 수 있지만 관리자 저장 테이블은 아직 적용 전이다. */
  persistenceReady: boolean;
}

/**
 * 현재 고객 홈페이지의 상품 카드 표기와 스토어 필터를 그대로 옮긴 기준값.
 * 관리자 기능을 배포하기 전/후의 고객 화면이 달라지지 않도록 문구와 순서를 바꾸지 않는다.
 */
export const defaultProductTagsConfig: ProductTagsConfig = {
  items: [
    { slug: 'skin', label: '피부', isVisible: true, showInShopFilter: true },
    { slug: 'joint', label: '관절', isVisible: true, showInShopFilter: true },
    { slug: 'obesity', label: '체중', isVisible: true, showInShopFilter: true },
    { slug: 'oral', label: '구강', isVisible: true, showInShopFilter: true },
    { slug: 'odor', label: '냄새', isVisible: true, showInShopFilter: true },
    { slug: 'tear', label: '눈물', isVisible: true, showInShopFilter: false },
    { slug: 'picky', label: '편식', isVisible: true, showInShopFilter: false },
    { slug: 'digestion', label: '배변', isVisible: true, showInShopFilter: false },
    { slug: 'stress', label: '스트레스', isVisible: true, showInShopFilter: false },
    { slug: 'senior', label: '시니어', isVisible: true, showInShopFilter: false },
    { slug: 'nutrition', label: '영양', isVisible: true, showInShopFilter: false },
    { slug: 'grooming', label: '그루밍', isVisible: true, showInShopFilter: false },
    { slug: 'living', label: '생활', isVisible: true, showInShopFilter: false },
  ],
  hiddenSlugs: [],
};

/**
 * 직원은 고객에게 보이는 한글 이름만 입력한다. 상품 연결에 쓰는 slug는 시스템이
 * 자동으로 만들고, 같은 값이 이미 있으면 뒤에 번호를 붙여 기존 상품 연결을 지킨다.
 */
export function createProductTagSlug(
  label: string,
  existing: readonly Pick<ProductTagDefinition, 'slug'>[],
): string {
  const normalized = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const used = new Set(existing.map((item) => item.slug));
  const base = normalized || `tag-${existing.length + 1}`;
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate)) candidate = `${base}-${suffix++}`;
  return candidate;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** 저장된 사전에 없는 현재 상품 태그도 이름 그대로 관리자에 보여 기존 홈페이지 내용을 보존한다. */
export function resolveProductTagsConfig(
  stored: ProductTagsConfig | null,
  productTagValues: readonly string[],
): ProductTagsConfig {
  const base = clone(stored ?? defaultProductTagsConfig);
  const hidden = new Set(base.hiddenSlugs);
  const seen = new Set<string>();
  const items = base.items.filter((item) => {
    if (!item.slug || hidden.has(item.slug) || seen.has(item.slug)) return false;
    seen.add(item.slug);
    return true;
  });

  for (const raw of productTagValues) {
    const slug = raw.trim();
    if (!slug || hidden.has(slug) || seen.has(slug)) continue;
    seen.add(slug);
    items.push({ slug, label: slug, isVisible: true, showInShopFilter: false });
  }

  return { items, hiddenSlugs: [...hidden] };
}
