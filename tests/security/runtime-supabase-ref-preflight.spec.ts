import { expect, test } from '@playwright/test';
import { GET } from '../../src/app/api/__test__/supabase-ref/route';

type RuntimeEnvironment = Readonly<Record<string, string | undefined>>;

const runtimeEnvironmentKeys = [
  'NODE_ENV',
  'LOCAL_APP_RUNTIME_SUPABASE_PREFLIGHT',
  'SUPABASE_URL',
] as const;

async function withRuntimeEnvironment(
  environment: RuntimeEnvironment,
  action: () => Promise<void>,
): Promise<void> {
  const previousEnvironment = new Map<string, string | undefined>();
  for (const key of runtimeEnvironmentKeys) {
    previousEnvironment.set(key, process.env[key]);
    const value = environment[key];
    if (value === undefined) {
      Reflect.deleteProperty(process.env, key);
    } else {
      Reflect.set(process.env, key, value);
    }
  }

  try {
    await action();
  } finally {
    for (const key of runtimeEnvironmentKeys) {
      const value = previousEnvironment.get(key);
      if (value === undefined) {
        Reflect.deleteProperty(process.env, key);
      } else {
        Reflect.set(process.env, key, value);
      }
    }
  }
}

test.describe('localhost app runtime Supabase ref preflight route', () => {
  test.describe.configure({ mode: 'serial' });

  test('development loopback request with explicit local flag returns only the project ref without caching', async () => {
    await withRuntimeEnvironment(
      {
        NODE_ENV: 'development',
        LOCAL_APP_RUNTIME_SUPABASE_PREFLIGHT: '1',
        SUPABASE_URL: 'https://aeooyivfijthfcrfrnyk.supabase.co',
      },
      async () => {
        const response = await GET(new Request('http://127.0.0.1:3000/api/__test__/supabase-ref'));

        expect(response.status).toBe(200);
        expect(response.headers.get('Cache-Control')).toBe('no-store');
        await expect(response.json()).resolves.toEqual({ projectRef: 'aeooyivfijthfcrfrnyk' });
      },
    );
  });

  test('route rejects outside development, without flag, non-loopback, and invalid Supabase URL without leaking secrets', async () => {
    const sensitiveValues = [
      'https://wrongref1234567890.supabase.co?token=synthetic-query-token',
      'synthetic-secret-key',
      'synthetic-api-key',
    ];

    const blockedRequests = [
      {
        environment: {
          NODE_ENV: 'test',
          LOCAL_APP_RUNTIME_SUPABASE_PREFLIGHT: '1',
          SUPABASE_URL: sensitiveValues[0],
        },
        requestUrl: 'http://127.0.0.1:3000/api/__test__/supabase-ref',
      },
      {
        environment: {
          NODE_ENV: 'development',
          SUPABASE_URL: sensitiveValues[0],
        },
        requestUrl: 'http://127.0.0.1:3000/api/__test__/supabase-ref',
      },
      {
        environment: {
          NODE_ENV: 'development',
          LOCAL_APP_RUNTIME_SUPABASE_PREFLIGHT: '1',
          SUPABASE_URL: sensitiveValues[0],
        },
        requestUrl: 'http://localhost.test/api/__test__/supabase-ref',
      },
      {
        environment: {
          NODE_ENV: 'development',
          LOCAL_APP_RUNTIME_SUPABASE_PREFLIGHT: '1',
          SUPABASE_URL: 'not-a-supabase-url',
        },
        requestUrl: 'http://127.0.0.1:3000/api/__test__/supabase-ref',
      },
    ] as const;

    for (const blockedRequest of blockedRequests) {
      await withRuntimeEnvironment(blockedRequest.environment, async () => {
        const response = await GET(new Request(blockedRequest.requestUrl));
        const responseText = await response.text();

        expect(response.ok).toBe(false);
        for (const sensitiveValue of sensitiveValues) {
          expect(responseText).not.toContain(sensitiveValue);
        }
      });
    }
  });
});
