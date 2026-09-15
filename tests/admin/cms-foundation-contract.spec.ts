import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { normalizeCmsPageContent } from '@/lib/cms/normalize';
import { CMS_PAGE_DEFINITIONS, getCmsPageDefinition } from '@/lib/cms/pageDefinitions';

const root = path.resolve(__dirname, '..', '..');

for (const empty of [false, true]) {
  test(`home CMS preserves structural content with ${empty ? 'empty' : 'extended'} cards`, () => {
    const definition = getCmsPageDefinition('home');
    if (!definition) throw new Error('home definition missing');
    const input = {
      futureRoot: { nested: ['keep'] },
      hero: { desktopImage: '/desktop.webp', mobileImage: '/mobile.webp', href: '/shop', visible: false, titleLines: [], futureHero: { keep: true } },
      quickShop: { links: [{ name: '', href: '/shop', icon: 'star', visible: false, futureLink: [] }] },
      curation: { cards: empty ? [] : Array.from({ length: 12 }, (_, index) => ({ title: `card ${index}`, desc: ' long '.repeat(1500), image: '/card.webp', href: '/brands', visible: false, futureCard: { keep: [] } })) },
      solutions: { cards: [] },
    };
    const saved = normalizeCmsPageContent(definition, input);
    const readBack = normalizeCmsPageContent(definition, JSON.parse(JSON.stringify(saved)));
    expect(readBack).toEqual(input);
    expect(readBack).not.toBe(input);
  });
}

function read(...segments: readonly string[]): string {
  return fs.readFileSync(path.join(root, ...segments), 'utf8');
}

function extendContent(value: unknown, empty: boolean): unknown {
  if (Array.isArray(value)) {
    return empty ? [] : [...value, ...value, ...value].map((item) => extendContent(item, empty));
  }
  if (value !== null && typeof value === 'object') {
    return { ...Object.fromEntries(Object.entries(value).map(([key, item]) => [key, extendContent(item, empty)])), futureField: { nested: [], keep: false } };
  }
  return value;
}

for (const definition of CMS_PAGE_DEFINITIONS) {
  for (const empty of [false, true]) {
    test(`${definition.key} preserves nested extensions and ${empty ? 'empty' : 'extended'} arrays`, () => {
      const input = extendContent(normalizeCmsPageContent(definition, definition.defaultContent), empty);
      expect(normalizeCmsPageContent(definition, input)).toEqual(input);
    });
  }
}

test('0164 binds bootstrap content inside both row locks and closes older RPC access', () => {
  const sql = read('supabase', 'migrations', '0164_cms_activation_contract.sql');
  const [ordinary, guarded] = sql.split('create or replace function public.publish_audit_cms_from_source(');
  expect(ordinary.indexOf('for update;')).toBeLessThan(ordinary.indexOf("raise exception 'initial-import-required'"));
  expect(ordinary.indexOf("raise exception 'initial-import-required'")).toBeLessThan(ordinary.indexOf('insert into public.cms_page_versions'));
  expect(ordinary).toContain('p_expected_revision is null');
  const sourceLock = guarded.indexOf("where id = 'page-texts'\n  for update;");
  const sourceCheck = guarded.indexOf('v_source.value is distinct from p_expected_source_value');
  const timeCheck = guarded.indexOf('v_source.updated_at is distinct from p_expected_source_updated_at');
  const pageLock = guarded.indexOf("where page_key = 'audit'\n  for update;");
  const revisionCheck = guarded.indexOf('v_page.draft_revision is distinct from p_expected_revision');
  const contentCheck = guarded.indexOf('v_page.draft_content is distinct from p_expected_content');
  const archive = guarded.indexOf('insert into public.cms_page_versions');
  expect(sourceLock).toBeGreaterThan(0);
  expect([sourceLock, sourceCheck, timeCheck, pageLock, revisionCheck, contentCheck, archive]).toEqual(
    [sourceLock, sourceCheck, timeCheck, pageLock, revisionCheck, contentCheck, archive].toSorted((a, b) => a - b),
  );
  expect(guarded).not.toContain('from public.publish_cms_page(');
  expect(sql).toMatch(/publish_audit_cms_from_source\(bigint, jsonb, timestamptz, uuid\)\s+from public, anon, authenticated, service_role;/);
  expect(sql).toMatch(/revoke all on function public.publish_cms_page\(text, bigint, uuid\) from public, anon, authenticated;/);
  expect(sql).toMatch(/grant execute on function public.publish_audit_cms_from_source\(bigint, jsonb, timestamptz, uuid, jsonb\)\s+to service_role;/);
  for (const body of [ordinary, guarded]) {
    expect(body).toContain('on conflict (page_key, revision) do nothing');
    expect(body).toContain('v_existing_version.content <> v_published_content');
    expect(body).not.toMatch(/(?:update|delete from)\s+public\.cms_page_versions/i);
  }
});

