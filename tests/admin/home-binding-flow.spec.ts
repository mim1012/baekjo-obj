import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');
const src = (...segments: string[]) => fs.readFileSync(path.join(root, ...segments), 'utf8');
function expectNoMutableDataBypass(source: string): void {
  expect(source).not.toMatch(/from ['"][^'"]*data\/(?:products|brands)['"]/);
  expect(source).not.toContain('@/lib/storage');
  expect(source).not.toContain('fetch(');
  expect(source).not.toContain('localStorage');
  expect(source).not.toContain('sessionStorage');
}


test.describe('홈 공개 화면 데이터 바인딩', () => {
  test('홈 서버 wrapper 는 현재 공개 Home 을 canonical 로 유지하며 products/brands repo 를 읽는다', () => {
    const pageSource = src('src', 'app', 'page.tsx');

    expect(pageSource).toContain("import { listProducts } from '@/lib/products/repo'");
    expect(pageSource).toContain("import { listBrands } from '@/lib/brands/repo'");
    expect(pageSource).toContain("export const dynamic = 'force-dynamic'");
    expect(pageSource).toContain('listProducts({ visibleOnly: true })');
    expect(pageSource).toContain('listBrands(true)');
    // PR #112: 홈 문구 정본이 관리자 설정으로 이관되며 settings prop 이 추가됐다(옵셔널·기본값 폴백).
    expect(pageSource).toContain('<HomeClient products={products} brands={brands} settings={settings ?? defaultHomeSettings} />');
    expectNoMutableDataBypass(pageSource);
  });

  test('HomeClient 는 관리자 변경 대상 products/brands 를 props 로만 받고 정적 콘텐츠만 직접 import 한다', () => {
    const clientSource = src('src', 'components', 'home', 'HomeClient.tsx');

    // PR #112: settings prop 추가로 시그니처가 멀티라인이 됐다 — 구성 요소별로 검증한다.
    expect(clientSource).toContain('export default function HomeClient({');
    expect(clientSource).toContain('settings = defaultHomeSettings,');
    expect(clientSource).toContain('products: Product[];');
    expect(clientSource).toContain('brands: Brand[];');
    expect(clientSource).toContain('settings?: HomeSettings;');
    expect(clientSource).toContain('products.filter((product) => product.isBest || product.isRecommended)');
    expect(clientSource).toContain('brands.filter(b => b.isVisible !== false)');
    expect(clientSource).toContain("import { notices } from '@/data/notices'");
    expect(clientSource).toContain("import { reviews } from '@/data/reviews'");
    expectNoMutableDataBypass(clientSource);
  });

  test('홈 브랜드 슬라이더도 전달받은 브랜드 props 만 렌더한다', () => {
    const sliderSource = src('src', 'components', 'home', 'BrandShowcaseSlider.tsx');

    expect(sliderSource).toContain('brands: Brand[]');
    expect(sliderSource).toContain('const [shuffledBrands, setShuffledBrands] = useState<Brand[]>(brands)');
    expect(sliderSource).toContain('const selected = brands.slice(0, 8)');
    expect(sliderSource).toContain('displayList.map');
    expectNoMutableDataBypass(sliderSource);
  });
});
