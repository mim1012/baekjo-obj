import { expect, test } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');
const script = path.join(root, 'scripts', 'cms-current-content-snapshot.mjs');

function readScript(scriptPath: string): string {
  return fs.readFileSync(scriptPath, 'utf8');
}

type Snapshot = Readonly<{
  schemaVersion: 1;
  capturedAt: string;
  ref: string;
  source: string;
  mappingPolicy: string;
  expectedSiteSettings: readonly string[];
  totals: Readonly<{ cmsPages: number; archivedVersions: number; siteSettings: number }>;
  cmsPages: readonly CmsPageEntry[];
  archivedVersions: readonly CmsVersionEntry[];
  siteSettings: readonly SiteSettingEntry[];
}>;

type CmsPageEntry = Readonly<{
  pageKey: string;
  route: string;
  title: string;
  draftRevision: number;
  publishedRevision: number | null;
  updatedAt: string;
  publishedAt: string | null;
  draftContentHash: string;
  publishedContentHash: string | null;
}>;

type CmsVersionEntry = Readonly<{
  pageKey: string;
  revision: number;
  publishedAt: string;
  contentHash: string;
}>;

type SiteSettingEntry = Readonly<{
  id: string;
  updatedAt: string;
  valueHash: string;
}>;

function fixture(overrides: Partial<Snapshot> = {}): Snapshot {
  const cmsPages = overrides.cmsPages ?? [
    {
      pageKey: 'audit',
      route: '/audit',
      title: 'Audit 소개',
      draftRevision: 2,
      publishedRevision: 1,
      updatedAt: '2026-09-15T00:00:00.000Z',
      publishedAt: '2026-09-15T00:00:00.000Z',
      draftContentHash: 'draft-audit-v2',
      publishedContentHash: 'published-audit-v1',
    },
  ];
  const archivedVersions = overrides.archivedVersions ?? [
    {
      pageKey: 'audit',
      revision: 1,
      publishedAt: '2026-09-15T00:00:00.000Z',
      contentHash: 'archived-audit-v1',
    },
  ];
  const siteSettings = overrides.siteSettings ?? [
    { id: 'home', updatedAt: '2026-09-15T00:00:00.000Z', valueHash: 'home-hash' },
    { id: 'page-texts', updatedAt: '2026-09-15T00:00:00.000Z', valueHash: 'page-texts-hash' },
  ];
  return {
    schemaVersion: 1,
    capturedAt: '2026-09-15T00:00:00.000Z',
    ref: 'aeooyivfijthfcrfrnyk',
    source: 'supabase-management-api-read-only',
    mappingPolicy: 'identity-only: cms page_key/revision and site_settings id; no field mapping inferred',
    expectedSiteSettings: ['home', 'page-texts'],
    totals: { cmsPages: cmsPages.length, archivedVersions: archivedVersions.length, siteSettings: siteSettings.length },
    cmsPages,
    archivedVersions,
    siteSettings,
    ...overrides,
  };
}

function runCompare(before: unknown, after: unknown) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cms-snapshot-'));
  const beforePath = path.join(dir, 'before.json');
  const afterPath = path.join(dir, 'after.json');
  fs.writeFileSync(beforePath, `${JSON.stringify(before, null, 2)}\n`, 'utf8');
  fs.writeFileSync(afterPath, `${JSON.stringify(after, null, 2)}\n`, 'utf8');
  return spawnSync(process.execPath, [script, 'compare', beforePath, afterPath], {
    cwd: root,
    encoding: 'utf8',
    timeout: 10_000,
  });
}

function parseReport(stdout: string): Readonly<Record<string, unknown>> {
  const parsed: unknown = JSON.parse(stdout);
  expect(parsed).toEqual(expect.objectContaining({ status: expect.any(String) }));
  return parsed as Readonly<Record<string, unknown>>;
}

