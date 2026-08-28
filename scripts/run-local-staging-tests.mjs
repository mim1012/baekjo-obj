import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const envPath = path.join(root, '.env.test.local');
const productionSupabaseRef = 'vgeqpbyyggxxaeowtbtj';

function readEnvFile(filePath) {
  const values = {};
  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/u)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/u.exec(line);
    if (!match) continue;
    const rawValue = match[2];
    values[match[1]] =
      rawValue.length >= 2 &&
      ((rawValue.startsWith('"') && rawValue.endsWith('"')) ||
        (rawValue.startsWith("'") && rawValue.endsWith("'")))
        ? rawValue.slice(1, -1)
        : rawValue;
  }
  return values;
}

function fail(message) {
  console.error(`[test:staging] ${message}`);
  process.exit(2);
}

if (!existsSync(envPath)) {
  fail(`missing ${envPath}; run paseo worktree setup first`);
}

const fileEnv = readEnvFile(envPath);
const env = { ...fileEnv, ...process.env };
const required = [
  'SUPABASE_URL',
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_SECRET_KEY',
  'TEST_SUPABASE_PROJECT_REF',
  'E2E_ADMIN_EMAIL',
  'E2E_ADMIN_PASSWORD',
  'E2E_MEMBER_EMAIL',
  'E2E_MEMBER_PASSWORD',
];
const missing = required.filter((name) => !env[name]?.trim());
if (missing.length > 0) fail(`missing required staging-test keys: ${missing.join(', ')}`);

let supabaseUrl;
try {
  supabaseUrl = new URL(env.SUPABASE_URL);
} catch {
  fail('SUPABASE_URL is not a valid URL');
}
const refMatch = /^([a-z0-9]{20})\.supabase\.co$/u.exec(supabaseUrl.hostname.toLowerCase());
if (!refMatch) fail('SUPABASE_URL must be a Supabase project URL');
if (refMatch[1] === productionSupabaseRef) fail('production Supabase project is blocked');
if (refMatch[1] !== env.TEST_SUPABASE_PROJECT_REF) {
  fail('SUPABASE_URL does not match TEST_SUPABASE_PROJECT_REF');
}

const baseUrl = env.E2E_BASE_URL || 'http://127.0.0.1:3000';
const paymentsBaseUrl = env.PAYMENTS_PREVIEW_URL || 'http://127.0.0.1:3000';
for (const [name, value] of [
  ['E2E_BASE_URL', baseUrl],
  ['PAYMENTS_PREVIEW_URL', paymentsBaseUrl],
]) {
  let target;
  try {
    target = new URL(value);
  } catch {
    fail(`${name} is not a valid URL`);
  }
  if (!['localhost', '127.0.0.1'].includes(target.hostname.toLowerCase())) {
    fail(`${name} must target localhost for this runner`);
  }
}

const requestedArgs = process.argv.slice(2);
const allowWrites = requestedArgs.includes('--allow-staging-writes');
const playwrightArgs = requestedArgs.filter((arg) => arg !== '--allow-staging-writes');
if (playwrightArgs.length === 0) {
  fail('usage: npm run test:staging -- -- --project=shipments [--allow-staging-writes]');
}

const writeProjectRequested = playwrightArgs.some((arg, index) => {
  const project = arg === '--project' ? playwrightArgs[index + 1] : arg.replace(/^--project=/u, '');
  return ['payments', 'shipments', 'golden-crud'].includes(project);
});
if ((writeProjectRequested || env.E2E_ADMIN_CRUD === '1') && !allowWrites) {
  fail('staging write-capable projects require --allow-staging-writes');
}

const childEnv = {
  ...env,
  E2E_BASE_URL: baseUrl,
  PAYMENTS_PREVIEW_URL: paymentsBaseUrl,
};
if (allowWrites) childEnv.E2E_ADMIN_CRUD = '1';

const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(executable, ['--no-install', 'playwright', 'test', ...playwrightArgs], {
  cwd: root,
  env: childEnv,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (result.error) {
  console.error(`[test:staging] ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
