import test from 'node:test';
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { buildSnapshot } from './mapper.mjs';

function harness(pageKey, managed = false, conflictCode = 'PT409') {
  const state = {
    row: { page_key: pageKey, draft_revision: 4, draft_content: {}, published_revision: 4, published_content: managed ? { __managedVersion: 1 } : {} },
    sourceValue: { version: 1, values: { 'audit.heroDescription': 'before PATCH' } },
    sourceUpdatedAt: '2026-09-15T00:00:00.123456Z',
    archives: [],
  };
  const db = {
    from: () => {
      const filters = [];
      let patch;
      const query = {
        select: () => query, not: () => query, order: () => query,
        eq: (key, value) => { filters.push([key, value]); return query; },
        update: (value) => { patch = value; return query; },
        limit: async () => ({ data: state.archives, error: null }),
        maybeSingle: async () => {
          if (!filters.every(([key, value]) => state.row[key] === value)) return { data: null, error: null };
          if (patch) Object.assign(state.row, structuredClone(patch));
          return { data: structuredClone(state.row), error: null };
        },
      };
      return query;
    },
    rpc: async (name, args) => {
      const sourceConflict = name === 'publish_audit_cms_from_source' && (
        !isDeepStrictEqual(args.p_expected_source_value, state.sourceValue)
        || args.p_expected_source_updated_at !== state.sourceUpdatedAt
        || !isDeepStrictEqual(args.p_expected_content, state.row.draft_content)
      );
      if (sourceConflict || args.p_expected_revision !== state.row.draft_revision) return { data: null, error: { code: conflictCode } };
      state.row.published_content = { ...structuredClone(state.row.draft_content), __managedVersion: 1 };
      state.row.published_revision = state.row.draft_revision;
      state.archives.push(structuredClone(state.row.published_content));
      return { data: [{ published_revision: state.row.draft_revision, published_at: '2026-09-15T00:00:01Z' }], error: null };
    },
  };
  const dependencies = {
    'server-only': {},
    'next/cache': { revalidatePath: () => {}, revalidateTag: () => {}, unstable_cache: (fn) => fn },
    'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
    '@/lib/supabase/server': { getSupabase: () => db },
    '@/lib/admin/requireAdmin': { requireAdmin: async () => ({ ok: true, requester: { id: 'actor' } }) },
    '@/lib/logServerError': { logServerError: () => {} },
    // public-read-cache.ts는 브랜드/상품 등 이 테스트와 무관한 리포지토리를 다수 import한다 —
    // 재귀 transpile 로더가 그 전체 그래프를 끌고 들어오지 않도록, content.ts가 실제로 쓰는
    // cachedPublishedCmsPage 하나만 stub해 getPublishedCmsPage(repo.ts)로 바로 위임한다(next/cache의
    // unstable_cache를 그대로 통과시키는 위 stub과 동일하게, 캐시 자체는 이 단위테스트의 관심사가
    // 아니다 — 동작 동일성만 유지한다).
    '@/lib/public-read-cache': {
      cachedPublishedCmsPage: (pageKey) => load('src/lib/cms/repo.ts').getPublishedCmsPage(pageKey),
    },
  };
  function load(relative) {
    const file = new URL(`../../${relative}`, import.meta.url);
    const loaded = { exports: {} };
    const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
    new Function('require', 'module', 'exports', outputText)((name) => {
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      assert(name.startsWith('@/'), `Unexpected dependency ${name}`);
      return dependencies[name] = load(`src/${name.slice(2)}.ts`);
    }, loaded, loaded.exports);
    return loaded.exports;
  }
  const route = load('src/app/api/admin/settings/pages/[pageKey]/route.ts');
  const importer = load('src/app/api/admin/settings/pages/[pageKey]/import-publish/route.ts');
  const publicContent = load('src/lib/cms/content.ts');
  const call = (method, body, target = route) => target[method](new Request(`http://localhost/api/admin/settings/pages/${pageKey}`, { method, ...(body ? { body: JSON.stringify(body) } : {}) }), { params: Promise.resolve({ pageKey }) });
  return { state, call, importer, publicContent };
}