test('cms foundation migration is additive and does not overwrite existing page content', () => {
  const migration = read('supabase', 'migrations', '0162_cms_foundation_reconcile.sql');

  expect(migration).toContain('create table if not exists public.cms_pages');
  expect(migration).toContain('alter table public.cms_pages add column if not exists');
  expect(migration).toContain('revoke all on table public.cms_pages from anon, authenticated, public');
  expect(migration).toContain('revoke all on table public.cms_page_versions from anon, authenticated, public');
  expect(migration).toContain('on conflict (page_key) do nothing');
  expect(migration).not.toContain('update public.cms_pages as page');
  expect(migration).not.toContain('set draft_content');
  expect(migration).not.toContain('jsonb_array_elements');
  expect(migration).not.toContain("from public.site_settings");
});

test('cms publish is revision guarded and keeps archived versions immutable', () => {
  const migration = read('supabase', 'migrations', '0162_cms_foundation_reconcile.sql');

  expect(migration).toContain('for update');
  expect(migration).toContain('v_page.draft_revision <> p_expected_revision');
  expect(migration).toContain("raise exception 'cms-revision-conflict' using errcode = '40001'");
  expect(migration).toContain("on conflict (page_key, revision) do nothing");
  expect(migration).toContain('v_existing_version.content <> v_published_content');
  expect(migration).not.toContain('on conflict (page_key, revision) do update');
});

test('cms repo gates public reads by managed published marker and strips it from consumers', () => {
  const repo = read('src', 'lib', 'cms', 'repo.ts');

  expect(repo).toContain('export const CMS_MANAGED_VERSION = 1');
  expect(repo).toContain('content.__managedVersion !== CMS_MANAGED_VERSION');
  expect(repo).toContain('stripManagedMarker');
  expect(repo).toContain('return null');
});

test('cms admin routes keep PR311 response contract and DB admin authorization', () => {
  const detailRoute = read('src', 'app', 'api', 'admin', 'settings', 'pages', '[pageKey]', 'route.ts');
  const listRoute = read('src', 'app', 'api', 'admin', 'settings', 'pages', 'route.ts');
  const normalize = read('src', 'lib', 'cms', 'normalize.ts');

  expect(listRoute).toContain("import { requireAdmin } from '@/lib/admin/requireAdmin'");
  expect(detailRoute).toContain("import { requireAdmin } from '@/lib/admin/requireAdmin'");
  expect(detailRoute).toContain('!isCmsContentInput(contentInput)');
  expect(detailRoute).toContain('content: normalizeCmsPageContent(definition, page.draftContent)');
  expect(detailRoute).toContain('draftRevision: page.draftRevision');
  expect(detailRoute).toContain('publishedRevision: page.publishedRevision');
  expect(detailRoute).toContain('publishedAt: page.publishedAt');
  expect(detailRoute).toContain('versions');
  expect(detailRoute).toContain("{ error: 'revision-conflict'");
  expect(detailRoute).toContain('{ status: 409 }');
  expect(normalize).toContain('const result = isObject(value) ? clone(value) : clone(definition.defaultContent)');
  expect(normalize).not.toContain('.slice(0, 30)');
  expect(normalize).not.toContain('.slice(0, 500)');
  expect(normalize).not.toContain('.slice(0, 5000)');
});