test.describe('cms current content snapshot tool', () => {
  test('script is syntactically valid without making network calls', () => {
    const result = spawnSync(process.execPath, ['--check', script], {
      cwd: root,
      encoding: 'utf8',
      timeout: 10_000,
    });

    expect(result.status, result.stderr).toBe(0);
  });

  test('comparison fails when archived content hash changes', () => {
    const after = fixture({
      archivedVersions: [{ pageKey: 'audit', revision: 1, publishedAt: '2026-09-15T00:00:00.000Z', contentHash: 'changed-history' }],
    });

    const result = runCompare(fixture(), after);
    const report = parseReport(result.stdout);

    expect(result.status).toBe(1);
    expect(report.status).toBe('fail');
    expect(report.archivedContentChanged).toEqual([
      { key: 'audit#1', beforeHash: 'archived-audit-v1', afterHash: 'changed-history' },
    ]);
  });

  test('comparison fails when an archived version is deleted', () => {
    const result = runCompare(fixture(), fixture({ archivedVersions: [] }));
    const report = parseReport(result.stdout);

    expect(result.status).toBe(1);
    expect(report.status).toBe('fail');
    expect(report.archivedContentDeleted).toEqual([{ key: 'audit#1', beforeHash: 'archived-audit-v1' }]);
  });

  test('comparison allows additive archived revisions', () => {
    const after = fixture({
      archivedVersions: [
        { pageKey: 'audit', revision: 1, publishedAt: '2026-09-15T00:00:00.000Z', contentHash: 'archived-audit-v1' },
        { pageKey: 'audit', revision: 2, publishedAt: '2026-09-15T00:01:00.000Z', contentHash: 'archived-audit-v2' },
      ],
    });

    const result = runCompare(fixture(), after);
    const report = parseReport(result.stdout);

    expect(result.status).toBe(0);
    expect(report.status).toBe('pass');
    expect(report.additiveArchivedVersions).toEqual(['audit#2']);
  });

  test('comparison rejects foreign refs, unsupported schema versions, and duplicate keys', () => {
    const result = runCompare(
      fixture(),
      {
        ...fixture(),
        schemaVersion: 2,
        ref: 'foreignref123456789',
        cmsPages: [...fixture().cmsPages, ...fixture().cmsPages],
        archivedVersions: [...fixture().archivedVersions, ...fixture().archivedVersions],
        siteSettings: [...fixture().siteSettings, ...fixture().siteSettings],
      },
    );
    const report = parseReport(result.stdout);

    expect(result.status).toBe(1);
    expect(report.status).toBe('fail');
    expect(report.validationErrors).toEqual([
      'after.schemaVersion must be 1',
      'after.ref must be aeooyivfijthfcrfrnyk',
      'after.cmsPages duplicate key audit',
      'after.archivedVersions duplicate key audit#1',
      'after.siteSettings duplicate key home',
      'after.siteSettings duplicate key page-texts',
    ]);
  });

  test('snapshot mode uses one Management API SQL statement for schema and content', () => {
    const source = readScript(script);

    expect(source).toContain('queryManagementApi(environment, snapshotSql())');
    expect(source).not.toContain('Promise.all');
    expect(source).toContain('schema_columns as (');
    expect(source).toContain('cms_pages_snapshot as (');
    expect(source).toContain('archived_versions_snapshot as (');
    expect(source).toContain('site_settings_snapshot as (');
  });

  test('comparison fails on missing identity mappings without inventing field mappings', () => {
    const result = runCompare(
      fixture(),
      fixture({
        cmsPages: [],
        siteSettings: [{ id: 'home', updatedAt: '2026-09-15T00:00:00.000Z', valueHash: 'home-hash' }],
      }),
    );
    const report = parseReport(result.stdout);

    expect(result.status).toBe(1);
    expect(report.mappingPolicy).toContain('identity-only');
    expect(report.missingMappings).toEqual([
      { table: 'cms_pages', key: 'audit' },
      { table: 'site_settings', key: 'page-texts' },
    ]);
  });
});
