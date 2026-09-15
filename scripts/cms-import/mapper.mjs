import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('../../', import.meta.url));
const cache = new Map();

function load(relative) {
  const filename = path.resolve(root, relative);
  assert(filename.startsWith(path.join(root, 'src') + path.sep), 'TS loader is restricted to local src');
  if (cache.has(filename)) return cache.get(filename).exports;
  const loadedModule = { exports: {} };
  cache.set(filename, loadedModule);
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const requireLocal = (specifier) => {
    assert(specifier.startsWith('@/'), 'Only project alias imports are allowed in the pure mapper');
    return load(`src/${specifier.slice(2)}.ts`);
  };
  new Function('require', 'module', 'exports', outputText)(requireLocal, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}

const data = load('src/data/pageTextContent.ts');
const mapper = load('src/components/admin-new/pages/auditContent.ts');
export const auditFields = data.pageTextDefinitions.find((page) => page.id === 'audit').fields;

export function buildSnapshot(row) {
  assert(row?.id === 'page-texts' && row.value && typeof row.value === 'object', 'Missing actual site_settings.page-texts row');
  assert(row.value.values && typeof row.value.values === 'object' && !Array.isArray(row.value.values), 'Invalid source values');
  for (const [key, value] of Object.entries(row.value.values)) {
    if (key.startsWith('audit.')) {
      assert(auditFields.some((field) => key === `audit.${field.id}`), `Unmapped Audit source field: ${key}`);
      assert(typeof value === 'string', `Non-text Audit source field: ${key}`);
    }
  }
  return mapper.auditContentFromPageTexts(data.normalizePageTextSettings(row.value));
}
