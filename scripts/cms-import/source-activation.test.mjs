import test from 'node:test';
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// 범용 소스 결속 "현재 값 가져오기(최초 활성화)" 경로(D1) — POST /api/admin/settings/pages/[pageKey]/import
// 의 transpile-and-stub 단위테스트. activation-lifecycle.test.mjs와 같은 패턴을 쓴다: 이 프로세스에서
// 'server-only'를 import하면 항상 throw하므로, 실 TypeScript 소스를 CommonJS로 transpile해 의존성만
// stub한 뒤 Function으로 평가한다. registry.ts/audit.ts/pageDefinitions.ts/normalize.ts는 순수 함수라
// stub 없이 그대로 재귀 로드된다(레지스트리 자체가 실 매퍼인지 검증하는 게 이 테스트의 목적이라
// 매퍼를 다시 손으로 흉내내지 않는다).

function harness(options = {}) {
  /** @type {{value: unknown, updated_at: string}} */
  const pageTextsRow = {
    value: { version: 1, values: { 'audit.heroDescription': 'harness page-texts value' } },
    updated_at: '2026-09-15T00:00:00.000Z',
  };

  const state = {
    settings: { 'page-texts': pageTextsRow },
    pages: {
      // home은 아직 실 소스 매퍼가 연결되지 않은 placeholder(bootstrapReady:false) — RPC까지 가면 안 된다.
      home: { page_key: 'home', draft_revision: 1, draft_content: {}, published_revision: null, published_content: null },
      // audit은 draft_content를 실 매퍼(build) 결과와 정확히 맞춰둔다 — 그래야 0166의
      // content-conflict 가드 없이 "성공" 경로를 온전히 검증할 수 있다.
      audit: { page_key: 'audit', draft_revision: 4, draft_content: null, published_revision: null, published_content: null },
    },
    rpcCalls: [],
    revalidatedPaths: [],
    revalidatedTags: [],
    raceOnNextSourceRead: false,
  };

  function siteSettingsQuery() {
    const filters = [];
    const query = {
      select: () => query,
      eq: (key, value) => { filters.push([key, value]); return query; },
      maybeSingle: async () => {
        const idFilter = filters.find(([key]) => key === 'id');
        const row = idFilter && state.settings[idFilter[1]];
        if (!row) return { data: null, error: null };
        const snapshot = { value: structuredClone(row.value), updated_at: row.updated_at };
        // 클라이언트가 보기 전/보낸 뒤 사이 레이스를 흉내낸다 — 실제 RPC는 이 창을 `for update`로
        // 막지만, 여기서는 "읽은 뒤 RPC가 잠그기 전에 바뀌었다"를 그대로 재현해 PT409 경로를 태운다.
        if (state.raceOnNextSourceRead) {
          state.raceOnNextSourceRead = false;
          row.updated_at = new Date(Date.parse(row.updated_at) + 1_000).toISOString();
        }
        return { data: snapshot, error: null };
      },
    };
    return query;
  }

  function cmsPagesQuery() {
    const filters = [];
    const query = {
      select: () => query,
      not: () => query,
      eq: (key, value) => { filters.push([key, value]); return query; },
      maybeSingle: async () => {
        const idFilter = filters.find(([key]) => key === 'page_key');
        const row = idFilter && state.pages[idFilter[1]];
        return row ? { data: { published_content: row.published_content }, error: null } : { data: null, error: null };
      },
    };
    return query;
  }

  const db = {
    from: (table) => (table === 'site_settings' ? siteSettingsQuery() : cmsPagesQuery()),
    rpc: async (name, args) => {
      state.rpcCalls.push({ name, args });
      if (name !== 'publish_cms_page_from_source') return { data: null, error: { code: 'unexpected-rpc' } };

      for (const [key, expected] of Object.entries(args.p_expected_sources)) {
        const actual = state.settings[key];
        if (!actual || !isDeepStrictEqual(actual.value, expected.value) || actual.updated_at !== expected.updated_at) {
          return { data: null, error: { code: 'PT409' } };
        }
      }
      const page = state.pages[args.p_page_key];
      if (!page) return { data: null, error: { code: 'P0002' } };
      if (page.draft_revision !== args.p_expected_revision) return { data: null, error: { code: 'PT409' } };
      if (page.published_content && page.published_content.__managedVersion === 1) return { data: null, error: { code: 'PT409' } };
      if (!isDeepStrictEqual(page.draft_content, args.p_expected_content)) return { data: null, error: { code: 'PT409' } };

      page.published_content = { ...structuredClone(page.draft_content), __managedVersion: 1 };
      page.published_revision = page.draft_revision;
      return { data: [{ published_revision: page.draft_revision, published_at: '2026-09-15T00:00:01Z' }], error: null };
    },
  };

  const dependencies = {
    'server-only': {},
    'next/cache': {
      revalidatePath: (...args) => { state.revalidatedPaths.push(args); },
      revalidateTag: (...args) => { state.revalidatedTags.push(args); },
      unstable_cache: (fn) => fn,
    },
    'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
    '@/lib/supabase/server': { getSupabase: () => db },
    '@/lib/admin/requireAdmin': { requireAdmin: async () => ({ ok: true, requester: { id: 'actor' } }) },
    '@/lib/logServerError': { logServerError: () => {} },
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

  // audit의 draft_content를 실 소스 매퍼 결과와 맞춘다(순수 함수 재사용 — 손으로 다시 계산하지 않는다).
  const registry = load('src/lib/cms/source/registry.ts');
  const pageDefinitions = load('src/lib/cms/pageDefinitions.ts');
  const normalize = load('src/lib/cms/normalize.ts');
  const auditDefinition = pageDefinitions.getCmsPageDefinition('audit');
  const auditBuilder = registry.getCmsSourceBuilder('audit');
  state.pages.audit.draft_content = normalize.normalizeCmsPageContent(
    auditDefinition,
    auditBuilder.build({ 'page-texts': state.settings['page-texts'] }),
  );

  // 모든 실 매퍼가 이제 bootstrapReady일 수 있으므로(U3~U9 완료), "매퍼가 준비되지 않았다"/"소스
  // 행이 없다" 경로는 실 매퍼가 아니라 이 테스트가 주입한 가짜 매퍼로 검증한다 — registry 모듈을
  // 그대로 stub해 지정한 pageKey만 가짜 매퍼로 바꿔치고, 나머지 키는 실 registry로 위임한다(audit
  // 계산에 쓴 registry 참조는 이미 위에서 끝났으므로 안전하다).
  if (options.fakeMapper) {
    const { pageKey: fakePageKey, mapper } = options.fakeMapper;
    const realGetCmsSourceBuilder = registry.getCmsSourceBuilder;
    dependencies['@/lib/cms/source/registry'] = {
      ...registry,
      getCmsSourceBuilder: (key) => (key === fakePageKey ? mapper : realGetCmsSourceBuilder(key)),
    };
  }

  const route = load('src/app/api/admin/settings/pages/[pageKey]/import/route.ts');
  const publicContent = load('src/lib/cms/content.ts');

  const call = (pageKey, body) => route.POST(
    new Request(`http://localhost/api/admin/settings/pages/${pageKey}/import`, { method: 'POST', body: JSON.stringify(body) }),
    { params: Promise.resolve({ pageKey }) },
  );

  return { state, call, publicContent, registry, pageDefinitions, normalize };
}

test('import route rejects a page whose source mapper is not bootstrap-ready, without calling the RPC', async () => {
  // U3~U9가 끝나 실 매퍼 14개가 전부 bootstrapReady일 수 있으므로, "준비되지 않음" 경로 자체는
  // 이 테스트가 주입하는 가짜 매퍼로 고정해 검증한다(실 매퍼의 현재 상태와 무관하게 이 계약이
  // 유지되는지 보는 것이 목적).
  const h = harness({
    fakeMapper: { pageKey: 'home', mapper: { siteSettingIds: [], bootstrapReady: false, build: () => ({}) } },
  });
  const response = await h.call('home', { expectedRevision: h.state.pages.home.draft_revision });
  assert.equal(response.status, 409);
  const body = await response.json();
  assert.equal(body.error, 'source-mapper-not-ready');
  assert.deepEqual(h.state.rpcCalls, []);
});

test('import route rejects a ready mapper whose declared source row is missing, as 409 source-missing', async () => {
  // bootstrapReady:true인데 매퍼가 선언한 site_settings 행이 실제로 없는 경우(운영 데이터 누락 등)
  // — RPC까지 가지 않고 source-missing 409로 막혀야 한다.
  const h = harness({
    fakeMapper: {
      pageKey: 'home',
      mapper: { siteSettingIds: ['does-not-exist'], bootstrapReady: true, build: () => ({}) },
    },
  });
  const response = await h.call('home', { expectedRevision: h.state.pages.home.draft_revision });
  assert.equal(response.status, 409);
  const body = await response.json();
  assert.equal(body.error, 'source-missing');
  assert.deepEqual(h.state.rpcCalls, []);
});

test('import route rejects an unknown pageKey with 404 before touching the DB', async () => {
  const h = harness();
  const response = await h.call('not-a-real-page', { expectedRevision: 1 });
  assert.equal(response.status, 404);
  assert.deepEqual(h.state.rpcCalls, []);
});

test('import route rejects a body with anything other than exactly { expectedRevision } with 400', async () => {
  const h = harness();
  const missing = await h.call('audit', {});
  assert.equal(missing.status, 400);
  const extraKey = await h.call('audit', { expectedRevision: 4, extra: true });
  assert.equal(extraKey.status, 400);
  assert.deepEqual(h.state.rpcCalls, []);
});

test('audit import derives content server-side (never trusts a client-sent content) and locks the exact page-texts row', async () => {
  const h = harness();
  const expectedRow = { ...h.state.settings['page-texts'] };
  const response = await h.call('audit', { expectedRevision: h.state.pages.audit.draft_revision });
  assert.equal(response.status, 200, await response.clone().text());
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.publishedRevision, h.state.pages.audit.draft_revision);
  assert.equal(typeof body.publishedAt, 'string');

  assert.equal(h.state.rpcCalls.length, 1);
  const { args } = h.state.rpcCalls[0];
  assert.equal(args.p_page_key, 'audit');
  assert.equal(args.p_expected_revision, h.state.pages.audit.draft_revision);
  assert.deepEqual(args.p_expected_sources, { 'page-texts': expectedRow });
  assert.deepEqual(args.p_expected_content, h.state.pages.audit.draft_content);
});

