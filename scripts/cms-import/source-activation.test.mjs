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
      // content-conflict 가드 없이 "성공" 경로를 온전히 검증할 수 있다. published_revision을
      // draft_revision과 같게 두어(둘 다 4) "깨끗한(clean)" 상태로 시작한다 — 실제 시딩(0162)도
      // 모든 페이지를 draft_revision===published_revision으로 심는다. dirty-draft/already-managed
      // 시나리오는 각 테스트가 이 기본값을 필요에 따라 덮어쓴다.
      audit: { page_key: 'audit', draft_revision: 4, draft_content: null, published_revision: 4, published_content: null },
    },
    rpcCalls: [],
    revalidatedPaths: [],
    revalidatedTags: [],
    raceOnNextSourceRead: false,
    // publish_cms_page_from_source가 성공할 때마다 { page_key, content } 항목을 쌓는다 —
    // cms_page_versions 아카이브에 새 버전이 정확히 하나 생겼는지 검증하는 용도.
    archives: [],
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
    // getCmsPageState/getPublishedCmsPage/saveCmsPageDraft(0166 이전에는 없던 draft 저장 경로)가
    // 모두 이 하나의 mock을 공유한다 — activation-lifecycle.test.mjs의 db.from() mock과 같은 패턴:
    // eq() 필터를 전부 기록해두고 maybeSingle에서 그 필터가 현재 행과 전부 일치할 때만 (선택적으로
    // update() 패치를 적용한 뒤) 행 전체를 돌려준다. select()의 컬럼 목록은 무시한다 — 이 mock은
    // 항상 행 전체를 반환하고, 호출부가 필요한 필드만 읽는다.
    const filters = [];
    let patch;
    const query = {
      select: () => query,
      not: () => query,
      eq: (key, value) => { filters.push([key, value]); return query; },
      update: (value) => { patch = value; return query; },
      maybeSingle: async () => {
        const idFilter = filters.find(([key]) => key === 'page_key');
        const row = idFilter && state.pages[idFilter[1]];
        if (!row || !filters.every(([key, value]) => row[key] === value)) return { data: null, error: null };
        if (patch) Object.assign(row, structuredClone(patch));
        return { data: structuredClone(row), error: null };
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
      state.archives.push({ page_key: args.p_page_key, content: structuredClone(page.published_content) });
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
  const publishedRevisionBefore = h.state.pages.audit.published_revision;
  h.state.raceOnNextSourceRead = true;
  const response = await h.call('audit', { expectedRevision: h.state.pages.audit.draft_revision });
  assert.equal(response.status, 409);
  const body = await response.json();
  assert.equal(body.error, 'source-or-revision-conflict');
  // publish 자체는 여전히 일어나지 않았다 — publish_cms_page_from_source RPC가 소스 불일치로
  // 거절했으므로 published_revision은 바뀌지 않는다. (draft는 저장 단계에서 이미 갱신됐을 수
  // 있다 — audit importer(core.mjs)와 동일하게, draft 저장과 발행은 별개 단계다.)
  assert.equal(h.state.pages.audit.published_revision, publishedRevisionBefore);
});

test('a stale expectedRevision is rejected as a 409 conflict, and makes no writes', async () => {
  const h = harness();
  const draftBefore = structuredClone(h.state.pages.audit.draft_content);
  const draftRevisionBefore = h.state.pages.audit.draft_revision;
  const publishedContentBefore = structuredClone(h.state.pages.audit.published_content);
  const publishedRevisionBefore = h.state.pages.audit.published_revision;

  const response = await h.call('audit', { expectedRevision: h.state.pages.audit.draft_revision + 1 });
  assert.equal(response.status, 409);
  assert.equal((await response.json()).error, 'source-or-revision-conflict');

  // saveCmsPageDraft의 CAS(draft_revision 일치)가 먼저 실패하므로 draft/published 어느 쪽도
  // 쓰기가 일어나지 않는다 — publish RPC도 호출되지 않는다.
  assert.deepEqual(h.state.pages.audit.draft_content, draftBefore);
  assert.equal(h.state.pages.audit.draft_revision, draftRevisionBefore);
  assert.deepEqual(h.state.pages.audit.published_content, publishedContentBefore);
  assert.equal(h.state.pages.audit.published_revision, publishedRevisionBefore);
  assert.deepEqual(h.state.rpcCalls, []);
  assert.equal(h.state.archives.length, 0);
});

