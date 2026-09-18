import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// allow: SIZE_OK - bounded handoff requires one self-contained script; no extra files/deps.
const APPROVED_STAGING_REF = 'aeooyivfijthfcrfrnyk';
const API_USER_AGENT = 'Mozilla/5.0 (baekjo-cms-snapshot/1.0)';
const EXPECTED_SITE_SETTINGS = ['home', 'page-texts'];
const SCHEMA_FILES = {
  cms_pages: path.resolve('supabase', 'migrations', '0162_cms_foundation_reconcile.sql'),
  cms_page_versions: path.resolve('supabase', 'migrations', '0162_cms_foundation_reconcile.sql'),
  site_settings: path.resolve('supabase', 'migrations', '0008_site_settings.sql'),
};
const EXPECTED_COLUMNS = {
  cms_pages: ['page_key', 'route', 'title', 'draft_content', 'published_content', 'draft_revision', 'published_revision', 'updated_at', 'published_at'],
  cms_page_versions: ['page_key', 'revision', 'content', 'published_at'],
  site_settings: ['id', 'value', 'updated_at'],
};

async function main() {
  const [command = 'snapshot', first, second, third] = process.argv.slice(2);
  if (command === 'snapshot') {
    const snapshot = await createSnapshot();
    const outFile = first || path.resolve('artifacts', `cms-current-content-snapshot-${snapshot.capturedAt.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}.json`);
    await writeJson(outFile, snapshot);
    console.log(JSON.stringify({ outFile, ref: snapshot.ref, totals: snapshot.totals }, null, 2));
    return;
  }
  if (command === 'compare') {
    if (!first || !second) throw new Error('사용: node scripts/cms-current-content-snapshot.mjs compare <before.json> <after.json> [report.json]');
    const report = compareSnapshots(JSON.parse(await readFile(first, 'utf8')), JSON.parse(await readFile(second, 'utf8')));
    if (third) await writeJson(third, report);
    console.log(JSON.stringify(report, null, 2));
    if (report.status !== 'pass') process.exitCode = 1;
    return;
  }
  throw new Error(`알 수 없는 명령입니다: ${command}`);
}

async function createSnapshot() {
  const environment = validateEnvironment(process.env);
  await assertRepoSchemaContracts();
  const rows = await queryManagementApi(environment, snapshotSql());
  const snapshotRow = objectField(rows, 0);
  const schemaRows = arrayField(snapshotRow, 'schema_columns');
  const cmsRows = arrayField(snapshotRow, 'cms_pages');
  const versionRows = arrayField(snapshotRow, 'archived_versions');
  const settingsRows = arrayField(snapshotRow, 'site_settings');
  assertRemoteSchema(schemaRows);
  const cmsPages = cmsRows.map((row) => ({
    pageKey: stringField(row, 'page_key'), route: stringField(row, 'route'), title: stringField(row, 'title'),
    draftRevision: numberField(row, 'draft_revision'), publishedRevision: nullableNumberField(row, 'published_revision'),
    updatedAt: stringField(row, 'updated_at'), publishedAt: nullableStringField(row, 'published_at'),
    draftContentHash: hashJson(row.draft_content), publishedContentHash: row.published_content === null ? null : hashJson(row.published_content),
  }));
  const archivedVersions = versionRows.map((row) => ({
    pageKey: stringField(row, 'page_key'), revision: numberField(row, 'revision'),
    publishedAt: stringField(row, 'published_at'), contentHash: hashJson(row.content),
  }));
  const siteSettings = settingsRows.map((row) => ({
    id: stringField(row, 'id'), updatedAt: stringField(row, 'updated_at'), valueHash: hashJson(row.value),
  }));
  return {
    schemaVersion: 1, capturedAt: new Date().toISOString(), ref: APPROVED_STAGING_REF,
    source: 'supabase-management-api-read-only', redaction: 'content values omitted; hashes only',
    mappingPolicy: mappingPolicy(), expectedSiteSettings: EXPECTED_SITE_SETTINGS,
    totals: { cmsPages: cmsPages.length, archivedVersions: archivedVersions.length, siteSettings: siteSettings.length },
    cmsPages, archivedVersions, siteSettings,
  };
}