test('a source row that changes between the route read and the RPC lock is rejected as a 409 conflict (never a bare 500)', async () => {
  const h = harness();
  h.state.raceOnNextSourceRead = true;
  const response = await h.call('audit', { expectedRevision: h.state.pages.audit.draft_revision });
  assert.equal(response.status, 409);
  const body = await response.json();
  assert.equal(body.error, 'source-or-revision-conflict');
  assert.equal(h.state.pages.audit.published_revision, null);
});

test('a stale expectedRevision is rejected as a 409 conflict', async () => {
  const h = harness();
  const response = await h.call('audit', { expectedRevision: h.state.pages.audit.draft_revision + 1 });
  assert.equal(response.status, 409);
  assert.equal((await response.json()).error, 'source-or-revision-conflict');
});

test('success activates the page, and revalidates both the route path and the cmsPages tag', async () => {
  const h = harness();
  assert.equal(await h.publicContent.getPublishedPageContent('audit'), null);

  const response = await h.call('audit', { expectedRevision: h.state.pages.audit.draft_revision });
  assert.equal(response.status, 200);

  assert.deepEqual(await h.publicContent.getPublishedPageContent('audit'), h.state.pages.audit.draft_content);
  assert(h.state.revalidatedPaths.some(([path]) => path === '/audit'), 'expected revalidatePath("/audit")');
  assert(h.state.revalidatedTags.some(([tag]) => tag === 'cmsPages'), 'expected revalidateTag("cmsPages")');

  // 이미 활성화된(managed) 페이지를 같은 revision으로 다시 가져오려 하면 already-managed로 막힌다.
  const again = await h.call('audit', { expectedRevision: h.state.pages.audit.draft_revision });
  assert.equal(again.status, 409);
});
