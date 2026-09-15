import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { getCmsPageDefinition } from '@/lib/cms/pageDefinitions';
import { normalizeCmsPageContent } from '@/lib/cms/normalize';
import { getCmsSourceBuilder } from '@/lib/cms/source/registry';
import {
  buildSiteShellContent,
  FEATURE_GATED_HREFS,
  resolveGatedNavLinks,
  type SiteShellContent,
} from '@/lib/cms/source/siteShell';
import { FEATURES } from '@/config/features';

// site-shell(Header/Footer/MobileBottomNav 공통 영역) CMS 소비 배선의 순수 계약 — 브라우저·DB
// 불필요. D6: features.insurance/experts는 관리자에게 보여주는 참고용 스냅샷일 뿐이고, 실제 노출
// 게이팅은 항상 src/config/features.ts(FEATURES)만 신뢰한다 — CMS content는 절대 권한이 없다.

const root = path.resolve(__dirname, '..', '..');

function read(...segments: readonly string[]): string {
  return fs.readFileSync(path.join(root, ...segments), 'utf8');
}

test('siteShellSourceMapper는 siteSettingIds:[\'page-texts\']·bootstrapReady:true이고, build({})의 normalize 결과가 definition.defaultContent와 같다', () => {
  const definition = getCmsPageDefinition('site-shell');
  expect(definition).not.toBeNull();
  if (!definition) return;

  const builder = getCmsSourceBuilder('site-shell');
  expect(builder).not.toBeNull();
  if (!builder) return;

  // B3: page-texts('common.*')를 원본에 포함시켜, 활성화 순간 기존 관리자 덮어쓰기를 보존한다.
  expect(builder.siteSettingIds).toEqual(['page-texts']);
  expect(builder.bootstrapReady).toBe(true);

  const built = builder.build({});
  expect(normalizeCmsPageContent(definition, built)).toEqual(
    normalizeCmsPageContent(definition, definition.defaultContent),
  );
});

test('buildSiteShellContent()도 같은 값을 계산한다(부트스트랩과 소비가 같은 순수 매퍼, D3)', () => {
  const definition = getCmsPageDefinition('site-shell');
  if (!definition) throw new Error('site-shell 정의 없음');
  const built = buildSiteShellContent();
  expect(normalizeCmsPageContent(definition, built)).toEqual(
    normalizeCmsPageContent(definition, definition.defaultContent),
  );
});

test('site-shell defaultContent의 features는 FEATURES 값을 그대로 반영한 참고용 스냅샷이다(D6)', () => {
  const definition = getCmsPageDefinition('site-shell');
  if (!definition) throw new Error('site-shell 정의 없음');
  const content = definition.defaultContent as SiteShellContent;
  expect(content.features).toEqual({ insurance: FEATURES.insurance, experts: FEATURES.experts });
});

test("pageDefinitions.ts의 site-shell 'features' 섹션은 편집 필드가 없다(fields:[]) — 토글로 켜고 끌 수 없다", () => {
  const definition = getCmsPageDefinition('site-shell');
  if (!definition) throw new Error('site-shell 정의 없음');
  const featuresSection = definition.sections.find((section) => section.id === 'features');
  expect(featuresSection).toBeTruthy();
  expect(featuresSection?.fields).toEqual([]);
});

test('resolveGatedNavLinks는 CMS content.visible이 true여도 FEATURES가 꺼진 펫보험/전문가 칼럼 링크를 걸러낸다', () => {
  expect(FEATURES.insurance).toBe(false);
  expect(FEATURES.experts).toBe(false);

  const tamperedCmsLinks = [
    { label: '브랜드', href: '/brands', visible: true },
    { label: '펫보험(CMS가 켜려고 시도)', href: '/insurance', visible: true },
  ];
  const resolved = resolveGatedNavLinks(tamperedCmsLinks, [{ label: '브랜드', href: '/brands' }]);
  expect(resolved.map((link) => link.href)).toEqual(['/brands']);
  expect(resolved.some((link) => link.href === '/insurance')).toBe(false);

  const storyResolved = resolveGatedNavLinks(
    [{ label: '전문가 칼럼(CMS가 켜려고 시도)', href: '/experts', visible: true }],
    [],
  );
  expect(storyResolved).toEqual([]);

  // CMS content가 아예 없을 때(null)의 기본 경로도 같은 게이트를 통과한다.
  const fallbackResolved = resolveGatedNavLinks(undefined, [
    { label: '브랜드', href: '/brands' },
    { label: '펫보험', href: '/insurance' },
  ]);
  expect(fallbackResolved.map((link) => link.href)).toEqual(['/brands']);
});

test('FEATURE_GATED_HREFS는 /insurance·/experts 두 href만 FEATURES 키로 매핑한다', () => {
  expect(FEATURE_GATED_HREFS).toEqual({ '/insurance': 'insurance', '/experts': 'experts' });
});

