import assert from 'node:assert/strict';
import { closeSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { runImport, STAGING_REF, validateEnvironment } from './cms-import/core.mjs';
import { createTransport } from './cms-import/transport.mjs';

const { values } = parseArgs({ options: {
  apply: { type: 'boolean', default: false },
  fixture: { type: 'string' },
  out: { type: 'string' },
  'base-url': { type: 'string' },
  help: { type: 'boolean' },
} });

if (values.help) {
  console.log('node --env-file=.env.test.local scripts/import-current-audit-cms.mjs [--out snapshot.json] [--apply --base-url http://127.0.0.1:3120]\nOffline: node scripts/import-current-audit-cms.mjs --fixture source-row.json\nDefault prepares JSON only. Apply requires staging, live runtime preflight, real administrator credentials, and no unpublished draft.');
} else {
  let io;
  let output;
  try {
    assert(!(values.fixture && values.apply), 'Fixtures can never be applied');
    if (values.out) output = openSync(values.out, 'wx');
    if (values.fixture) {
      const row = JSON.parse(readFileSync(values.fixture, 'utf8'));
      io = { readSource: async () => row };
    } else {
      const safeOrigin = validateEnvironment(process.env, values.apply, values['base-url'] ?? process.env.E2E_BASE_URL);
      console.error(`Target: staging ${STAGING_REF}; source GET only; localhost=${safeOrigin ?? 'not used'}; concurrency=1; retries=0; planned page navigations=${values.apply ? '2 (login/admin)' : '0'}; CMS writes=${values.apply ? 'at most PATCH 1 + guarded POST 1' : '0'}`);
      io = await createTransport(process.env, { apply: values.apply, baseUrl: safeOrigin });
    }
    const result = await runImport(io, { apply: values.apply });
    const json = JSON.stringify(result, null, 2) + '\n';
    if (output !== undefined) writeFileSync(output, json);
    else process.stdout.write(json);
    console.error(`Audit import: ${result.status}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Audit import failed');
    console.error('No automatic retry or rollback. If apply was attempted, inspect the current draft/history before another run.');
    process.exitCode = 1;
  } finally {
    if (output !== undefined) closeSync(output);
    await io?.dispose?.();
  }
}
