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

    expect(routeSource).toContain("import { updateProduct, deleteProduct } from '@/lib/products/repo'");
    expect(patchFunction).toContain('const result = await updateProduct(id, toPatchInput(fields));');
    expect(patchFunction).toContain("revalidatePath('/shop')");
    expect(patchFunction).toContain('revalidatePath(`/shop/${id}`)');
    expect(patchFunction).toContain('return NextResponse.json({ product: result.data }, { status: 200 });');
  });

  test('repo update 는 DB 행을 includeHidden 으로 읽고 update 결과를 rowToProduct 로 되읽는다', () => {
    const repoSource = src('src', 'lib', 'products', 'repo.ts');
    const updateFunction = sliceBetween(
      repoSource,
      'export async function updateProduct(',
      'export async function deleteProduct(',
    );

    expect(updateFunction).toContain("const existing = await getProductById(id, { includeHidden: true });");
    expect(updateFunction).toContain('const merged: Product = { ...existing, ...patch, id: existing.id };');
    expect(updateFunction).toContain('const { columns, detail } = splitProductInput(merged);');
    expect(updateFunction).toContain(".from('products')");
    expect(updateFunction).toContain('.update({ ...columns, detail })');
    expect(updateFunction).toContain('.eq(\'id\', id)');
    expect(updateFunction).toContain('.select(SELECT_COLUMNS)');
    expect(updateFunction).toContain('.single()');
    expect(updateFunction).toContain('return { status: \'ok\', data: rowToProduct(data as ProductRow) };');
  });

  test('공개 상품 목록/상세는 정적 products 데이터가 아니라 repo 를 읽는다', () => {
    const shopPage = src('src', 'app', 'shop', 'page.tsx');
    const detailPage = src('src', 'app', 'shop', '[id]', 'page.tsx');

    expect(shopPage).toContain("import { listProducts } from '@/lib/products/repo'");
    expect(shopPage).toContain('const [products, brands] = await Promise.all([listProducts(), listBrands()]);');
    expect(shopPage).not.toContain('@/data/products');

    expect(detailPage).toContain("import { getProductById, listProducts } from '@/lib/products/repo'");
    expect(detailPage).toContain('const product = await getProductById(id);');
    expect(detailPage).not.toContain('@/data/products');
  });

  test('ProductForm 의 toFormState 는 pointsEnabled·pointsRate 를 화이트리스트에서 누락하지 않는다', () => {
    const formSource = src('src', 'components', 'admin-new', 'products', 'ProductForm.tsx');

    const toFormStateFunction = sliceBetween(
      formSource,
      'const toFormState = (): ProductFormState => ({',
      'const handleSave = async',
    );

    expect(toFormStateFunction).toContain('pointsEnabled: formData.pointsEnabled');
    expect(toFormStateFunction).toContain('pointsRate: formData.pointsRate');
  });

  test('repo 의 rowToProduct 는 pointsEnabled·pointsRate 를 DB 행에서 되읽는다', () => {
    const repoSource = src('src', 'lib', 'products', 'repo.ts');

    const rowToProductFunction = sliceBetween(
      repoSource,
      'function rowToProduct(row: ProductRow): Product {',
      'export interface ProductListFilter',
    );

    expect(rowToProductFunction).toContain(
      "pointsEnabled: typeof d.pointsEnabled === 'boolean' ? d.pointsEnabled : undefined",
    );
    expect(rowToProductFunction).toContain(
      "pointsRate: typeof d.pointsRate === 'number' ? d.pointsRate : undefined",
    );
  });
});
