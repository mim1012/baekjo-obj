import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { defaultHomeSettings, normalizeHomeSettings, type HomeSettings } from '@/data/homeContent';
import { normalizeCmsPageContent } from '@/lib/cms/normalize';
import { getCmsPageDefinition } from '@/lib/cms/pageDefinitions';
import { getCmsSourceBuilder } from '@/lib/cms/source/registry';
import {
  buildHomeContent,
  selectHomeContent,
  homeSourceMapper,
  type HomeCmsContent,
} from '@/lib/cms/source/home';

// home 페이지의 CMS 소비 연결(D3/D5) 순수 계약 스펙 — 브라우저·DB 불필요.
// 다른 CMS 페이지처럼 audit.ts 패턴을 재사용하되, home 은 site_settings('home') 이 원본이고
// 정의(sections)는 text/textarea 문구만 다룬다(구조 배열은 정의 밖 — normalizeHomeSettings 가
// 이미 보장). 이 스펙은 그 경계를 계약으로 고정한다.

const root = path.resolve(__dirname, '..', '..');

function readSource(...segments: readonly string[]): string {
  return fs.readFileSync(path.join(root, ...segments), 'utf8');
}

test('home source mapper is registered with the real (bootstrapReady, site_settings id=home) mapper', () => {
  const builder = getCmsSourceBuilder('home');
  expect(builder).not.toBeNull();
  expect(builder).toBe(homeSourceMapper);
  expect(builder?.bootstrapReady).toBe(true);
  expect(builder?.siteSettingIds).toEqual(['home']);
});

test('home source mapper reproduces defaultHomeSettings from the default home row', () => {
  const definition = getCmsPageDefinition('home');
  expect(definition).not.toBeNull();
  if (!definition) return;

  const built = homeSourceMapper.build({
    home: { value: defaultHomeSettings, updated_at: '2026-09-15T00:00:00.000Z' },
  });
  expect(normalizeCmsPageContent(definition, built)).toEqual(
    normalizeCmsPageContent(definition, definition.defaultContent),
  );
});

test('home source mapper falls back to defaultHomeSettings when the site_settings row is missing', () => {
  expect(buildHomeContent({})).toEqual(defaultHomeSettings);
  expect(buildHomeContent({ home: null })).toEqual(defaultHomeSettings);
});

test('app/page.tsx consumes getPublishedPageContent("home") and marks the managed root with data-cms-managed', () => {
  const pageSource = readSource('src', 'app', 'page.tsx');
  expect(pageSource).toContain("getPublishedPageContent<HomeCmsContent>('home')");
  expect(pageSource).toContain('cmsManaged={cmsHome !== null}');

  const homeClientSource = readSource('src', 'components', 'home', 'HomeClient.tsx');
  expect(homeClientSource).toContain("data-cms-managed={cmsManaged ? 'home' : undefined}");
});

test('home definition sections are text/textarea only (no item-list) and never declare the structural array fields', () => {
  const definition = getCmsPageDefinition('home');
  expect(definition).not.toBeNull();
  if (!definition) return;

  const declaredPaths = definition.sections.flatMap((section) => section.fields.map((field) => field.path));
  const declaredTypes = new Set(definition.sections.flatMap((section) => section.fields.map((field) => field.type)));

  expect(declaredTypes).toEqual(new Set(['text', 'textarea']));
  for (const structuralPath of ['quickShop.links', 'curation.cards', 'audit.criteria', 'solutions.cards']) {
    expect(declaredPaths).not.toContain(structuralPath);
  }
  // titleLines 류 string[] 필드는 textarea 로 선언되어 있다(D5).
  expect(declaredPaths).toContain('hero.titleLines');
  const titleLinesField = definition.sections
    .flatMap((section) => section.fields)
    .find((field) => field.path === 'hero.titleLines');
  expect(titleLinesField?.type).toBe('textarea');
});

test('textarea line join/split round-trip for hero.titleLines through normalizeCmsPageContent', () => {
  const definition = getCmsPageDefinition('home');
  expect(definition).not.toBeNull();
  if (!definition) return;

  // 편집기가 줄바꿈으로 합쳐진 문자열을 보내는 경우(join) → 배열로 분리(split)돼야 한다.
  const fromJoinedString = normalizeCmsPageContent(definition, {
    ...defaultHomeSettings,
    hero: { ...defaultHomeSettings.hero, titleLines: '첫째 줄\n둘째 줄' },
  });
  expect(fromJoinedString.hero).toMatchObject({ titleLines: ['첫째 줄', '둘째 줄'] });

  // 이미 배열로 저장된 경우(정상 라운드트립) → 그대로 보존돼야 한다.
  const fromArray = normalizeCmsPageContent(definition, {
    ...defaultHomeSettings,
    hero: { ...defaultHomeSettings.hero, titleLines: ['A', 'B', 'C'] },
  });
  expect(fromArray.hero).toMatchObject({ titleLines: ['A', 'B', 'C'] });

  // 빈 배열은 기본값으로 되돌리지 않고 빈 배열 그대로 보존된다(cms-foundation-contract.spec.ts의
  // "home CMS preserves structural content" 케이스와 동일한 규약).
  const fromEmptyArray = normalizeCmsPageContent(definition, {
    ...defaultHomeSettings,
    hero: { ...defaultHomeSettings.hero, titleLines: [] },
  });
  expect(fromEmptyArray.hero).toMatchObject({ titleLines: [] });
});

test('selectHomeContent lets a managed CMS payload win, and preserves fields the home definition does not declare', () => {
  const cmsContentWithFutureField = {
    ...defaultHomeSettings,
    hero: { ...defaultHomeSettings.hero, eyebrow: 'CMS 문구' },
    futureField: { keep: true },
  } as HomeCmsContent;

  const selected = selectHomeContent(cmsContentWithFutureField, null);
  expect(selected.hero.eyebrow).toBe('CMS 문구');
  expect((selected as unknown as { futureField?: unknown }).futureField).toEqual({ keep: true });
});

test('selectHomeContent falls back to the existing site_settings path unchanged when there is no published CMS content', () => {
  const settingsFromSiteSettings: HomeSettings = normalizeHomeSettings({
    hero: { ...defaultHomeSettings.hero, eyebrow: 'site_settings 문구' },
  });
  expect(selectHomeContent(null, settingsFromSiteSettings)).toBe(settingsFromSiteSettings);
  expect(selectHomeContent(null, null)).toBe(defaultHomeSettings);
});
