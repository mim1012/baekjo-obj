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
  return { state, call, importer, publicContent, load };
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
    // home 정의(pageDefinitions.ts)는 이제 text/textarea 선언 필드(hero.eyebrow, audit.badge,
    // bestProducts.title 등)를 갖는다(D5) — normalizeCmsPageContent가 그 경로들만 defaultContent로
    // 채우고, 나머지(futureRoot/futureHero/futureLink/futureCard, curation.cards 같은 미선언 배열)는
    // 손대지 않고 그대로 통과시킨다. 순수 함수(normalizeCmsPageContent)로 기대값을 직접 계산해
    // "선언된 필드는 기본값으로 채워지고 미선언 필드는 원본 그대로"라는 계약을 고정한다.
    const pageDefinitions = h.load('src/lib/cms/pageDefinitions.ts');
    const normalize = h.load('src/lib/cms/normalize.ts');
    const homeDefinition = pageDefinitions.getCmsPageDefinition('home');
    const input = {
      futureRoot: { keep: [] },
      hero: { desktopImage: '/desktop.webp', href: '/shop', visible: false, titleLines: [], futureHero: 'keep' },
      quickShop: { links: [{ href: '/shop', icon: 'star', visible: false, futureLink: [] }] },
      curation: { cards: empty ? [] : Array.from({ length: 12 }, (_, i) => ({ title: `${i}`, image: '/card.webp', href: '/brands', visible: false, futureCard: [] })) },
    };
    const expected = normalize.normalizeCmsPageContent(homeDefinition, input);

    // 미선언 필드는 정규화가 손대지 않았다는 것을 직접 확인한다(계약이 조용히 느슨해지는 것을 방지).
    assert.deepEqual(expected.futureRoot, { keep: [] });
    assert.equal(expected.hero.futureHero, 'keep');
    assert.deepEqual(expected.quickShop.links, [{ href: '/shop', icon: 'star', visible: false, futureLink: [] }]);
    assert.deepEqual(expected.curation.cards, input.curation.cards);
    // 선언된 필드(경로 단위)는 입력에 없었으므로 home 정의의 defaultContent로 채워졌다는 것을 직접
    // 확인한다. audit.criteria처럼 정의에 선언되지 않은 카드 데이터는 입력에도 없었으므로 여전히
    // 없어야 한다(defaultContent 전체를 통째로 기대하면 안 된다 — 그건 선언되지 않은 필드까지
    // 채워진다고 잘못 주장하는 것이 된다).
    assert.equal(expected.hero.eyebrow, homeDefinition.defaultContent.hero.eyebrow);
    assert.equal(expected.audit.badge, homeDefinition.defaultContent.audit.badge);
    assert.deepEqual(expected.audit.titleLines, homeDefinition.defaultContent.audit.titleLines);
    assert.equal(expected.audit.description, homeDefinition.defaultContent.audit.description);
    assert.equal(expected.audit.linkLabel, homeDefinition.defaultContent.audit.linkLabel);
    assert.equal(expected.audit.criteria, undefined);
    assert.equal(expected.bestProducts.title, homeDefinition.defaultContent.bestProducts.title);
    assert.equal(expected.curation.description, homeDefinition.defaultContent.curation.description);

    assert.equal((await h.call('PATCH', { expectedRevision: 4, content: input })).status, 200);
    assert.deepEqual((await (await h.call('GET')).json()).content, expected);
    // 게시 전에는 published_content가 { __managedVersion: 1 }뿐이라 stripManagedMarker 후 {}가
    // 되지만, 정의에 선언된 필드는 여기서도 defaultContent로 채워진다({}도 "값이 있는 객체"이므로
    // normalizeCmsPageContent의 fallback 경로를 그대로 탄다) — 초안(draft)과는 다른 입력이므로
    // 별도로 계산한다.
    const publishedBeforePublish = normalize.normalizeCmsPageContent(homeDefinition, {});
    assert.deepEqual(await h.publicContent.getPublishedPageContent('home'), publishedBeforePublish);
    assert.equal((await h.call('POST', { expectedRevision: 5 })).status, 200);
    assert.deepEqual(await h.publicContent.getPublishedPageContent('home'), expected);
    assert.deepEqual(h.state.archives, [{ ...expected, __managedVersion: 1 }]);
  });
}
