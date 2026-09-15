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
  test('관리자 상품 저장은 storage 콘센트를 통해 PATCH API 로 흐른다', () => {
    const hookSource = src('src', 'hooks', 'admin-new', 'useProductList.ts');
    const storageSource = src('src', 'lib', 'storage.ts');

    const executeBulkAction = sliceBetween(
      hookSource,
      'const executeBulkAction = async',
      'const performBulkDelete = async',
    );
    const updateListFunction = sliceBetween(
      hookSource,
      'const performBulkUpdate = async',
      'return {',
    );
    const storageUpdateFunction = sliceBetween(
      storageSource,
      'export async function updateProduct(',
      'export async function deleteProduct(',
    );

    expect(hookSource).toMatch(/import\s+\{[^}]*\bupdateProduct\b[^}]*\}\s+from '@\/lib\/storage';/);
    expect(executeBulkAction).toContain('await fetchInitialData();');
    expect(updateListFunction).toContain('return executeBulkAction(ids, async (id) => {');
    expect(updateListFunction).toContain('const res = await updateProduct(id, updates);');
    expect(updateListFunction).toContain('if (res.error) throw new Error(res.error);');

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

    expect(routeSource).toContain("import { updateProduct, deleteProduct, ProductComplianceError } from '@/lib/products/repo'");
    expect(patchFunction).toContain('const result = await updateProduct(id, toPatchInput(fields));');
    expect(patchFunction).toContain("revalidatePath('/shop')");
    expect(patchFunction).toContain('revalidatePath(`/shop/${id}`)');
    expect(patchFunction).toContain('return NextResponse.json({ product: result.data }, { status: 200 });');
  });

  test('상품 관리자 폼은 DB 고민·카테고리 카드만 사용하고 태그 입력은 제거한다', () => {
    const newPage = src('src', 'app', 'admin', 'products', 'new', 'page.tsx');
    const editPage = src('src', 'app', 'admin', 'products', '[id]', 'page.tsx');
    const formSource = src('src', 'components', 'admin-new', 'products', 'ProductForm.tsx');

    expect(newPage).toContain('getConcernsConfigWithFallback()');
    expect(editPage).toContain('getConcernsConfigWithFallback()');
    expect(formSource).toContain('concerns: Concern[]');
    expect(formSource).toContain('function SelectionCardGrid');
    expect(formSource).toContain('주요 고민');
    expect(formSource).toContain('concernTags');
    expect(formSource).not.toContain('relatedConcernSlugs');
    expect(formSource).not.toContain('상품 태그');
    expect(formSource).not.toContain('placeholder="예: skin, digestion"');
  });

  test('상품별 실제 판매자는 목록과 상품 수정 상단, 상세 에디터에서 바로 변경 경로를 찾을 수 있다', () => {
    const listSource = src('src', 'components', 'admin-new', 'products', 'AdminProductsClient.tsx');
    const formSource = src('src', 'components', 'admin-new', 'products', 'ProductForm.tsx');
    const detailEditorSource = src('src', 'components', 'admin-new', 'products', 'ProductDetailEditor.tsx');

    expect(listSource).toContain("header: '실제 판매자'");
    expect(listSource).toContain("router.push(`/admin/products/${id}#actual-seller`)");
    expect(listSource).toContain("{p.seller ? '판매자 변경' : '판매자 지정'}");
    expect(listSource).toContain('<option value="seller">판매자 미지정</option>');

    expect(formSource).toContain('id="actual-seller"');
    expect(formSource).toContain('title="실제 판매자 연결"');
    expect(formSource).toContain('id="product-seller"');
    expect(formSource).toContain("handleChange('sellerId', event.target.value)");
    expect(formSource).toContain('판매자 정보 등록·수정하기');

    expect(detailEditorSource).toContain('실제 판매자 변경');
    expect(detailEditorSource).toContain('href={`/admin/products/${product.id}#actual-seller`}');
  });

  test('실제 판매자 선택값은 상품 PATCH payload와 DB seller_id 컬럼까지 전달된다', () => {
    const formSource = src('src', 'components', 'admin-new', 'products', 'ProductForm.tsx');
    const payloadSource = src('src', 'lib', 'products', 'formPayload.ts');
    const validatorSource = src('src', 'lib', 'products', 'validate.ts');
    const splitSource = src('src', 'lib', 'products', 'splitProductInput.ts');

    expect(formSource).toContain('sellerId: formData.sellerId');
    expect(payloadSource).toContain("'sellerId'");
    expect(payloadSource).toContain('sellerId: form.sellerId || undefined');
    expect(validatorSource).toContain('if (b.sellerId !== undefined)');
    expect(splitSource).toContain("sellerId: 'seller_id'");
  });

  test('고객 상품카드의 BEST·자체 큐레이션 표시는 상품관리에서 상품별로 직접 켜고 끈다', () => {
    const listSource = src('src', 'components', 'admin-new', 'products', 'AdminProductsClient.tsx');
    const formSource = src('src', 'components', 'admin-new', 'products', 'ProductForm.tsx');
    const displaySource = src('src', 'components', 'admin-new', 'products', 'ProductDisplayManager.tsx');
    const cardSource = src('src', 'components', 'common', 'ProductCard.tsx');
    const createPageSource = src('src', 'app', 'admin', 'products', 'new', 'page.tsx');
    const editPageSource = src('src', 'app', 'admin', 'products', '[id]', 'page.tsx');

    expect(listSource).toContain("header: 'BEST · 자체 큐레이션'");
    expect(listSource).toContain("performBulkUpdate([product.id], { isBest: !product.isBest })");
    expect(listSource).toContain('BEST 표시 (전체)');
    expect(formSource).toContain('label="BEST · 자체 큐레이션 표시"');
    expect(formSource).toContain('자체 큐레이션 · 기준 보기');
    expect(formSource).toContain('id="product-brand-link"');
    expect(formSource).toContain('title="상품 브랜드 연결"');
    expect(formSource).toContain('label="이 상품의 브랜드"');
    expect(formSource).toContain("handleChange('brandId', event.target.value)");
    expect(formSource).toContain('brandId: formData.brandId');
    for (const pageSource of [createPageSource, editPageSource]) {
      expect(pageSource).toContain('listAllBrandsForAdmin()');
      expect(pageSource).toContain('brands={brands}');
    }
    expect(displaySource).toContain("shortLabel: 'DAILY PICK'");
    expect(displaySource).toContain("membershipField: 'isBest'");
    expect(cardSource).toContain('{product.isBest && (');
    expect(cardSource).toContain('자체 큐레이션 · 기준 보기');
    expect(cardSource).toContain('href={brandAuditHref}');
    expect(cardSource).toContain('`/brands/${encodeURIComponent(product.brandId)}#brand-audit`');
    expect(cardSource).not.toContain('href="/audit"');
  });

  test('진열 관리는 고객 화면별 위치를 명시하고 위치별 순서를 저장해 공개 정렬에 반영한다', () => {
    const displaySource = src('src', 'components', 'admin-new', 'products', 'ProductDisplayManager.tsx');
    const productType = src('src', 'types', 'index.ts');
    const productRepo = src('src', 'lib', 'products', 'repo.ts');
    const productValidate = src('src', 'lib', 'products', 'validate.ts');
    const displayOrder = src('src', 'lib', 'products', 'displayOrder.ts');
    const home = src('src', 'components', 'home', 'HomeClient.tsx');
    const shop = src('src', 'components', 'shop', 'ShopContent.tsx');
    const filters = src('src', 'lib', 'filters.ts');

    for (const copy of ['고객 홈 > 오늘의 추천', '스토어 > DAILY PICK', '스토어 > 전체 상품']) {
      expect(displaySource).toContain(copy);
    }
    expect(displaySource).toContain('위로 이동');
    expect(displaySource).toContain('아래로 이동');
    expect(displaySource).toContain('진열 변경 저장');
    for (const field of ['homeDisplayOrder', 'dailyPickDisplayOrder', 'storeDisplayOrder']) {
      expect(productType).toContain(`${field}?: number`);
      expect(productRepo).toContain(`d.${field}`);
      expect(productValidate).toContain(`b.${field}`);
      expect(displayOrder).toContain(`'${field}'`);
    }
    expect(home).toContain("'homeDisplayOrder'");
    expect(home).toContain('products.filter((product) => product.isRecommended)');
    expect(shop).toContain("'dailyPickDisplayOrder'");
    expect(shop).toContain('productsWithBrandNames.filter((product) => product.isBest)');
    expect(filters).toContain("'storeDisplayOrder'");
  });

  test('상품 상세는 카테고리와 고민 제목을 표시하고 내부 slug를 표시하지 않는다', () => {
    const detailPage = src('src', 'app', 'shop', '[id]', 'page.tsx');
    const detailClient = src('src', 'components', 'shop', 'ProductDetailClient.tsx');

    expect(detailPage).toContain('getConcernsConfigWithFallback()');
    expect(detailPage).toContain('concernTitleBySlug');
    expect(detailPage).toContain('product.concernTags');
    expect(detailPage).not.toContain('product.relatedConcernSlugs');
    expect(detailClient).toContain('aria-label="상품 카테고리"');
    expect(detailClient).toContain('aria-label="상품 주요 고민"');
    expect(detailClient).not.toContain('product.tags');
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

    // PR2: shop/page.tsx가 getCachedPageTextSettings 도 같은 import 문에서 들여오면서 리터럴 import
    // 문자열이 바뀌었다 — 정확한 순서에 의존하지 않고 두 심볼이 같은 import 안에 있는지로 데이터
    // 로딩 콘센트(공개 repo 캐시)가 유지됐는지를 확인한다.
    expect(shopPage).toMatch(/import\s+\{[^}]*\blistCachedPublicBrands\b[^}]*\blistCachedPublicProducts\b[^}]*\}\s+from '@\/lib\/public-read-cache';/);
    // concerns DB화(2026-07-17)로 고민 필터 옵션도 서버에서 함께 읽어 내려준다.
    expect(shopPage).toContain('const [products, brands, concernsConfig] = await Promise.all([');
    expect(shopPage).toContain('listCachedPublicProducts(),');
    expect(shopPage).toContain('listCachedPublicBrands(),');
    expect(shopPage).not.toContain('@/data/products');

    expect(detailPage).toContain('getCachedPublicProductById,');
    expect(detailPage).toContain('listCachedPublicProducts,');
    expect(detailPage).toContain('const product = await getCachedPublicProductById(id);');
    expect(detailPage).not.toContain('@/data/products');

    const productsRepoImport = publicCache.match(
      /import\s*\{([\s\S]*?)\}\s*from ['"]@\/lib\/products\/repo['"]/,
    )?.[1] ?? '';
    expect(productsRepoImport).toContain('listProducts');
    expect(productsRepoImport).toContain('getProductById');
    expect(productsRepoImport).toContain('type ProductListFilter');
    expect(publicCache).toContain("type PublicProductListFilter = Omit<ProductListFilter, 'visibleOnly'>;");
    expect(publicCache).toContain('listProducts({ categorySlug, brandId, petType, visibleOnly: true })');
    expect(publicCache).toContain('async (id: string) => getProductById(id)');
    expect(publicCache).not.toContain('visibleOnly: false');
  });

});