test('import route refuses with 409 dirty-draft when the page has unpublished edits (draftRevision !== publishedRevision), and makes no writes', async () => {
  const h = harness();
  // 관리자가 아직 게시하지 않은 PATCH 편집을 갖고 있는 상태를 흉내낸다 — draft가 published보다
  // 한 단계 앞서 있다. 이 상태에서 "현재 값 가져오기"가 그 편집을 조용히 덮어써 버리면 안 된다.
  h.state.pages.audit.published_revision = h.state.pages.audit.draft_revision - 1;
  const draftBefore = structuredClone(h.state.pages.audit.draft_content);
  const publishedContentBefore = structuredClone(h.state.pages.audit.published_content);
  const draftRevisionBefore = h.state.pages.audit.draft_revision;
  const publishedRevisionBefore = h.state.pages.audit.published_revision;

  const response = await h.call('audit', { expectedRevision: h.state.pages.audit.draft_revision });
  assert.equal(response.status, 409);
  assert.equal((await response.json()).error, 'dirty-draft');

  assert.deepEqual(h.state.pages.audit.draft_content, draftBefore);
  assert.equal(h.state.pages.audit.draft_revision, draftRevisionBefore);
  assert.deepEqual(h.state.pages.audit.published_content, publishedContentBefore);
  assert.equal(h.state.pages.audit.published_revision, publishedRevisionBefore);
  assert.deepEqual(h.state.rpcCalls, []);
  assert.equal(h.state.archives.length, 0);
});

test('import route refuses with 409 already-managed when the page was already activated, and makes no writes', async () => {
  const h = harness();
  // 이미 "현재 값 가져오기"로 활성화된 페이지(published_content.__managedVersion === 1)를
  // 흉내낸다 — draftRevision === publishedRevision이라 dirty-draft 가드는 통과하지만
  // already-managed 가드에 막혀야 한다.
  h.state.pages.audit.published_content = { ...structuredClone(h.state.pages.audit.draft_content), __managedVersion: 1 };
  h.state.pages.audit.published_revision = h.state.pages.audit.draft_revision;
  const draftBefore = structuredClone(h.state.pages.audit.draft_content);
  const publishedContentBefore = structuredClone(h.state.pages.audit.published_content);

  const response = await h.call('audit', { expectedRevision: h.state.pages.audit.draft_revision });
  assert.equal(response.status, 409);
  assert.equal((await response.json()).error, 'already-managed');

  assert.deepEqual(h.state.pages.audit.draft_content, draftBefore);
  assert.deepEqual(h.state.pages.audit.published_content, publishedContentBefore);
  assert.deepEqual(h.state.rpcCalls, []);
  assert.equal(h.state.archives.length, 0);
});

test('import route saves the freshly-derived content as a new draft and publishes it when the existing (clean, unmanaged) draft is stale PR311-era content, archiving exactly one new version', async () => {
  const h = harness();
  const derivedContent = structuredClone(h.state.pages.audit.draft_content);
  // PR311 시절의 draft_content를 흉내낸다 — 지금의 소스로 다시 계산한 값과 다르지만(구조는
  // 같고 마커 하나만 다름), draftRevision === publishedRevision(4)이라 "깨끗한" 상태다. 0166의
  // draft_content == p_expected_content 가드 때문에 곧바로 publish를 부르면 PT409가 난다 — 그래서
  // 라우트는 먼저 이 값을 derivedContent로 된 새 draft로 저장해야 한다.
  const staleContent = { ...derivedContent, __pr311StaleMarkerForTest: true };
  h.state.pages.audit.draft_content = staleContent;
  h.state.pages.audit.published_content = structuredClone(staleContent);
  h.state.pages.audit.published_revision = h.state.pages.audit.draft_revision;
  const draftRevisionBefore = h.state.pages.audit.draft_revision;

  const response = await h.call('audit', { expectedRevision: draftRevisionBefore });
  assert.equal(response.status, 200, await response.clone().text());
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(typeof body.publishedAt, 'string');
  assert.equal(body.publishedRevision, draftRevisionBefore + 1);

  assert.deepEqual(h.state.pages.audit.draft_content, derivedContent);
  assert.equal(h.state.pages.audit.draft_revision, draftRevisionBefore + 1);
  assert.deepEqual(h.state.pages.audit.published_content, { ...derivedContent, __managedVersion: 1 });
  assert.equal(h.state.pages.audit.published_revision, draftRevisionBefore + 1);
  assert.deepEqual(await h.publicContent.getPublishedPageContent('audit'), derivedContent);

  const auditArchiveEntries = h.state.archives.filter((entry) => entry.page_key === 'audit');
  assert.equal(auditArchiveEntries.length, 1);
  assert.deepEqual(auditArchiveEntries[0].content, { ...derivedContent, __managedVersion: 1 });
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
