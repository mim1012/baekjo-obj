import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  defaultPageTextSettings,
  normalizePageTextSettings,
  pageTextDefinitions,
  pageTextDefinitionsForPath,
  pageTextReplacementMap,
  validatePageTextSettings,
} from '@/data/pageTextContent';
import {
  defaultBrandPageCopy,
  normalizeBrandPageCopy,
  renderBrandPageCopy,
} from '@/lib/brands/pageCopy';

const root = path.resolve(__dirname, '..', '..');
const source = (...segments: string[]) => fs.readFileSync(path.join(root, ...segments), 'utf8');

test.describe('전체 페이지 문구 환경설정 계약', () => {
  test('공개 페이지 경로를 빠짐없이 등록하고 브랜드 상세만 브랜드별 편집으로 제외한다', () => {
    const expectedPaths = [
      '/audit', '/auth/complete', '/auth/complete-profile', '/b2b', '/brands', '/cart',
      '/checkout', '/concerns', '/concerns/[slug]', '/diagnosis', '/diagnosis/result', '/experts',
      '/forgot-password', '/insurance', '/insurance/apply', '/insurance/complete',
      '/insurance/recommend', '/landing/care-kit', '/landing/insurance', '/login', '/mypage',
      '/notices', '/notices/[id]', '/order-complete', '/privacy', '/refund-policy', '/reset-password',
      '/reviews', '/shop', '/shop/[id]', '/signup', '/terms', '/verify-email',
    ];
    const registered = new Set(pageTextDefinitions.map((page) => page.path));
    for (const pagePath of expectedPaths) expect(registered.has(pagePath), pagePath).toBe(true);

    expect(pageTextDefinitionsForPath('/brands/sample')).toHaveLength(1);
    expect(pageTextDefinitionsForPath('/brands/sample')[0].id).toBe('common');
    expect(pageTextDefinitionsForPath('/shop/sample').map((page) => page.id)).toEqual([
      'common',
      'productDetail',
    ]);
  });

  test('부분·구버전 설정은 기본값으로 복구하고 미등록 키/과대 입력은 저장 검증에서 거부한다', () => {
    const normalized = normalizePageTextSettings({ values: { 'shop.title': '바꾼 제목' } });
    expect(normalized.values['shop.title']).toBe('바꾼 제목');
    expect(normalized.values['login.title']).toBe(defaultPageTextSettings.values['login.title']);
    expect(validatePageTextSettings(normalized)).toBe(true);
    expect(validatePageTextSettings({ values: { 'unknown.key': 'x' } })).toBe(false);
    expect(validatePageTextSettings({ values: { 'shop.title': 'x'.repeat(20_001) } })).toBe(false);
  });

  test('현재 경로의 변경값만 고객 화면 치환표에 포함한다', () => {
    const settings = normalizePageTextSettings({
      values: {
        'shop.title': '새 상품관 제목',
        'login.title': '새 로그인 제목',
      },
    });
    const shop = pageTextReplacementMap('/shop', settings);
    expect([...shop.values()]).toContain('새 상품관 제목');
    expect([...shop.values()]).not.toContain('새 로그인 제목');
  });

  test('공개/관리자 API는 폴백, 관리자 재검증, 입력검증, 캐시 무효화를 갖는다', () => {
    const publicRoute = source('src', 'app', 'api', 'page-texts', 'route.ts');
    const adminRoute = source('src', 'app', 'api', 'admin', 'page-texts', 'route.ts');
    expect(publicRoute).toContain('defaultPageTextSettings');
    expect(publicRoute).toContain('getCachedPageTextSettings');
    expect(adminRoute).toContain('const admin = await requireAdmin()');
    expect(adminRoute).toContain('validatePageTextSettings(body)');
    expect(adminRoute).toContain('savePageTextSettings(normalizePageTextSettings(body))');
    expect(adminRoute).toContain('revalidateTag(PUBLIC_READ_CACHE_TAGS.pageTexts');
  });

  test('환경설정 화면과 공개 런타임이 API에 연결되고 HTML 삽입 sink를 쓰지 않는다', () => {
    const editor = source('src', 'components', 'admin-new', 'settings', 'PageTextSettingsEditor.tsx');
    const runtime = source('src', 'components', 'providers', 'PageTextRuntime.tsx');
    const settingsPage = source('src', 'app', 'admin', 'settings', 'page.tsx');
    expect(editor).toContain("fetch('/api/page-texts'");
    expect(editor).toContain("fetch('/api/admin/page-texts'");
    expect(settingsPage).toContain('<PageTextSettingsEditor />');
    expect(runtime).toContain("fetch('/api/page-texts'");
    expect(runtime).toContain('new MutationObserver');
    expect(runtime).not.toContain('dangerouslySetInnerHTML');
    expect(runtime).not.toContain('innerHTML');
  });
});

test.describe('브랜드 상세페이지 문구 분리 계약', () => {
  test('브랜드별 문구는 안전한 기본값과 브랜드명 템플릿을 제공한다', () => {
    const normalized = normalizeBrandPageCopy({ productsTitle: '이 브랜드의 추천' });
    expect(normalized.productsTitle).toBe('이 브랜드의 추천');
    expect(normalized.reviewsTitle).toBe(defaultBrandPageCopy.reviewsTitle);
    expect(renderBrandPageCopy('{brand} 상품을 만나보세요.', '테스트 브랜드')).toBe(
      '테스트 브랜드 상품을 만나보세요.',
    );
  });

  test('브랜드 API 화이트리스트·편집 폼·고객 상세 렌더가 pageCopy로 연결된다', () => {
    const validator = source('src', 'lib', 'brands', 'validate.ts');
    const repo = source('src', 'lib', 'brands', 'repo.ts');
    const payload = source('src', 'lib', 'brands', 'formPayload.ts');
    const editor = source('src', 'components', 'admin-new', 'brands', 'BrandDetailEditor.tsx');
    const detail = source('src', 'app', 'brands', '[id]', 'page.tsx');
    expect(validator).toContain('out.pageCopy = normalizeBrandPageCopy(pageCopy)');
    expect(repo).toContain('pageCopy: normalizeBrandPageCopy(d.pageCopy)');
    expect(payload).toContain('pageCopy: normalizeBrandPageCopy(form.pageCopy)');
    expect(editor).toContain('브랜드 상세페이지 문구');
    expect(editor).toContain('brandPageCopyFields.map');
    expect(detail).toContain('const pageCopy = normalizeBrandPageCopy(brand.pageCopy)');
    expect(detail).toContain('{pageCopy.productsTitle}');
    expect(detail).toContain('{pageCopy.otherBrandsButtonLabel}');
  });
});