test('Header.tsx/Footer.tsx가 siteShell prop을 소비하고, 펫보험·전문가 칼럼 게이팅은 FEATURES 기반 헬퍼(resolveGatedNavLinks)로 위임한다', () => {
  const header = read('src', 'components', 'common', 'Header.tsx');
  const footer = read('src', 'components', 'common', 'Footer.tsx');

  expect(header).toContain("from '@/lib/cms/source/siteShell'");
  expect(header).toContain('resolveGatedNavLinks(siteShell?.navigation.mainLinks, ALL_MAIN_LINKS)');
  expect(header).toContain('resolveGatedNavLinks(siteShell?.navigation.storyLinks, ALL_STORY_LINKS)');
  expect(header).toContain("data-cms-managed={managed ? 'site-shell' : undefined}");

  expect(footer).toContain("from '@/lib/cms/source/siteShell'");
  expect(footer).toContain('siteShell?.company');
  expect(footer).toContain('siteShell?.social');
  expect(footer).toContain("data-cms-managed={managed ? 'site-shell' : undefined}");

  // Header.tsx는 이제 FEATURES를 직접 import하지 않는다 — 게이팅 로직 자체가
  // resolveGatedNavLinks(siteShell.ts)로 옮겨졌고, Header는 그 결과만 소비한다.
  expect(header).not.toMatch(/from '@\/config\/features'/);
});

test('layout.tsx가 getPublishedPageContent(\'site-shell\')로 CMS 콘텐츠를 읽어 AppShell에 내려준다', () => {
  const layout = read('src', 'app', 'layout.tsx');
  expect(layout).toContain("getPublishedPageContent<SiteShellContent>('site-shell')");
  expect(layout).toContain('<AppShell siteShell={siteShell}>');
});

test('AppShell은 Header/Footer에는 siteShell을 넘기지만 MobileBottomNav에는 넘기지 않는다(CMS 편집 대상 문구가 없음)', () => {
  const appShell = read('src', 'components', 'common', 'AppShell.tsx');
  expect(appShell).toContain('<Header siteShell={siteShell} />');
  expect(appShell).toContain("<Footer variant={isHome ? 'home' : 'default'} siteShell={siteShell} />");
  expect(appShell).toContain('<MobileBottomNav />');
  expect(appShell).not.toContain('<MobileBottomNav siteShell');
});

// B3 회귀 방지 — site-shell 매퍼가 page-texts('common.*') 관리자 덮어쓰기를 무시하고 활성화
// 순간 상수로 되돌리던 버그의 계약 스펙.
test('buildSiteShellContent는 page-texts의 common.navBrand 덮어쓰기를 mainLinks 라벨에 반영한다', () => {
  const overriddenSettings = {
    version: 1 as const,
    values: { 'common.navBrand': '브랜드관' },
  };
  const content = buildSiteShellContent(overriddenSettings);
  const brandLink = content.navigation.mainLinks.find((link) => link.href === '/brands');
  expect(brandLink?.label).toBe('브랜드관');
});

test('buildSiteShellContent는 page-texts의 common.footerRefund 덮어쓰기를 footerLinks 라벨에 반영한다', () => {
  const overriddenSettings = {
    version: 1 as const,
    values: { 'common.footerRefund': '배송/환불 안내' },
  };
  const content = buildSiteShellContent(overriddenSettings);
  const refundLink = content.navigation.footerLinks.find((link) => link.href === '/refund-policy');
  expect(refundLink?.label).toBe('배송/환불 안내');
});

test('buildSiteShellContent는 page-texts의 common.brandBrowse/needBrowse 덮어쓰기를 shopDropdown 라벨에 반영한다', () => {
  const overriddenSettings = {
    version: 1 as const,
    values: { 'common.brandBrowse': '브랜드 탐색', 'common.needBrowse': '카테고리 탐색' },
  };
  const content = buildSiteShellContent(overriddenSettings);
  expect(content.navigation.shopDropdown.brandBrowseLabel).toBe('브랜드 탐색');
  expect(content.navigation.shopDropdown.needBrowseLabel).toBe('카테고리 탐색');
});

test('siteShellSourceMapper.build는 sources[\'page-texts\']를 읽어 활성화 시점 덮어쓰기를 보존한다', () => {
  const builder = getCmsSourceBuilder('site-shell');
  expect(builder).not.toBeNull();
  if (!builder) return;
  const definition = getCmsPageDefinition('site-shell');
  expect(definition).not.toBeNull();
  if (!definition) return;

  const built = builder.build({
    'page-texts': {
      value: { version: 1, values: { 'common.navCare': '케어관' } },
      updated_at: '2026-09-15T00:00:00.000Z',
    },
  });
  const normalized = normalizeCmsPageContent(definition, built) as unknown as SiteShellContent;
  const careLink = normalized.navigation.mainLinks.find((link) => link.href === '/concerns');
  expect(careLink?.label).toBe('케어관');
});

test('Header.tsx는 siteShell.navigation.shopDropdown 라벨을 소비한다(B3)', () => {
  const header = read('src', 'components', 'common', 'Header.tsx');
  expect(header).toContain('siteShell?.navigation.shopDropdown.brandBrowseLabel');
  expect(header).toContain('siteShell?.navigation.shopDropdown.needBrowseLabel');
});
