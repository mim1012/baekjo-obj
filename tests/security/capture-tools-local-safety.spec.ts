import { expect, test } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');
const adminScript = path.join(root, 'scripts', 'capture-admin-screen-audit.mjs');
const publicScript = path.join(root, 'scripts', 'capture-public-screen-audit.mjs');

function readScript(scriptPath: string): string {
  return fs.readFileSync(scriptPath, 'utf8');
}

function extractApprovedRouteSpecBlock(source: string): string {
  const match = source.match(/const routeSpecs = \[[\s\S]*?\n\];/u);
  if (!match) throw new Error('routeSpecs block not found');
  return match[0];
}

function runBlockedTarget(scriptPath: string, envName: string, target: string) {
  return spawnSync(process.execPath, [scriptPath], {
    cwd: root,
    env: {
      ...process.env,
      [envName]: target,
      E2E_ADMIN_EMAIL: 'admin@example.test',
      E2E_ADMIN_PASSWORD: 'synthetic-password',
    },
    encoding: 'utf8',
    timeout: 10_000,
  });
}

test.describe('capture tools local-only safety contract', () => {
  test('scripts are syntactically valid without launching a browser', () => {
    for (const scriptPath of [adminScript, publicScript]) {
      const result = spawnSync(process.execPath, ['--check', scriptPath], {
        cwd: root,
        encoding: 'utf8',
        timeout: 10_000,
      });

      expect(result.status, result.stderr).toBe(0);
    }
  });

  test('capture tools default to loopback and reject production or preview before browser/network work', () => {
    const blockedTargets = [
      'https://www.baekjo-objet.com',
      'https://baekjo-objet.com',
      'https://baekjo-obj.vercel.app',
      'https://baekjo-objet-git-main-acme-12345678.vercel.app',
      'https://example.test',
    ];

    for (const [scriptPath, envName] of [
      [adminScript, 'ADMIN_AUDIT_BASE_URL'],
      [publicScript, 'PUBLIC_AUDIT_BASE_URL'],
    ] as const) {
      const source = readScript(scriptPath);
      expect(source).toContain("const DEFAULT_BASE_URL = 'http://127.0.0.1:3000'");
      expect(source).toContain("new Set(['localhost', '127.0.0.1'])");

      for (const target of blockedTargets) {
        const result = runBlockedTarget(scriptPath, envName, target);
        expect(result.status, `${scriptPath} accepted ${target}`).not.toBe(0);
        expect(result.stderr).toContain('localhost 또는 127.0.0.1만 허용');
      }
    }
  });

  test('admin capture uses real login only and does not port synthetic auth token/session bypasses', () => {
    const source = readScript(adminScript);

    expect(source).toContain('E2E_ADMIN_EMAIL');
    expect(source).toContain('E2E_ADMIN_PASSWORD');
    expect(source).toContain("page.locator('input[type=\"email\"]').fill(email)");
    expect(source).toContain("page.locator('input[type=\"password\"]').fill(password)");
    expect(source).not.toContain('ADMIN_AUDIT_LOCAL_SESSION');
    expect(source).not.toContain("from('members')");
    expect(source).not.toContain('authjs.session-token');
    expect(source).not.toContain('next-auth/jwt');
  });

  test('approved capture pages omit customer PII and write-oriented routes', () => {
    const adminSource = readScript(adminScript);
    const publicSource = readScript(publicScript);
    const adminRoutes = extractApprovedRouteSpecBlock(adminSource);
    const publicRoutes = extractApprovedRouteSpecBlock(publicSource);

    for (const route of [
      '/admin/orders',
      '/admin',
      '/admin/members',
      '/admin/inquiries',
      '/admin/partner-inquiries',
      '/admin/insurance',
      '/admin/survey-results',
      '/admin/products/new',
      '/cart',
      '/checkout',
      '/order-complete',
      '/mypage',
      '/partner/orders',
      '/insurance/apply',
      '/insurance/complete',
    ]) {
      expect(adminRoutes).not.toContain(`'${route}'`);
      expect(publicRoutes).not.toContain(`'${route}'`);
    }

    expect(adminSource).toContain('approvedPages');
    expect(publicSource).toContain('approvedPages');
    expect(publicSource).not.toContain('discoverDetail');
    expect(adminSource).not.toContain("getByRole('button', { name: '변경사항 적용'");
  });

  test('admin capture omits the PII-bearing dashboard and requires active admin status', () => {
    const source = readScript(adminScript);
    const adminRoutes = extractApprovedRouteSpecBlock(source);

    expect(adminRoutes).not.toContain("'/admin'");
    expect(source).toContain('/login?redirect=%2Fadmin%2Fproducts');
    expect(source).toContain("me?.user?.status !== 'active'");
    expect(source).not.toContain("me?.user?.status && me.user.status !== 'active'");
  });

  test('capture browser contexts block remote redirects/assets and non-auth writes', () => {
    const adminSource = readScript(adminScript);
    const publicSource = readScript(publicScript);

    for (const source of [adminSource, publicSource]) {
      expect(source).toContain("context.route('**/*'");
      expect(source).toContain("route.abort('blockedbyclient')");
      expect(source).toContain('assertLocalUrl(actualUrl)');
      expect(source).toContain('target.origin !== root.origin');
      expect(source).toContain('READ_METHODS.has(request.method())');
    }
    expect(adminSource).toContain('LOGIN_WRITE_PATH_PREFIXES');
    expect(adminSource).toContain('allowAuthWrites');
    expect(publicSource).not.toContain('LOGIN_WRITE_PATH_PREFIXES');
  });
});