function compareSnapshots(beforeSnapshot, afterSnapshot) {
  const validationErrors = [
    ...snapshotValidationErrors(beforeSnapshot, 'before'),
    ...snapshotValidationErrors(afterSnapshot, 'after'),
  ];
  if (validationErrors.length > 0) return failedValidationReport(validationErrors);
  const beforeVersions = byKey(beforeSnapshot.archivedVersions, versionKey);
  const afterVersions = byKey(afterSnapshot.archivedVersions, versionKey);
  const beforePages = byKey(beforeSnapshot.cmsPages, (entry) => entry.pageKey);
  const afterPages = byKey(afterSnapshot.cmsPages, (entry) => entry.pageKey);
  const beforeSettings = byKey(beforeSnapshot.siteSettings, (entry) => entry.id);
  const afterSettings = byKey(afterSnapshot.siteSettings, (entry) => entry.id);
  const archivedContentChanged = changedArchivedVersions(beforeVersions, afterVersions);
  const archivedContentDeleted = deletedArchivedVersions(beforeVersions, afterVersions);
  const missingMappings = [
    ...missingKeys(beforePages, afterPages, 'cms_pages'),
    ...missingKeys(beforeSettings, afterSettings, 'site_settings'),
    ...missingExpectedSiteSettings(afterSettings),
  ];
  return {
    status: archivedContentChanged.length || archivedContentDeleted.length || missingMappings.length ? 'fail' : 'pass',
    comparedAt: new Date().toISOString(), mappingPolicy: mappingPolicy(),
    archivedContentChanged, archivedContentDeleted, missingMappings: uniqueMappings(missingMappings),
    additiveArchivedVersions: [...afterVersions.keys()].filter((key) => !beforeVersions.has(key)).sort(),
    changedCurrentCmsPages: changedEntries(beforePages, afterPages, (entry) => [entry.draftContentHash, entry.publishedContentHash, String(entry.draftRevision), String(entry.publishedRevision ?? '')]),
    changedSiteSettings: changedEntries(beforeSettings, afterSettings, (entry) => [entry.valueHash]),
    validationErrors,
  };
}

function validateEnvironment(environment) {
  const supabaseUrl = environment.SUPABASE_URL ?? '';
  const expectedRef = environment.TEST_SUPABASE_PROJECT_REF ?? '';
  const token = environment.SUPABASE_ACCESS_TOKEN ?? '';
  if (!supabaseUrl || !expectedRef || !token) throw new Error('SUPABASE_URL, TEST_SUPABASE_PROJECT_REF, SUPABASE_ACCESS_TOKEN 이 필요합니다.');
  if (expectedRef !== APPROVED_STAGING_REF || extractSupabaseProjectRef(supabaseUrl) !== APPROVED_STAGING_REF) {
    throw new Error('CMS snapshot은 승인된 staging ref aeooyivfijthfcrfrnyk 에서만 실행할 수 있습니다.');
  }
  return { apiUrl: `https://api.supabase.com/v1/projects/${APPROVED_STAGING_REF}/database/query`, token };
}

function extractSupabaseProjectRef(supabaseUrl) {
  if (!URL.canParse(supabaseUrl)) return null;
  const [ref, service, domain] = new URL(supabaseUrl).hostname.split('.');
  return service === 'supabase' && domain === 'co' ? ref : null;
}

async function queryManagementApi(environment, query) {
  const response = await fetch(environment.apiUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${environment.token}`, 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': API_USER_AGENT },
    body: JSON.stringify({ query }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase Management API query failed: HTTP ${response.status}`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Supabase Management API returned invalid JSON.');
  }
}

async function assertRepoSchemaContracts() {
  const cache = new Map();
  for (const [tableName, columns] of Object.entries(EXPECTED_COLUMNS)) {
    const source = cache.get(SCHEMA_FILES[tableName]) ?? await readFile(SCHEMA_FILES[tableName], 'utf8');
    cache.set(SCHEMA_FILES[tableName], source);
    if (!source.includes(`public.${tableName}`)) throw new Error(`Repo schema contract missing table ${tableName}`);
    for (const column of columns) if (!source.includes(column)) throw new Error(`Repo schema contract missing ${tableName}.${column}`);
  }
}

function assertRemoteSchema(rows) {
  const available = new Map();
  for (const row of rows) {
    const tableName = stringField(row, 'table_name');
    const columns = available.get(tableName) ?? new Set();
    columns.add(stringField(row, 'column_name'));
    available.set(tableName, columns);
  }
  for (const [tableName, columns] of Object.entries(EXPECTED_COLUMNS)) {
    const actual = available.get(tableName);
    if (!actual) throw new Error(`Remote schema missing table ${tableName}`);
    for (const column of columns) if (!actual.has(column)) throw new Error(`Remote schema missing ${tableName}.${column}`);
  }
}

function snapshotSql() {
  return `
with
schema_columns as (
  select coalesce(jsonb_agg(jsonb_build_object('table_name', table_name, 'column_name', column_name) order by table_name, column_name), '[]'::jsonb) as rows
  from information_schema.columns
  where table_schema = 'public' and table_name in ('cms_pages', 'cms_page_versions', 'site_settings')
),
cms_pages_snapshot as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'page_key', page_key, 'route', route, 'title', title, 'draft_revision', draft_revision,
    'published_revision', published_revision, 'updated_at', updated_at, 'published_at', published_at,
    'draft_content', draft_content, 'published_content', published_content
  ) order by page_key), '[]'::jsonb) as rows
  from public.cms_pages
),
archived_versions_snapshot as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'page_key', page_key, 'revision', revision, 'published_at', published_at, 'content', content
  ) order by page_key, revision), '[]'::jsonb) as rows
  from public.cms_page_versions
),
site_settings_snapshot as (
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'updated_at', updated_at, 'value', value) order by id), '[]'::jsonb) as rows
  from public.site_settings
  where id in ('home', 'page-texts')
)
select
  (select rows from schema_columns) as schema_columns,
  (select rows from cms_pages_snapshot) as cms_pages,
  (select rows from archived_versions_snapshot) as archived_versions,
  (select rows from site_settings_snapshot) as site_settings;`;
}