test('cms normalization round-trips unknown fields, empty items, and deliberate whitespace', () => {
  const definition = getCmsPageDefinition('audit');
  expect(definition).not.toBeNull();
  if (!definition) return;

  const input = {
    hero: {
      visible: true,
      eyebrow: '  deliberate spacing  ',
      title: 'Audit title',
      description: 'Audit description',
      image: '/image.webp',
      imageAlt: '',
      primaryCtaLabel: '',
      primaryCtaHref: '',
      secondaryCtaLabel: '',
      secondaryCtaHref: '',
      overlayText: '',
      futureHeroField: { keep: true },
    },
    checkpoints: {
      visible: true,
      eyebrow: '',
      title: '',
      description: '',
      items: [
        { number: '', title: '', description: '', bullets: '', visible: true, futureItemField: 'keep' },
      ],
      futureSectionField: 'keep',
    },
    futureRootField: ['keep'],
  };

  const normalized = normalizeCmsPageContent(definition, input);
  expect(normalized.futureRootField).toEqual(['keep']);
  expect((normalized.hero as Record<string, unknown>).eyebrow).toBe('  deliberate spacing  ');
  expect((normalized.hero as Record<string, unknown>).futureHeroField).toEqual({ keep: true });
  const checkpoints = normalized.checkpoints as Record<string, unknown>;
  expect(checkpoints.futureSectionField).toBe('keep');
  expect(checkpoints.items).toEqual([
    { number: '', title: '', description: '', bullets: '', visible: true, futureItemField: 'keep' },
  ]);
});

test('audit definition exposes current rendered fields without active overlayText editor', () => {
  const definition = getCmsPageDefinition('audit');
  expect(definition).not.toBeNull();
  if (!definition) return;

  const fieldPaths = definition.sections.flatMap((section) => section.fields.map((field) => field.path));
  expect(fieldPaths).toContain('hero.imageCaptionLine1');
  expect(fieldPaths).toContain('hero.imageCaptionLine2');
  expect(fieldPaths).toContain('checkpoints.ariaLabel');
  expect(fieldPaths).toContain('process.ariaLabel');
  expect(fieldPaths).toContain('status.ariaLabel');
  expect(fieldPaths).not.toContain('hero.overlayText');

  const hero = definition.defaultContent.hero as Record<string, unknown>;
  expect(hero.imageCaptionLine1).toBeTruthy();
  expect(hero.imageCaptionLine2).toBeTruthy();
  expect(hero.overlayText).toBeTruthy();
});

test('audit process item number is editable without adding unrelated fields', () => {
  const definition = getCmsPageDefinition('audit');
  expect(definition).not.toBeNull();
  if (!definition) return;

  const processItems = definition.sections
    .flatMap((section) => section.fields)
    .find((field) => field.path === 'process.items');
  expect(processItems?.itemFields?.map((field) => field.key)).toEqual([
    'number',
    'title',
    'description',
    'visible',
  ]);
});

test('cms restore writes draft only and public content endpoint exposes published content only', () => {
  const detailRoute = read('src', 'app', 'api', 'admin', 'settings', 'pages', '[pageKey]', 'route.ts');
  const publicRoute = read('src', 'app', 'api', 'content', '[pageKey]', 'route.ts');
  const repo = read('src', 'lib', 'cms', 'repo.ts');

  expect(detailRoute).toContain('restoreCmsPageVersionDraft');
  expect(detailRoute).toContain('return NextResponse.json({');
  expect(detailRoute).not.toContain('publishCmsPage({\n      pageKey,\n      sourceRevision');
  expect(repo).toContain('return saveCmsPageDraft({');
  expect(publicRoute).toContain('getPublishedPageContent(pageKey)');
  expect(publicRoute).toContain('{ content }');
  expect(publicRoute).toContain("'Cache-Control': 'no-store'");
});
