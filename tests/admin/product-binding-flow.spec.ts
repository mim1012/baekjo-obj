import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');
const src = (...segments: string[]) => fs.readFileSync(path.join(root, ...segments), 'utf8');
function sliceBetween(source: string, startNeedle: string, endNeedle: string): string {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start + startNeedle.length);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}


test.describe('상품 관리자 저장 → 공개 페이지 바인딩 경로', () => {
  test('상품 정보 수정과 단일 상품 진열 화면은 storage 콘센트를 통해 PATCH API 로 흐른다', () => {
    const formSource = src('src', 'components', 'admin-new', 'products', 'ProductForm.tsx');
    const displaySource = src('src', 'components', 'admin-new', 'products', 'ProductDisplayManager.tsx');
    const storageSource = src('src', 'lib', 'storage.ts');

    const storageUpdateFunction = sliceBetween(
      storageSource,
      'export async function updateProduct(',
      'export async function deleteProduct(',
    );

    expect(formSource).toMatch(/import\s+\{[^}]*\bupdateProduct\b[^}]*\}\s+from '@\/lib\/storage';/);
    expect(formSource).toContain('const { error: updateError } = await updateProduct(initialData.id, payload);');
    expect(displaySource).toContain("import { updateProduct } from '@/lib/storage';");
    expect(displaySource).toContain('const { error } = await updateProduct(id, pendingUpdates[id]);');

    expect(storageUpdateFunction).toContain('fetch(`/api/admin/products/${encodeURIComponent(id)}`');
    expect(storageUpdateFunction).toContain("method: 'PATCH'");
    expect(storageUpdateFunction).toContain('body: JSON.stringify(updates)');
    expect(storageUpdateFunction).toContain('const { product } = (await response.json()) as { product: Product };');
    expect(storageUpdateFunction).toContain('return { product };');
  });

  test('관리자 PATCH API 는 repo update 결과를 되읽어 반환하고 공개 상품 경로를 revalidate 한다', () => {
    const routeSource = src('src', 'app', 'api', 'admin', 'products', '[id]', 'route.ts');

    const patchFunction = sliceBetween(
      routeSource,
      'export async function PATCH(',
      'export async function DELETE(',
    );

    expect(routeSource).toContain("import { updateProduct, deleteProduct } from '@/lib/products/repo'");
    expect(patchFunction).toContain('const result = await updateProduct(id, toPatchInput(fields));');
    expect(patchFunction).toContain("revalidatePath('/shop')");
    expect(patchFunction).toContain('revalidatePath(`/shop/${id}`)');
    expect(patchFunction).toContain('return NextResponse.json({ product: result.data }, { status: 200 });');
  });

  test('진열 순서는 홈 추천·스토어 추천·스토어 전체 화면에 각각 같은 필드로 왕복된다', () => {
    const displaySource = src('src', 'components', 'admin-new', 'products', 'ProductDisplayManager.tsx');
    const homeSource = src('src', 'components', 'home', 'HomeClient.tsx');
    const shopSource = src('src', 'components', 'shop', 'ShopContent.tsx');
    const filtersSource = src('src', 'lib', 'filters.ts');
    const brandSource = src('src', 'app', 'brands', '[id]', 'page.tsx');
    const repoSource = src('src', 'lib', 'products', 'repo.ts');

    expect(displaySource).toContain("field: 'homeFeaturedOrder'");
    expect(displaySource).toContain("field: 'shopFeaturedOrder'");
    expect(displaySource).toContain("field: 'catalogOrder'");
    expect(displaySource).toContain("aria-label={`${product.name} 위로 이동`}");
    expect(displaySource).toContain("aria-label={`${product.name} 아래로 이동`}");
    expect(homeSource).toContain("'homeFeaturedOrder'");
    expect(shopSource).toContain("'shopFeaturedOrder'");
    expect(filtersSource).toContain("hasManagedProductOrder(sorted, 'catalogOrder')");
    expect(brandSource).toContain("'catalogOrder'");
    for (const field of ['homeFeaturedOrder', 'shopFeaturedOrder', 'catalogOrder']) {
      expect(repoSource).toContain(`${field}: typeof d.${field} === 'number'`);
    }
  });

  test('repo update 는 DB 행을 includeHidden 으로 읽고 update 결과를 rowToProduct 로 되읽는다', () => {
    const repoSource = src('src', 'lib', 'products', 'repo.ts');
    const updateFunction = sliceBetween(
      repoSource,
      'export async function updateProduct(',
      'export async function deleteProduct(',
    );

    expect(updateFunction).toContain("const existing = await getProductById(id, { includeHidden: true });");
    expect(updateFunction).toContain('const merged = mergeProductForStorage(existing, patch);');
    expect(updateFunction).toContain('const { columns, detail } = splitProductInput(merged);');
    expect(updateFunction).toContain(".from('products')");
    expect(updateFunction).toContain('.update({ ...columns, detail })');
    expect(updateFunction).toContain('.eq(\'id\', id)');
    expect(updateFunction).toContain('.select(SELECT_COLUMNS)');
    expect(updateFunction).toContain('.single()');
    expect(updateFunction).toContain('return { status: \'ok\', data: rowToProduct(data as ProductRow) };');
  });

  test('공개 상품 목록/상세는 정적 products 데이터가 아니라 공개 repo 캐시를 읽는다', () => {
    const shopPage = src('src', 'app', 'shop', 'page.tsx');
    const detailPage = src('src', 'app', 'shop', '[id]', 'page.tsx');
    const publicCache = src('src', 'lib', 'public-read-cache.ts');

    expect(shopPage).toContain("import { listCachedPublicBrands, listCachedPublicProducts } from '@/lib/public-read-cache'");
    // 현재 상품 카드 태그와 같은 별도 사전으로 스토어 고민 필터를 읽어 내려준다.
    expect(shopPage).toContain('const [products, brands, productTagsConfig, content] = await Promise.all([');
    expect(shopPage).toContain('listCachedPublicProducts(),');
    expect(shopPage).toContain('listCachedPublicBrands(),');
    expect(shopPage).toContain("getPublishedPageContent<ShopPageContent & Record<string, unknown>>('shop')");
    expect(shopPage).toContain('getPublicProductTagsConfig(),');
    expect(shopPage).toContain('<ShopContent products={products} brands={brands} productTags={productTagsConfig.items} content={content} />');
    expect(shopPage).not.toContain('@/data/products');

    expect(detailPage).toContain('getCachedPublicProductById,');
    expect(detailPage).toContain('listCachedPublicProducts,');
    expect(detailPage).toContain('const product = await getCachedPublicProductById(id);');
    expect(detailPage).not.toContain('@/data/products');

    expect(publicCache).toContain("from '@/lib/products/repo'");
    expect(publicCache).toContain('getProductById,');
    expect(publicCache).toContain('listProducts,');
    expect(publicCache).toContain('type ProductListFilter,');
    expect(publicCache).toContain("type PublicProductListFilter = Omit<ProductListFilter, 'visibleOnly'>;");
    expect(publicCache).toContain('listProducts({ categorySlug, brandId, petType, visibleOnly: true })');
    expect(publicCache).toContain('async (id: string) => getProductById(id)');
    expect(publicCache).not.toContain('visibleOnly: false');
  });

  test('운영하지 않는 적립금 설정은 폼·저장·공개 읽기 경로에서 제거됐다', () => {
    const formSource = src('src', 'components', 'admin-new', 'products', 'ProductForm.tsx');
    const repoSource = src('src', 'lib', 'products', 'repo.ts');
    const detailSource = src('src', 'components', 'shop', 'ProductDetailClient.tsx');

    for (const text of ['적립금 지급', '적립률 (%)', 'pointsEnabled', 'pointsRate']) {
      expect(formSource).not.toContain(text);
      expect(repoSource).not.toContain(text);
      expect(detailSource).not.toContain(text);
    }
  });
});
