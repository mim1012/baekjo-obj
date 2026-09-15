import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { buildSnapshot } from './mapper.mjs';

export const STAGING_REF = 'aeooyivfijthfcrfrnyk';

export function validateEnvironment(env, apply, baseUrl) {
  assert(env.TEST_SUPABASE_PROJECT_REF === STAGING_REF, 'Only the explicit staging project is allowed');
  let database;
  try { database = new URL(env.SUPABASE_URL); } catch { throw new Error('Invalid staging database URL'); }
  assert(database.href === `https://${STAGING_REF}.supabase.co/`, 'SUPABASE_URL must be the staging project origin');
  assert(env.SUPABASE_SECRET_KEY, 'SUPABASE_SECRET_KEY is required for read-only source access');
  if (!apply) return;
  let target;
  try { target = new URL(baseUrl); } catch { throw new Error('Invalid localhost origin'); }
  assert(['http:', 'https:'].includes(target.protocol) && ['127.0.0.1', 'localhost'].includes(target.hostname), 'Apply requires an explicit localhost URL');
  assert(!target.username && !target.password && target.pathname === '/' && !target.search && !target.hash, 'Use a bare localhost origin');
  assert(env.E2E_ADMIN_EMAIL && env.E2E_ADMIN_PASSWORD, 'Real E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD are required');
  return target.origin;
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  return value;
}

export function digest(value) {
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}

export function assertContent(actual, expected, location = 'content') {
  if (Array.isArray(expected)) {
    assert(Array.isArray(actual) && actual.length === expected.length, `Changed array: ${location}`);
    expected.forEach((entry, index) => assertContent(actual[index], entry, `${location}[${index}]`));
  } else if (expected && typeof expected === 'object') {
    assert(actual && typeof actual === 'object', `Missing object: ${location}`);
    for (const [key, value] of Object.entries(expected)) assertContent(actual[key], value, `${location}.${key}`);
  } else {
    assert(actual === expected, `Source leaf changed: ${location}`);
  }
}

function cleanState(state) {
  assert(Number.isSafeInteger(state.draftRevision) && state.draftRevision > 0, 'Invalid draft revision');
  assert(state.hasUnpublishedChanges === false && state.draftRevision === state.publishedRevision, 'Existing unpublished draft: import refused');
}

export async function runImport(io, { apply = false } = {}) {
  let state;
  if (apply) {
    await io.preflightAndLogin();
    state = await io.readState();
    cleanState(state);
    if (await io.readPublished() !== null) return { status: 'already-managed', pageKey: 'audit' };
  }
  const source = await io.readSource();
  const content = buildSnapshot(source);
  const sourceHash = digest(source);
  const payload = { pageKey: 'audit', sourceHash, sourceUpdatedAt: source.updated_at ?? null, content };
  if (!apply) return { status: 'prepared', ...payload };
  assert(typeof source.updated_at === 'string' && Number.isFinite(Date.parse(source.updated_at)), 'Source timestamp is required for atomic publication');

  const unchangedSource = async () => assert(digest(await io.readSource()) === sourceHash, 'Source changed: import stopped; do not publish the prepared draft');
  await unchangedSource();
  assert(digest(await io.readState()) === digest(state), 'CMS state changed before save');

  const saved = await io.save({ content, expectedRevision: state.draftRevision });
  assert(saved.draftRevision === state.draftRevision + 1, 'Unexpected save revision: inspect draft manually');
  assertContent(saved.content, content);
  await unchangedSource();
  const beforePublish = await io.readState();
  assert(beforePublish.draftRevision === saved.draftRevision && beforePublish.publishedRevision === state.publishedRevision, 'CMS revision changed before publish');
  assertContent(beforePublish.content, content);
  assert(digest(beforePublish.content) === digest(saved.content), 'Draft content changed before publish');
  assert(await io.readPublished() === null, 'Another actor activated CMS before publish');
  await unchangedSource();
  const published = await io.publish({
    expectedRevision: saved.draftRevision,
    sourceValue: source.value,
    sourceUpdatedAt: source.updated_at,
  });
  assert(published.publishedRevision === saved.draftRevision, 'Unexpected publish revision: inspect manually');
  assertContent(await io.readPublished(), content);
  const after = await io.readState();
  assert(after.draftRevision === saved.draftRevision && after.publishedRevision === saved.draftRevision, 'CMS changed after publish');
  const history = new Set(after.versions.map((version) => version.revision));
  assert(history.has(saved.draftRevision), 'New publish is missing from history');
  for (const version of state.versions.slice(0, 9)) assert(history.has(version.revision), 'Previous history missing');
  return { status: 'imported', ...payload, publishedRevision: saved.draftRevision };
}