test('source changing after real PATCH handler prevents activation and archive creation', async () => {
  const h = harness('audit');
  const original = structuredClone(h.state.sourceValue);
  const saved = await h.call('PATCH', { expectedRevision: 4, content: buildSnapshot({ id: 'page-texts', value: original }) });
  assert.equal(saved.status, 200);
  const { draftRevision } = await saved.json();
  h.state.sourceValue.values['audit.heroDescription'] = 'after PATCH';
  const response = await h.call('POST', { expectedRevision: draftRevision, sourceValue: original, sourceUpdatedAt: h.state.sourceUpdatedAt }, h.importer);
  assert.equal(response.status, 409);
  assert.deepEqual(h.state.archives, []);
  assert.equal(await h.publicContent.getPublishedPageContent('audit'), null);
  assert.equal((await h.call('POST', { expectedRevision: draftRevision })).status, 409);
});

test('bootstrap leaves normal editing available and stale publish rejected', async () => {
  const h = harness('audit');
  const saved = await h.call('PATCH', { expectedRevision: 4, content: buildSnapshot({ id: 'page-texts', value: h.state.sourceValue }) });
  const { draftRevision, content } = await saved.json();
  assert.equal((await h.call('POST', { expectedRevision: draftRevision, sourceValue: h.state.sourceValue, sourceUpdatedAt: h.state.sourceUpdatedAt }, h.importer)).status, 200);
  const edited = { ...content, futureRoot: { keep: [] } };
  assert.equal((await h.call('PATCH', { expectedRevision: draftRevision, content: edited })).status, 200);
  assert.equal((await h.call('POST', { expectedRevision: draftRevision })).status, 409);
  assert.equal((await h.call('POST', { expectedRevision: draftRevision + 1 })).status, 200);
  assert.deepEqual(await h.publicContent.getPublishedPageContent('audit'), edited);
});

test('legacy SQLSTATE 40001 still rejects a stale ordinary publish as a defensive fallback', async () => {
  const h = harness('audit', false, '40001');
  const saved = await h.call('PATCH', { expectedRevision: 4, content: buildSnapshot({ id: 'page-texts', value: h.state.sourceValue }) });
  const { draftRevision, content } = await saved.json();
  assert.equal((await h.call('POST', { expectedRevision: draftRevision, sourceValue: h.state.sourceValue, sourceUpdatedAt: h.state.sourceUpdatedAt }, h.importer)).status, 200);
  const edited = { ...content, futureRoot: { keep: [] } };
  assert.equal((await h.call('PATCH', { expectedRevision: draftRevision, content: edited })).status, 200);
  assert.equal((await h.call('POST', { expectedRevision: draftRevision })).status, 409);
  assert.equal((await h.call('POST', { expectedRevision: draftRevision + 1 })).status, 200);
});

for (const empty of [false, true]) {
  test(`home structural ${empty ? 'empty' : 'extended'} content survives PATCH GET publish and public read`, async () => {
    const h = harness('home', true);
    const input = {
      futureRoot: { keep: [] },
      hero: { desktopImage: '/desktop.webp', href: '/shop', visible: false, titleLines: [], futureHero: 'keep' },
      quickShop: { links: [{ href: '/shop', icon: 'star', visible: false, futureLink: [] }] },
      curation: { cards: empty ? [] : Array.from({ length: 12 }, (_, i) => ({ title: `${i}`, image: '/card.webp', href: '/brands', visible: false, futureCard: [] })) },
    };
    assert.equal((await h.call('PATCH', { expectedRevision: 4, content: input })).status, 200);
    assert.deepEqual((await (await h.call('GET')).json()).content, input);
    assert.deepEqual(await h.publicContent.getPublishedPageContent('home'), {});
    assert.equal((await h.call('POST', { expectedRevision: 5 })).status, 200);
    assert.deepEqual(await h.publicContent.getPublishedPageContent('home'), input);
    assert.deepEqual(h.state.archives, [{ ...input, __managedVersion: 1 }]);
  });
}
