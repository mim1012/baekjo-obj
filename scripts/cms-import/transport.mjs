import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { chromium, request } from '@playwright/test';
import { STAGING_REF, validateEnvironment } from './core.mjs';
import { loginWithHydration } from './login.mjs';

export async function checked(response, label) {
  if (response.status() === 409) throw new Error(`${label}: 409 revision conflict; stopped without retry`);
  assert(response.ok(), `${label}: HTTP ${response.status()}; stopped without retry`);
  return response.json();
}

async function send(context, method, route, options = {}) {
  try {
    return await context.fetch(route, { ...options, method, maxRedirects: 0, maxRetries: 0 });
  } catch {
    throw new Error(`${method} ${route}: transport failed; outcome may be unknown; stopped without retry`);
  }
}

export async function createTransport(env, { apply, baseUrl }) {
  validateEnvironment(env, apply, baseUrl);
  const database = await request.newContext({
    baseURL: env.SUPABASE_URL, timeout: 30_000, maxRedirects: 0,
    extraHTTPHeaders: { apikey: env.SUPABASE_SECRET_KEY, Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}` },
  });
  let api;
  let browser;
  const endpoint = '/api/admin/settings/pages/audit';
  const call = async (method, route, data) => checked(await send(api, method, route, {
    data, headers: { 'Cache-Control': 'no-store' },
  }), `${method} ${route}`);
  return {
    async readSource() {
      const rows = await checked(await send(database, 'GET', '/rest/v1/site_settings', {
        params: { id: 'eq.page-texts', select: 'id,value,updated_at' },
        headers: { 'Cache-Control': 'no-store' },
      }), 'Read site_settings.page-texts');
      assert(Array.isArray(rows) && rows.length === 1, 'Expected exactly one page-texts source row');
      return rows[0];
    },
    async preflightAndLogin() {
      api = await request.newContext({ baseURL: baseUrl, timeout: 30_000, maxRedirects: 0 });
      const runtime = await call('GET', '/api/test/supabase-ref');
      assert(runtime.projectRef === STAGING_REF, 'Running localhost server is not connected to staging');
      const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
      const executablePath = env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (existsSync(chromePath) ? chromePath : undefined);
      browser = await chromium.launch({ headless: true, executablePath });
      const context = await browser.newContext({ baseURL: baseUrl });
      const origin = new URL(baseUrl).origin;
      await context.route('**/*', (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
      const page = await context.newPage();
      try {
        await loginWithHydration(page, env.E2E_ADMIN_EMAIL, env.E2E_ADMIN_PASSWORD);
      } catch {
        throw new Error('UI login or hydration wait failed; stopped before CMS writes without retry');
      }
      await api.dispose();
      api = context.request;
      const session = await call('GET', '/api/members/me');
      assert(session.user?.email === env.E2E_ADMIN_EMAIL.trim().toLowerCase() && session.user.role === 'admin' && session.user.status === 'active', 'Real active admin session verification failed');
    },
    readState: () => call('GET', endpoint),
    async readPublished() {
      const response = await send(api, 'GET', '/api/content/audit', { headers: { 'Cache-Control': 'no-store' } });
      if (response.status() === 404) return null;
      const payload = await checked(response, 'Read published Audit');
      assert(payload.content && typeof payload.content === 'object', 'Invalid published content');
      return payload.content;
    },
    save: (data) => call('PATCH', endpoint, data),
    publish: (data) => call('POST', `${endpoint}/import-publish`, data),
    async dispose() { await api?.dispose(); await browser?.close(); await database.dispose(); },
  };
}
