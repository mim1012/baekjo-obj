import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { shouldStartLocalWebServer } from '../../playwright.config';
import {
  assertNoProductionOrPreviewTarget,
  DEFAULT_E2E_BASE_URL,
  resolveE2EBaseUrl,
} from '../_lib/envSafety';
import {
  assertLocalhostAppRuntimeSupabaseRefMatchesTestRef,
  assertAllowedTestSupabaseRef,
  extractSupabaseProjectRef,
  supabaseEnvReadySafely,
} from '../_lib/supabaseSafety';

const root = path.resolve(__dirname, '..', '..');

function read(...segments: string[]): string {
  return fs.readFileSync(path.join(root, ...segments), 'utf8');
}

test.describe('Production 비용 안전 경계', () => {
  test.describe.configure({ mode: 'serial' });

  test('Supabase project ref가 없거나 실제 URL과 다르면 DB 접근 전에 hard fail한다', () => {
    expect(() =>
      assertAllowedTestSupabaseRef('payments', {
        SUPABASE_URL: 'https://aeooyivfijthfcrfrnyk.supabase.co',
        SUPABASE_ACCESS_TOKEN: 'synthetic-access-token',
      }),
    ).toThrow();

    expect(() =>
      assertAllowedTestSupabaseRef('storage', {
        SUPABASE_URL: 'https://aeooyivfijthfcrfrnyk.supabase.co',
        TEST_SUPABASE_PROJECT_REF: 'differentstagingref01',
        SUPABASE_SECRET_KEY: 'synthetic-secret-key',
      }),
    ).toThrow();
  });

  test('승인된 baekjo staging ref만 정확히 일치할 때 허용한다', () => {
    const environment = {
      SUPABASE_URL: 'https://aeooyivfijthfcrfrnyk.supabase.co',
      TEST_SUPABASE_PROJECT_REF: 'aeooyivfijthfcrfrnyk',
      SUPABASE_ACCESS_TOKEN: 'synthetic-access-token',
    };

    expect(extractSupabaseProjectRef(environment.SUPABASE_URL)).toBe('aeooyivfijthfcrfrnyk');
    expect(() => assertAllowedTestSupabaseRef('payments', environment)).not.toThrow();
    expect(supabaseEnvReadySafely('payments', environment)).toBe(true);
  });

  test('Supabase env가 전혀 없는 DB-free 테스트는 skip 판단을 할 수 있다', () => {
    expect(supabaseEnvReadySafely('payments', {})).toBe(false);
  });

  test('부분 Supabase env는 DB-free로 오인하지 않고 hard fail한다', () => {
    expect(() =>
      supabaseEnvReadySafely('payments', {
        SUPABASE_URL: 'https://aeooyivfijthfcrfrnyk.supabase.co',
      }),
    ).toThrow();
    expect(() =>
      supabaseEnvReadySafely('storage', {
        SUPABASE_URL: 'https://aeooyivfijthfcrfrnyk.supabase.co',
        TEST_SUPABASE_PROJECT_REF: 'aeooyivfijthfcrfrnyk',
      }),
    ).toThrow();
  });

  test('malformed Supabase URL과 target URL은 가드를 우회하지 못한다', () => {
    expect(extractSupabaseProjectRef('not-a-supabase-url')).toBeNull();
    expect(extractSupabaseProjectRef('https://supabase.co.attacker.example')).toBeNull();
    expect(() => assertNoProductionOrPreviewTarget('not-a-target-url')).toThrow();
  });

  test('Production 커스텀/Vercel host와 Preview write target을 차단한다', () => {
    for (const target of [
      'https://www.baekjo-objet.com',
      'https://baekjo-objet.com',
      'https://baekjo-obj.vercel.app',
      'https://robust-pelican-git-feature.example.vercel.app',
    ]) {
      expect(() => assertNoProductionOrPreviewTarget(target)).toThrow();
    }
  });

  test('명시 승인과 정확한 예산이 있는 Preview read-only target만 typed mode로 허용한다', () => {
    const previewTarget = 'https://baekjo-objet-git-main-acme-12345678.vercel.app';
    const approvedReadOnlyEnvironment = {
      PREVIEW_QA_ACK: '1',
      MAX_TOP_LEVEL_NAVIGATIONS: '5',
      MAX_ROUTE_CALLS: '5',
      PLAYWRIGHT_WORKERS: '1',
      PLAYWRIGHT_RETRIES: '0',
    };

    expect(() => assertNoProductionOrPreviewTarget(previewTarget)).toThrow();
    expect(
      assertNoProductionOrPreviewTarget(previewTarget, {
        allowPreviewReadOnly: true,
        environment: approvedReadOnlyEnvironment,
      }).hostname,
    ).toBe('baekjo-objet-git-main-acme-12345678.vercel.app');
    expect(() =>
      assertNoProductionOrPreviewTarget(previewTarget, {
        allowPreviewReadOnly: true,
        environment: { ...approvedReadOnlyEnvironment, MAX_ROUTE_CALLS: '6' },
      }),
    ).toThrow();
    expect(() =>
      assertNoProductionOrPreviewTarget(previewTarget, {
        allowPreviewReadOnly: true,
        environment: { ...approvedReadOnlyEnvironment, PREVIEW_QA_ACK: '0' },
      }),
    ).toThrow();
    expect(() =>
      assertNoProductionOrPreviewTarget('https://baekjo-obj.vercel.app', {
        allowPreviewReadOnly: true,
        environment: approvedReadOnlyEnvironment,
      }),
    ).toThrow();
  });

  test('payment write spec routes PAYMENTS_PREVIEW_URL through the common loopback guard before fetch', () => {
    const source = read('tests', 'payments', 'payment-routes.spec.ts');
    const guardOffset = source.indexOf('const BASE = resolvePaymentsWriteBaseUrl();');
    const firstFetchOffset = source.indexOf('fetch(');
    let fetchCalled = false;

    const fetchAfterGuard = (): void => {
      assertNoProductionOrPreviewTarget('https://baekjo-objet-git-main-acme-12345678.vercel.app');
      fetchCalled = true;
    };

    expect(fetchAfterGuard).toThrow();
    expect(fetchCalled).toBe(false);
    expect(guardOffset).toBeGreaterThanOrEqual(0);
    expect(firstFetchOffset).toBeGreaterThan(guardOffset);
  });

  test('Production 비용 승인값도 원격 target 차단을 해제하지 못하고 env를 복원한다', () => {
    const previousAcknowledgement = process.env.ALLOW_PRODUCTION_QA;

    try {
      process.env.ALLOW_PRODUCTION_QA = 'I_ACCEPT_PRODUCTION_COST';
      expect(() => assertNoProductionOrPreviewTarget('https://baekjo-objet.com')).toThrow();
      expect(() =>
        assertNoProductionOrPreviewTarget('https://synthetic-preview.vercel.app'),
      ).toThrow();
    } finally {
      if (previousAcknowledgement === undefined) {
        delete process.env.ALLOW_PRODUCTION_QA;
      } else {
        process.env.ALLOW_PRODUCTION_QA = previousAcknowledgement;
      }
    }
  });

  test('localhost와 127.0.0.1만 허용하고 무설정 기본값도 loopback이다', () => {
    expect(resolveE2EBaseUrl({})).toBe(DEFAULT_E2E_BASE_URL);
    expect(assertNoProductionOrPreviewTarget('http://localhost:3100').hostname).toBe('localhost');
    expect(assertNoProductionOrPreviewTarget('http://127.0.0.1:3100').hostname).toBe('127.0.0.1');
  });

  test('차단 오류는 Supabase URL, token, secret, raw key를 노출하지 않는다', () => {
    const sensitiveValues = [
      'https://wrongref1234567890.supabase.co?token=synthetic-query-token',
      'synthetic-access-token',
      'synthetic-secret-key',
      'synthetic-raw-key',
    ];
    let errorMessage = 'EXPECTED_ERROR_WAS_NOT_THROWN';

    try {
      assertAllowedTestSupabaseRef('storage', {
        SUPABASE_URL: sensitiveValues[0],
        TEST_SUPABASE_PROJECT_REF: 'aeooyivfijthfcrfrnyk',
        SUPABASE_ACCESS_TOKEN: sensitiveValues[1],
        SUPABASE_SECRET_KEY: sensitiveValues[2],
        SWEETTRACKER_API_KEY: sensitiveValues[3],
      });
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      errorMessage = error.message;
    }

    expect(errorMessage).not.toBe('EXPECTED_ERROR_WAS_NOT_THROWN');
    for (const sensitiveValue of sensitiveValues) {
      expect(errorMessage).not.toContain(sensitiveValue);
    }
  });

  test('localhost 앱 runtime Supabase ref가 test ref와 일치할 때만 쓰기 전 preflight를 통과한다', async () => {
    const environment = {
      E2E_BASE_URL: 'http://127.0.0.1:3000',
      SUPABASE_URL: 'https://aeooyivfijthfcrfrnyk.supabase.co',
      TEST_SUPABASE_PROJECT_REF: 'aeooyivfijthfcrfrnyk',
      SUPABASE_ACCESS_TOKEN: 'synthetic-access-token',
    };
    let requestedTarget = '';

    await expect(
      assertLocalhostAppRuntimeSupabaseRefMatchesTestRef('golden', environment, async (target) => {
        requestedTarget = target.toString();
        return new Response(JSON.stringify({ projectRef: 'aeooyivfijthfcrfrnyk' }));
      }),
    ).resolves.toBe('aeooyivfijthfcrfrnyk');

    expect(requestedTarget).toBe('http://127.0.0.1:3000/api/__test__/supabase-ref');
  });

  test('localhost 앱 runtime ref mismatch와 missing 또는 invalid response는 쓰기 전에 hard fail한다', async () => {
    const environment = {
      E2E_BASE_URL: 'http://localhost:3000',
      SUPABASE_URL: 'https://aeooyivfijthfcrfrnyk.supabase.co',
      TEST_SUPABASE_PROJECT_REF: 'aeooyivfijthfcrfrnyk',
      SUPABASE_ACCESS_TOKEN: 'synthetic-access-token',
    };
    let writeAttempted = false;

    const writeAfterPreflight = async (): Promise<void> => {
      await assertLocalhostAppRuntimeSupabaseRefMatchesTestRef('golden', environment, async () =>
        new Response(JSON.stringify({ projectRef: 'differentstagingref01' })),
      );
      writeAttempted = true;
    };

    await expect(
      writeAfterPreflight(),
    ).rejects.toThrow();
    expect(writeAttempted).toBe(false);

    await expect(
      assertLocalhostAppRuntimeSupabaseRefMatchesTestRef('golden', environment, async () =>
        new Response(JSON.stringify({})),
      ),
    ).rejects.toThrow();
    expect(writeAttempted).toBe(false);

    await expect(
      assertLocalhostAppRuntimeSupabaseRefMatchesTestRef('golden', environment, async () =>
        new Response('not-json'),
      ),
    ).rejects.toThrow();
    expect(writeAttempted).toBe(false);
  });

  test('localhost app runtime preflight는 remote target에서 request seam을 호출하지 않는다', async () => {
    const environment = {
      E2E_BASE_URL: 'https://synthetic-preview.vercel.app',
      SUPABASE_URL: 'https://aeooyivfijthfcrfrnyk.supabase.co',
      TEST_SUPABASE_PROJECT_REF: 'aeooyivfijthfcrfrnyk',
      SUPABASE_ACCESS_TOKEN: 'synthetic-access-token',
    };
    let requestCalled = false;

    await expect(
      assertLocalhostAppRuntimeSupabaseRefMatchesTestRef('golden', environment, async () => {
        requestCalled = true;
        return new Response(JSON.stringify({ projectRef: 'aeooyivfijthfcrfrnyk' }));
      }),
    ).rejects.toThrow();

    expect(requestCalled).toBe(false);
  });

  test('Playwright의 무설정 기본 대상은 로컬이며 원격 실행은 병렬·재시도하지 않는다', () => {
    const source = read('playwright.config.ts');
    const targetSafetySource = read('tests', '_lib', 'envSafety.ts');

    expect(source).toContain('const baseURL = resolveE2EBaseUrl();');
    expect(source).toContain('assertNoProductionOrPreviewTarget(baseURL)');
    expect(source).toContain('fullyParallel: isLocal');
    expect(source).toContain('retries: isLocal ? 1 : 0');
    expect(source).toContain('workers: isLocal ? undefined : 1');
    expect(shouldStartLocalWebServer(true, ['--project=chromium'])).toBe(true);
    expect(shouldStartLocalWebServer(true, ['--project', 'golden-smoke'])).toBe(true);
    expect(shouldStartLocalWebServer(true, ['--project=products'])).toBe(false);
    expect(shouldStartLocalWebServer(true, ['--project=security'])).toBe(false);
    expect(shouldStartLocalWebServer(false, ['--project=chromium'])).toBe(false);
    expect(targetSafetySource).toContain("'www.baekjo-objet.com'");
    expect(targetSafetySource).toContain("'baekjo-obj.vercel.app'");
    expect(source).toContain("'x-vercel-protection-bypass'");
    expect(source).toContain('selectedProjects.some((project) => browserProjects.has(project))');
    expect(source).not.toContain('process.env.ALLOW_PRODUCTION_QA =');
  });

  test('레이아웃 캡처는 Production을 기본값으로 사용하지 않는다', () => {
    const source = read('scripts', 'layout-snapshot.mjs');

    expect(source).not.toContain("process.argv[3] || 'https://www.baekjo-objet.com'");
    expect(source).toContain("process.argv[3] || 'http://127.0.0.1:3000'");
    expect(source).toContain('ALLOW_PRODUCTION_QA');
  });

  test('릴리즈 QA 스크립트도 직접 실행 시 Production을 거부한다', () => {
    const source = read('scripts', 'qa-release-check.mjs');

    expect(source).toContain("'www.baekjo-objet.com'");
    expect(source).toContain("'baekjo-objet.com'");
    expect(source).toContain("'baekjo-obj.vercel.app'");
    expect(source).toContain('ALLOW_PRODUCTION_QA');
  });

  test('robots 메타데이터가 비용 유발 AI 크롤러를 차단하고 링크 미리보기 봇은 유지한다', () => {
    const robotsPath = path.join(root, 'src', 'app', 'robots.ts');

    expect(fs.existsSync(robotsPath)).toBe(true);
    if (!fs.existsSync(robotsPath)) return;

    const source = fs.readFileSync(robotsPath, 'utf8');
    for (const crawler of [
      'meta-externalagent',
      'Meta-ExternalFetcher',
      'Meta-WebIndexer',
      'GPTBot',
      'Amazonbot',
    ]) {
      expect(source).toContain(`'${crawler}'`);
    }
    expect(source).not.toContain('facebookexternalhit');
  });

  test('수동 Preview read-only QA 워크플로는 Vercel 별칭과 커스텀 Production 도메인을 모두 거부한다', () => {
    for (const workflow of ['release-qa.yml', 'update-baselines.yml']) {
      const source = read('.github', 'workflows', workflow);

      expect(source).toContain('baekjo-obj\\.vercel\\.app');
      expect(source).toContain('(www\\.)?baekjo-objet\\.com');
    }
  });
});
