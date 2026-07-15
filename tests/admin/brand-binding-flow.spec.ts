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

function expectNoMutableBrandImport(source: string): void {
  expect(source).not.toMatch(/from ['"][^'"]*data\/brands['"]/);
  expect(source).not.toContain('@/data/brands');
}

function expectPublicBrandSource(source: string): void {
  expectNoMutableBrandImport(source);
  expect(source).not.toContain('@/lib/storage');
  expect(source).not.toContain('fetch(');
  expect(source).not.toContain('localStorage');
  expect(source).not.toContain('sessionStorage');
}

test.describe('브랜드 관리자 저장 → 공개 페이지 바인딩 경로', () => {
  test('관리자 브랜드 목록과 폼 저장은 storage 콘센트를 통해 흐른다', () => {
    const adminPage = src('src', 'app', 'admin', 'brands', 'page.tsx');
    const formSource = src('src', 'components', 'admin-new', 'brands', 'BrandForm.tsx');

    const fetchData = sliceBetween(adminPage, 'const fetchData = async', 'useEffect(() => {');
    const toggleVisible = sliceBetween(adminPage, 'const handleToggleVisible = async', 'const filteredBrands = brands.filter');

    expect(adminPage).toMatch(/import\s+\{[\s\S]*\bgetAdminBrands\b[\s\S]*\bupdateBrand\b[\s\S]*\}\s+from '@\/lib\/storage';/);
    expect(fetchData).toContain('const [brandList, productList] = await Promise.all([');
    expect(fetchData).toContain('getAdminBrands(),');
    expect(fetchData).toContain('getAdminProducts()');
    expect(toggleVisible).toContain('const { error } = await updateBrand(brand.id, { isVisible: next });');
    expect(adminPage).toMatch(/onSuccess=\{\(\) => \{\s+setIsFormOpen\(false\);\s+fetchData\(\);\s+\}\}/);

    expect(formSource).toMatch(/import\s+\{[\s\S]*\bcreateBrand\b[\s\S]*\bupdateBrand\b[\s\S]*\}\s+from '@\/lib\/storage';/);
    expect(formSource).toContain('const payload = buildBrandPayload(formData);');
    expect(formSource).toContain('await updateBrand(initialData.id, payload as UpdateBrandInput);');
    expect(formSource).toContain('await createBrand(payload as CreateBrandInput);');
  });

  test('storage 브랜드 함수는 관리자 API 에 JSON 요청하고 반환 brands/brand 를 전달한다', () => {
    const storageSource = src('src', 'lib', 'storage.ts');
    const listFunction = sliceBetween(storageSource, 'export async function getAdminBrands(', 'export type CreateBrandInput');
    const createFunction = sliceBetween(storageSource, 'export async function createBrand(', 'export async function updateBrand(');
    const updateFunction = sliceBetween(storageSource, 'export async function updateBrand(', 'export async function deleteBrand(');

    expect(listFunction).toContain("fetch('/api/admin/brands')");
    expect(listFunction).toContain('const { brands } = (await response.json()) as { brands: Brand[] };');
    expect(listFunction).toContain('return brands;');

    expect(createFunction).toContain("fetch('/api/admin/brands'");
    expect(createFunction).toContain("method: 'POST'");
    expect(createFunction).toContain('body: JSON.stringify(input)');
    expect(createFunction).toContain('const { brand } = (await response.json()) as { brand: Brand };');
    expect(createFunction).toContain('return { brand };');

    expect(updateFunction).toContain('fetch(`/api/admin/brands/${encodeURIComponent(id)}`');
    expect(updateFunction).toContain("method: 'PATCH'");
    expect(updateFunction).toContain('body: JSON.stringify(updates)');
    expect(updateFunction).toContain('const { brand } = (await response.json()) as { brand: Brand };');
    expect(updateFunction).toContain('return { brand };');
  });

  test('관리자 브랜드 API 는 repo 결과를 반환하고 공개 브랜드 경로를 revalidate 한다', () => {
    const collectionRoute = src('src', 'app', 'api', 'admin', 'brands', 'route.ts');
    const itemRoute = src('src', 'app', 'api', 'admin', 'brands', '[id]', 'route.ts');
    const postFunction = collectionRoute.slice(collectionRoute.indexOf('export async function POST('));
    const getFunction = sliceBetween(collectionRoute, 'export async function GET()', 'export async function POST(');
    const patchFunction = sliceBetween(itemRoute, 'export async function PATCH(', 'export async function DELETE(');

    expect(collectionRoute).toContain("import { insertBrand, listAllBrandsForAdmin } from '@/lib/brands/repo'");
    expect(getFunction).toContain('const brands = await listAllBrandsForAdmin();');
    expect(getFunction).toContain('return NextResponse.json({ brands }, { status: 200 });');
    expect(postFunction).toContain('const brand = await insertBrand(input);');
    expect(postFunction).toContain("revalidatePath('/brands')");
    expect(postFunction).toContain('return NextResponse.json({ brand }, { status: 201 });');

    expect(itemRoute).toContain("import { updateBrand, deleteBrand } from '@/lib/brands/repo'");
    expect(patchFunction).toContain('const brand = await updateBrand(id, toPatchInput(fields));');
    expect(patchFunction).toContain("revalidatePath('/brands')");
    expect(patchFunction).toContain('revalidatePath(`/brands/${id}`)');
    expect(patchFunction).toContain('return NextResponse.json({ brand }, { status: 200 });');
  });

  test('repo 브랜드 목록/update 는 DB 행을 rowToBrand 로 되읽는다', () => {
    const repoSource = src('src', 'lib', 'brands', 'repo.ts');
    const updateFunction = sliceBetween(
      repoSource,
      'export async function updateBrand(',
      'export async function deleteBrand(',
    );

    const listFunction = sliceBetween(repoSource, 'export async function listBrands(', 'export async function getBrandById(');
    const adminListFunction = sliceBetween(repoSource, 'export async function listAllBrandsForAdmin(', 'export async function insertBrand(');

    expect(listFunction).toContain("let query = getSupabase().from('brands').select(SELECT_COLUMNS);");
    expect(listFunction).toContain("if (visibleOnly) query = query.eq('is_visible', true);");
    expect(listFunction).toContain("const { data, error } = await query.order('created_at', { ascending: false }).limit(BRANDS_LIST_CAP);");
    expect(listFunction).toContain('return (data as BrandRow[]).map(rowToBrand);');
    expect(adminListFunction).toContain('return listBrands(false);');

    expect(updateFunction).toContain('const existing = await getBrandById(id, { includeHidden: true });');
    expect(updateFunction).toContain('const merged: Brand = { ...existing, ...patch, id: existing.id };');
    expect(updateFunction).toContain('const { columns, detail } = splitBrandInput(merged);');
    expect(updateFunction).toContain(".from('brands')");
    expect(updateFunction).toContain('.update({ ...columns, detail })');
    expect(updateFunction).toContain(".eq('id', id)");
    expect(updateFunction).toContain('.select(SELECT_COLUMNS)');
    expect(updateFunction).toContain('.single()');
    expect(updateFunction).toContain('return rowToBrand(data as BrandRow);');
  });

  test('공개 브랜드 목록/상세는 정적 brands 데이터가 아니라 repo 결과를 props 로 렌더한다', () => {
    const brandsPage = src('src', 'app', 'brands', 'page.tsx');
    const detailPage = src('src', 'app', 'brands', '[id]', 'page.tsx');
    const brandsContent = src('src', 'components', 'brands', 'BrandsContent.tsx');
    const productsClient = src('src', 'components', 'brands', 'BrandProductsClient.tsx');

    expect(brandsPage).toContain("import { listBrands } from '@/lib/brands/repo'");
    expect(brandsPage).toContain("export const dynamic = 'force-dynamic'");
    expect(brandsPage).toContain('const brands = await listBrands();');
    expect(brandsPage).toContain('<BrandsContent brands={brands} />');
    expectPublicBrandSource(brandsPage);

    expect(detailPage).toContain("import { getBrandById } from '@/lib/brands/repo'");
    expect(detailPage).toContain("import { listProductsByBrand } from '@/lib/products/repo'");
    expect(detailPage).toContain('const brand = await getBrandById(id);');
    expect(detailPage).toContain('const brandProducts = await listProductsByBrand(brand.id);');
    expect(detailPage).not.toMatch(/getBrandById\(\s*id\s*,/);
    expect(detailPage).not.toContain('getBrandById(id, { includeHidden');
    expectPublicBrandSource(detailPage);

    expect(brandsContent).toContain('export default function BrandsContent({ brands, initialSpotlightBrand }: Props)');
    expect(brandsContent).toContain('.filter((brand) => brand.isVisible !== false)');
    expectPublicBrandSource(brandsContent);

    expectNoMutableBrandImport(productsClient);
    expect(productsClient).toContain('brand: Brand;');
    expect(productsClient).toContain('initialProducts: Product[];');
    expect(productsClient).toContain('export default function BrandProductsClient({ brand, initialProducts, shortBrandName }: BrandProductsClientProps)');
    expect(productsClient).toContain('const [products, setProducts] = useState<Product[]>(initialProducts);');
    expect(productsClient).toContain('getPartnerProducts(brand.id)');
    expect(productsClient).not.toMatch(/\b(?:fetch|getAdminBrands|listBrands|getBrandById)\s*\(/);
  });
});
