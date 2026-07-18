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

function expectNoCategoryBypass(source: string): void {
  expect(source).not.toMatch(/from ['"][^'"]*data\/(?:products|brands)(?:\.[^'"]*)?['"]/);
  expect(source).not.toMatch(/(?:import\s*\(|require\s*\()\s*['"][^'"]*data\/(?:products|brands)(?:\.[^'"]*)?['"]/);
  expect(source).not.toMatch(/@\/data\/(?:products|brands)(?:\.[^'"]*)?/);
  expect(source).not.toMatch(/\b(?:localStorage|sessionStorage)\b/);
  expect(source).not.toMatch(/\bwindow\s*\[\s*['"](?:localStorage|sessionStorage)['"]\s*\]/);
}

test.describe('카테고리 관리자 저장 → 공개 필터 바인딩 경로', () => {
  test('관리자 카테고리 화면은 provider 콘센트의 updateCategorySettings 로만 저장한다', () => {
    const adminPage = src('src', 'app', 'admin', 'categories', 'page.tsx');
    const saveFunction = sliceBetween(adminPage, 'const handleSave = async () => {', 'const renderStringListEditor = (');

    expect(adminPage).toContain("import { useCategorySettings } from '@/components/providers/CategorySettingsProvider';");
    expect(adminPage).toContain('const { categorySettings, updateCategorySettings, loaded, loadError } = useCategorySettings();');
    expect(adminPage).toContain('const [settings, setSettings] = useState<CategorySettings>(categorySettings);');
    expect(saveFunction).toContain('const ok = await updateCategorySettings(settings);');
    expect(saveFunction).toContain('setHasChanges(false);');
    expect(saveFunction).not.toContain('fetch(');
    expect(saveFunction).not.toContain('saveCategorySettings');
    expect(saveFunction).not.toContain('getSupabase');
    expect(adminPage).not.toContain('@/lib/categorySettings/repo');
    expect(adminPage).toContain("field: 'productCategories' | 'lifestyleCategories'");
    expect(adminPage).toContain("'productCategories'");
    expect(adminPage).toContain("'lifestyleCategories'");
  });

  test('로드 완료 전에는 편집·저장을 막고 SaveBar 저장 버튼도 비활성화한다(전수조사 A-2)', () => {
    const adminPage = src('src', 'app', 'admin', 'categories', 'page.tsx');
    const saveFunction = sliceBetween(adminPage, 'const handleSave = async () => {', 'const renderStringListEditor = (');

    expect(adminPage).toContain('const handleChange = (field:');
    // handleChange 가 handleSave 보다 먼저 정의되므로 handleChange 만 잘라서 loaded 가드를 확인한다.
    const changeFunction = sliceBetween(adminPage, 'const handleChange = (field:', 'const handleSave = async () => {');
    expect(changeFunction).toContain('if (!loaded) return;');
    expect(saveFunction).toContain('if (!loaded) return;');
    expect(adminPage).toContain('disabled={!loaded}');
  });

  test('loadError 는 PageHeader 설명 문구로 소비되어 차단 사유를 알린다(opus 리뷰 MEDIUM)', () => {
    const adminPage = src('src', 'app', 'admin', 'categories', 'page.tsx');

    expect(adminPage).toContain(
      "description={loadError ? '카테고리 설정을 불러오지 못했습니다. 저장이 차단되었습니다 — 새로고침 후 다시 시도해 주세요.' : '전체 사이트에서 사용되는 분류 체계와 카테고리를 관리합니다. 드래그하여 순서를 변경할 수 있습니다.'}",
    );
  });

  test('CategorySettingsProvider 는 공개 GET 으로 하이드레이트하고 관리자 PUT JSON 저장을 담당한다', () => {
    const providerSource = src('src', 'components', 'providers', 'CategorySettingsProvider.tsx');
    const hydrationEffect = sliceBetween(providerSource, 'useEffect(() => {', '}, []);');
    const updateFunction = sliceBetween(providerSource, 'const updateCategorySettings = (newSettings: CategorySettings): Promise<boolean> => {', 'return (');

    expect(providerSource).toContain("import { defaultCategorySettings, type CategorySettings } from '@/lib/categorySettings/config';");
    expect(providerSource).toContain('const [categorySettings, setCategorySettings] = useState<CategorySettings>(defaultCategorySettings);');
    expect(hydrationEffect).toContain("fetch('/api/category-settings')");
    expect(hydrationEffect).toContain('setCategorySettings(data.settings);');
    expect(updateFunction).toContain("fetch('/api/admin/category-settings', {");
    expect(updateFunction).toContain("method: 'PUT'");
    expect(updateFunction).toContain("headers: { 'Content-Type': 'application/json' }");
    expect(updateFunction).toContain('body: JSON.stringify(newSettings)');
    expect(updateFunction).toContain('setCategorySettings(prev);');
    expect(updateFunction).not.toContain('getSupabase');
    expect(updateFunction).not.toContain('@/data/products');
    expect(updateFunction).not.toContain('@/data/brands');
    expectNoCategoryBypass(providerSource);
    expect(providerSource).toContain("throw new Error('useCategorySettings must be used within CategorySettingsProvider');");
  });

  test('provider 는 GET resolve 여부를 loaded/loadError 로 노출한다(전수조사 A-2)', () => {
    const providerSource = src('src', 'components', 'providers', 'CategorySettingsProvider.tsx');
    const hydrationEffect = sliceBetween(providerSource, 'useEffect(() => {', '}, []);');

    expect(providerSource).toContain('loaded: boolean;');
    expect(providerSource).toContain('loadError: boolean;');
    expect(providerSource).toContain('const [loaded, setLoaded] = useState(false);');
    expect(providerSource).toContain('const [loadError, setLoadError] = useState(false);');
    expect(hydrationEffect).toContain('setLoaded(true);');
    expect(hydrationEffect).toContain('setLoadError(true);');
    expect(providerSource).toContain(
      '<CategorySettingsContext.Provider value={{ categorySettings, updateCategorySettings, loaded, loadError }}>',
    );
  });

  test('카테고리 API 는 공개 readback 과 관리자 저장을 repo 계층으로 위임한다', () => {
    const publicRoute = src('src', 'app', 'api', 'category-settings', 'route.ts');
    const adminRoute = src('src', 'app', 'api', 'admin', 'category-settings', 'route.ts');
    const putFunction = adminRoute.slice(adminRoute.indexOf('export async function PUT('));

    expect(publicRoute).toContain("import { defaultCategorySettings, type CategorySettings } from '@/lib/categorySettings/config';");
    expect(publicRoute).toContain("import { getCategorySettings } from '@/lib/categorySettings/repo';");
    expect(publicRoute).toContain('let settings: CategorySettings = defaultCategorySettings;');
    expect(publicRoute).toContain('const saved = await getCategorySettings();');
    expect(publicRoute).toContain('if (saved) settings = saved;');
    expect(publicRoute).toContain('return NextResponse.json({ settings }, { status: 200 });');

    expect(adminRoute).toContain("import { saveCategorySettings } from '@/lib/categorySettings/repo';");
    expect(adminRoute).toContain("import type { CategorySettings } from '@/lib/categorySettings/config';");
    expect(adminRoute).toContain('Array.isArray(b.productCategories)');
    expect(adminRoute).toContain('Array.isArray(b.lifestyleCategories)');
    expect(adminRoute).toContain('Array.isArray(b.brandFilters)');
    expect(putFunction).toContain('const session = await auth();');
    expect(putFunction).toContain('const requester = session.user.memberId ? await findMemberById(session.user.memberId) : null;');
    expect(putFunction).toContain('await saveCategorySettings(body);');
    expect(putFunction).toContain('return NextResponse.json({ ok: true }, { status: 200 });');
  });

  test('categorySettings repo 는 category_settings 단일 행의 value jsonb 를 읽고 upsert 한다', () => {
    const repoSource = src('src', 'lib', 'categorySettings', 'repo.ts');
    const getFunction = sliceBetween(repoSource, 'export async function getCategorySettings(', 'export async function saveCategorySettings(');
    const saveFunction = repoSource.slice(repoSource.indexOf('export async function saveCategorySettings('));

    expect(getFunction).toContain(".from('category_settings')");
    expect(getFunction).toContain(".select('value')");
    expect(getFunction).toContain(".eq('id', SETTINGS_ROW_ID)");
    expect(getFunction).toContain('.maybeSingle()');
    expect(getFunction).toContain('return data ? (data.value as CategorySettings) : null;');
    expect(saveFunction).toContain(".from('category_settings')");
    expect(saveFunction).toContain('upsert({ id: SETTINGS_ROW_ID, value, updated_at: new Date().toISOString() });');
  });

  test('공개/관리 필터 UI 는 categorySettings props/context 를 소비하고 mutable data 우회를 만들지 않는다', () => {
    const layoutSource = src('src', 'app', 'layout.tsx');
    const shopContent = src('src', 'components', 'shop', 'ShopContent.tsx');
    const brandsContent = src('src', 'components', 'brands', 'BrandsContent.tsx');
    const productForm = src('src', 'components', 'admin-new', 'products', 'ProductForm.tsx');
    const adminProducts = src('src', 'components', 'admin-new', 'products', 'AdminProductsClient.tsx');

    expect(layoutSource).toContain("import { CategorySettingsProvider } from \"@/components/providers/CategorySettingsProvider\";");
    expect(layoutSource).toContain('<CategorySettingsProvider>');

    expect(shopContent).toContain("import { useCategorySettings } from '@/components/providers/CategorySettingsProvider';");
    expect(shopContent).toContain('const { categorySettings } = useCategorySettings();');
    expect(shopContent).toContain('categorySettings.productCategories.map(toShopCategoryOption)');
    expect(shopContent).not.toContain('shopCategoryFilters');
    expectNoCategoryBypass(shopContent);

    expect(brandsContent).toContain("import { useCategorySettings } from '@/components/providers/CategorySettingsProvider';");
    expect(brandsContent).toContain('const { categorySettings } = useCategorySettings();');
    expect(brandsContent).toContain('categorySettings.brandFilters.map((tab) => {');
    expectNoCategoryBypass(brandsContent);

    expect(productForm).toContain("import { useCategorySettings } from '@/components/providers/CategorySettingsProvider';");
    expect(productForm).toContain('const { categorySettings } = useCategorySettings();');
    expect(productForm).toContain('categorySettings.productCategories.map((c) => (');
    expect(productForm).toContain('categorySettings.lifestyleCategories.map((c) => (');
    expectNoCategoryBypass(productForm);

    expect(adminProducts).toContain("import { useCategorySettings } from '@/components/providers/CategorySettingsProvider';");
    expect(adminProducts).toContain('const { categorySettings } = useCategorySettings();');
    expect(adminProducts).toContain('categorySettings.productCategories.map(c => (');
    expectNoCategoryBypass(adminProducts);
  });
});
