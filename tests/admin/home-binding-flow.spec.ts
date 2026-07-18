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
    // 공지도 DB 정본(notices_config) — 서버 wrapper 가 repo 폴백 조회로 읽어 props 로 주입한다.
    expect(pageSource).toContain("import { getNoticesConfigWithFallback } from '@/lib/notices/repo'");
    expect(pageSource).toContain('getNoticesConfigWithFallback()');
    // 전시 후기도 DB 정본(showcase_reviews_config) — 서버 wrapper 가 repo 폴백 조회로 읽어 props 로 주입한다.
    expect(pageSource).toContain("import { getShowcaseReviewsConfigWithFallback } from '@/lib/reviews/repo'");
    expect(pageSource).toContain('getShowcaseReviewsConfigWithFallback()');
    // PR #112: 홈 문구 정본이 관리자 설정으로 이관되며 settings prop 이 추가됐다(옵셔널·기본값 폴백).
    expect(pageSource).toContain('<HomeClient products={products} brands={brands} notices={noticesConfig.items} reviews={reviewsConfig.items.filter((review) => review.isVisible !== false)} settings={settings ?? defaultHomeSettings} />');
    expectNoMutableDataBypass(pageSource);
  });

  test('HomeClient 는 관리자 변경 대상 products/brands/notices 를 props 로만 받고 정적 콘텐츠만 직접 import 한다', () => {
    const clientSource = src('src', 'components', 'home', 'HomeClient.tsx');

    // PR #112: settings prop 추가로 시그니처가 멀티라인이 됐다 — 구성 요소별로 검증한다.
    expect(clientSource).toContain('export default function HomeClient({');
    expect(clientSource).toContain('settings = defaultHomeSettings,');
    expect(clientSource).toContain('products: Product[];');
    expect(clientSource).toContain('brands: Brand[];');
    expect(clientSource).toContain('notices: Notice[];');
    expect(clientSource).toContain('settings?: HomeSettings;');
    expect(clientSource).toContain('products.filter((product) => product.isBest || product.isRecommended)');
    expect(clientSource).toContain('brands.filter(b => b.isVisible !== false)');
    // notices 는 DB 정본으로 이관 — 정적 import 금지, 서버 wrapper 가 props 로 주입한다.
    expect(clientSource).not.toMatch(/from ['"]@\/data\/notices['"]/);
    expect(clientSource).toContain('notices.slice(0, 4)');
    // 전시 후기도 DB 정본으로 이관 — 정적 import 금지, 서버 wrapper 가 props 로 주입한다.
    expect(clientSource).not.toMatch(/from ['"]@\/data\/reviews['"]/);
    expect(clientSource).toContain('reviews: Review[];');
    expectNoMutableDataBypass(clientSource);
  });

  test('홈 브랜드 슬라이더도 전달받은 브랜드 props 만 렌더한다', () => {
    const sliderSource = src('src', 'components', 'home', 'BrandShowcaseSlider.tsx');

    expect(sliderSource).toContain('brands: Brand[]');
    // dad 모바일 개편(2026-07-18)으로 셔플/8개 제한이 제거되고 props 를 그대로 렌더한다.
    expect(sliderSource).toContain('const displayList = brands;');
    expect(sliderSource).toContain('displayList.map');
    expectNoMutableDataBypass(sliderSource);
  });
});