function hashJson(value) {
  return createHash('sha256').update(stableStringify(value), 'utf8').digest('hex');
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  return `{${Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`).join(',')}}`;
}

function stringField(row, field) {
  const value = row[field];
  if (typeof value !== 'string') throw new Error(`Expected string field ${field}`);
  return value;
}

function nullableStringField(row, field) {
  const value = row[field];
  if (value === null) return null;
  if (typeof value !== 'string') throw new Error(`Expected nullable string field ${field}`);
  return value;
}

function numberField(row, field) {
  const numberValue = typeof row[field] === 'number' ? row[field] : Number(row[field]);
  if (!Number.isSafeInteger(numberValue)) throw new Error(`Expected integer field ${field}`);
  return numberValue;
}

function nullableNumberField(row, field) {
  return row[field] === null ? null : numberField(row, field);
}

function objectField(rows, index) {
  const value = rows[index];
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Expected object row ${index}`);
  return value;
}

function arrayField(row, field) {
  const value = row[field];
  if (!Array.isArray(value)) throw new Error(`Expected array field ${field}`);
  return value;
}

function snapshotValidationErrors(snapshot, label) {
  if (!snapshot || typeof snapshot !== 'object') return [`${label} snapshot must be an object`];
  const errors = [];
  if (snapshot.schemaVersion !== 1) errors.push(`${label}.schemaVersion must be 1`);
  if (snapshot.ref !== APPROVED_STAGING_REF) errors.push(`${label}.ref must be ${APPROVED_STAGING_REF}`);
  for (const field of ['cmsPages', 'archivedVersions', 'siteSettings']) {
    if (!Array.isArray(snapshot[field])) errors.push(`${label}.${field} must be an array`);
  }
  if (errors.some((error) => error.includes('must be an array'))) return errors;
  return [
    ...errors,
    ...duplicateErrors(snapshot.cmsPages, (entry) => entry.pageKey, `${label}.cmsPages`),
    ...duplicateErrors(snapshot.archivedVersions, versionKey, `${label}.archivedVersions`),
    ...duplicateErrors(snapshot.siteSettings, (entry) => entry.id, `${label}.siteSettings`),
  ];
}

function duplicateErrors(entries, keyOf, label) {
  const seen = new Set();
  const duplicates = new Set();
  for (const entry of entries) {
    const key = keyOf(entry);
    if (seen.has(key)) duplicates.add(key);
    seen.add(key);
  }
  return [...duplicates].sort().map((key) => `${label} duplicate key ${key}`);
}

function failedValidationReport(validationErrors) {
  return {
    status: 'fail',
    comparedAt: new Date().toISOString(),
    mappingPolicy: mappingPolicy(),
    validationErrors,
    archivedContentChanged: [],
    archivedContentDeleted: [],
    missingMappings: [],
    additiveArchivedVersions: [],
    changedCurrentCmsPages: [],
    changedSiteSettings: [],
  };
}

function byKey(entries, keyOf) {
  return new Map(entries.map((entry) => [keyOf(entry), entry]));
}

function versionKey(entry) {
  return `${entry.pageKey}#${entry.revision}`;
}

function changedArchivedVersions(beforeVersions, afterVersions) {
  return [...beforeVersions.entries()]
    .filter(([key, before]) => afterVersions.has(key) && afterVersions.get(key).contentHash !== before.contentHash)
    .map(([key, before]) => ({ key, beforeHash: before.contentHash, afterHash: afterVersions.get(key).contentHash }));
}

function deletedArchivedVersions(beforeVersions, afterVersions) {
  return [...beforeVersions.entries()].filter(([key]) => !afterVersions.has(key)).map(([key, before]) => ({ key, beforeHash: before.contentHash }));
}

function missingKeys(beforeMap, afterMap, tableName) {
  return [...beforeMap.keys()].filter((key) => !afterMap.has(key)).sort().map((key) => ({ table: tableName, key }));
}

function missingExpectedSiteSettings(afterSettings) {
  return EXPECTED_SITE_SETTINGS.filter((key) => !afterSettings.has(key)).map((key) => ({ table: 'site_settings', key }));
}

function uniqueMappings(mappings) {
  return [...new Map(mappings.map((entry) => [`${entry.table}:${entry.key}`, entry])).values()];
}

function changedEntries(beforeMap, afterMap, fingerprintOf) {
  return [...beforeMap.entries()].filter(([key, before]) => afterMap.has(key) && fingerprintOf(before).join('\n') !== fingerprintOf(afterMap.get(key)).join('\n')).map(([key]) => key).sort();
}

function mappingPolicy() {
  return 'identity-only: cms page_key/revision and site_settings id; no field mapping inferred';
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export { compareSnapshots, hashJson, stableStringify, validateEnvironment };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
