import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

const root = new URL('../../', import.meta.url);
const require = createRequire(import.meta.url);
const Uploader = () => null;

function load(relative, dependencies) {
  const { outputText } = ts.transpileModule(readFileSync(new URL(relative, root), 'utf8'), {
    fileName: relative,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', outputText)((name) => {
    if (name === 'react/jsx-runtime') return require(name);
    assert(Object.hasOwn(dependencies, name), `Unstubbed dependency: ${name}`);
    return dependencies[name];
  }, loaded, loaded.exports);
  return loaded.exports;
}

function uploaderProps(nested) {
  const isCmsContent = (value) => value !== null && typeof value === 'object';
  const dependencies = {
    '@/components/admin-new/common/ImageUploader': { default: Uploader },
    './contentPath': { isCmsContent },
    './ItemListEditor': { default: () => null, normalizeItemList: (value) => value },
    './LinkListEditor': { default: () => null },
    'lucide-react': { ArrowDown: () => null, ArrowUp: () => null, Plus: () => null, Trash2: () => null },
  };
  const filename = nested ? 'ItemListEditor' : 'FieldEditor';
  const component = load(`src/components/admin-new/pages/${filename}.tsx`, dependencies).default;
  const tree = component(nested
    ? { pageKey: 'audit', field: { path: 'cards', type: 'item-list', itemFields: [{ key: 'image', type: 'image', label: 'Image' }] }, items: [{ image: '' }], onChange() {} }
    : { pageKey: 'audit', field: { path: 'hero.image', type: 'image', label: 'Image' }, value: '', onChange() {} });
  const found = [];
  function visit(value) {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== 'object') return;
    if (value.type === Uploader) found.push(value.props);
    visit(value.props?.children);
  }
  visit(tree);
  assert.equal(found.length, 1);
  return found[0];
}

for (const nested of [false, true]) {
  test(`${nested ? 'nested' : 'top-level'} CMS image removal preserves the uploaded published/history object`, async () => {
    const props = uploaderProps(nested);
    assert.equal(props.entityId, 'cms-audit');
    assert.equal(props.draftId, undefined);
    const objects = new Map();
    let deletes = 0;
    const route = load('src/app/api/admin/upload/route.ts', {
      'next/server': { NextResponse: { json: (body, options) => new Response(JSON.stringify(body), { status: options?.status ?? 200 }) } },
      '@/lib/admin/requireAdmin': { requireAdmin: async () => ({ ok: true, requester: { id: 'admin-fixture' } }) },
      '@/lib/logServerError': { logServerError() {} },
      '@/lib/supabase/server': { getSupabase: () => ({ storage: { from: () => ({
        upload: async (path, bytes, options) => { assert.equal(options.upsert, false); objects.set(path, bytes); return { error: null }; },
        getPublicUrl: (path) => ({ data: { publicUrl: `https://assets.invalid/${path}` } }),
        remove: async (paths) => { deletes++; paths.forEach((path) => objects.delete(path)); return { error: null }; },
      }) } }) },
    });
    const form = new FormData();
    form.set('file', new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'fixture.png', { type: 'image/png' }));
    form.set('domain', props.domain);
    form.set('usage', props.usage);
    form.set('entityId', props.entityId);
    const uploaded = await route.POST(new Request('http://localhost/api/admin/upload', { method: 'POST', body: form }));
    assert.equal(uploaded.status, 201);
    const image = await uploaded.json();
    assert.match(image.path, /^banners\/hero\/[a-f0-9-]+\.png$/);
    const deletion = await route.DELETE({ nextUrl: new URL(`http://localhost/api/admin/upload?path=${encodeURIComponent(image.path)}`) });
    assert.deepEqual(await deletion.json(), { success: true, deleted: false, reason: 'permanent-file-preserved' });
    assert.equal(deletes, 0);
    assert(objects.has(image.path), 'Object referenced by published content and versions must remain readable');
  });
}

test('every CMS ImageUploader call uses entityId and never draftId', () => {
  const directory = new URL('src/components/admin-new/pages/', root);
  let count = 0;
  for (const file of readdirSync(directory).filter((file) => file.endsWith('.tsx'))) {
    const ast = ts.createSourceFile(file, readFileSync(new URL(file, directory), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function visit(node) {
      if ((ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) && node.tagName.getText(ast) === 'ImageUploader') {
        const attributes = node.attributes.properties.map((attribute) => ts.isJsxAttribute(attribute) ? attribute.name.getText(ast) : 'spread');
        assert(attributes.includes('entityId'), `${file}: missing permanent entityId`);
        assert(!attributes.includes('draftId'), `${file}: temporary draft path risks published history`);
        assert(!attributes.includes('spread'), `${file}: uploader storage mode must be explicit`);
        count++;
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
  }
  assert(count > 0);
});
