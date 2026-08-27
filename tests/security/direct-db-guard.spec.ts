import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { q, supabaseEnvReady, sweepStaleFixtures } from '../payments/helpers';

const managedEnvironmentKeys = [
  'SUPABASE_URL',
  'TEST_SUPABASE_PROJECT_REF',
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_SECRET_KEY',
] as const;
const root = path.resolve(__dirname, '..', '..');
const directDbSpecs = [
  'tests/payments/payment-routes.spec.ts',
  'tests/payments/state-machine.db.spec.ts',
  'tests/payments/partial-refund.db.spec.ts',
  'tests/shipments/confirm-guard.db.spec.ts',
  'tests/shipments/auto-confirm-payment-gate.db.spec.ts',
] as const;

test.describe('direct runner Supabase DB guard', () => {
  test.describe.configure({ mode: 'serial' });

  test('mismatched ref와 missing Management API credential은 cleanup/q 요청 전에 차단된다', async () => {
    const previousEnvironment = new Map<string, string | undefined>();
    const previousFetch = globalThis.fetch;
    let requestCount = 0;

    for (const key of managedEnvironmentKeys) {
      previousEnvironment.set(key, process.env[key]);
    }

    globalThis.fetch = async () => {
      requestCount += 1;
      return new Response('[]');
    };

    try {
      process.env.SUPABASE_URL = 'https://wrongref1234567890.supabase.co';
      process.env.TEST_SUPABASE_PROJECT_REF = 'expectedref123456789';
      process.env.SUPABASE_ACCESS_TOKEN = 'synthetic-access-token';
      Reflect.deleteProperty(process.env, 'SUPABASE_SECRET_KEY');

      await expect(sweepStaleFixtures()).rejects.toThrow();
      await expect(q('select 1;')).rejects.toThrow();
      expect(requestCount).toBe(0);

      process.env.SUPABASE_URL = 'https://expectedref123456789.supabase.co';
      Reflect.deleteProperty(process.env, 'SUPABASE_ACCESS_TOKEN');
      process.env.SUPABASE_SECRET_KEY = 'synthetic-secret-key';

      expect(supabaseEnvReady()).toBe(false);
      await expect(q('select 1;')).rejects.toThrow();
      expect(requestCount).toBe(0);
    } finally {
      globalThis.fetch = previousFetch;
      for (const key of managedEnvironmentKeys) {
        const value = previousEnvironment.get(key);
        if (value === undefined) {
          Reflect.deleteProperty(process.env, key);
        } else {
          process.env[key] = value;
        }
      }
    }
  });

  test('승인된 baekjo staging ref에서는 q와 stale cleanup 요청을 보존한다', async () => {
    const previousEnvironment = new Map<string, string | undefined>();
    const previousFetch = globalThis.fetch;
    let requestCount = 0;

    for (const key of managedEnvironmentKeys) {
      previousEnvironment.set(key, process.env[key]);
    }

    globalThis.fetch = async () => {
      requestCount += 1;
      return new Response('[]');
    };

    try {
      process.env.SUPABASE_URL = 'https://aeooyivfijthfcrfrnyk.supabase.co';
      process.env.TEST_SUPABASE_PROJECT_REF = 'aeooyivfijthfcrfrnyk';
      process.env.SUPABASE_ACCESS_TOKEN = 'synthetic-access-token';
      Reflect.deleteProperty(process.env, 'SUPABASE_SECRET_KEY');

      expect(supabaseEnvReady()).toBe(true);
      await expect(q('select 1;')).resolves.toEqual([]);
      await expect(sweepStaleFixtures()).resolves.toBeUndefined();
      expect(requestCount).toBe(3);
    } finally {
      globalThis.fetch = previousFetch;
      for (const key of managedEnvironmentKeys) {
        const value = previousEnvironment.get(key);
        if (value === undefined) {
          Reflect.deleteProperty(process.env, key);
        } else {
          process.env[key] = value;
        }
      }
    }
  });

  test('모든 payment/shipment direct DB spec은 setup과 import-time cleanup 전에 안전 readiness를 평가한다', () => {
    for (const relativePath of directDbSpecs) {
      const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
      const readinessOffset = source.indexOf('test.skip(!supabaseEnvReady()');
      const firstQueryOffset = source.indexOf('await q(');
      const cleanupOffset = source.indexOf('void sweepStaleFixtures()');

      expect(readinessOffset, relativePath).toBeGreaterThan(-1);
      expect(firstQueryOffset, relativePath).toBeGreaterThan(readinessOffset);
      if (cleanupOffset >= 0) {
        expect(source, relativePath).toContain(
          'if (supabaseEnvReady()) void sweepStaleFixtures()',
        );
        expect(cleanupOffset, relativePath).toBeGreaterThan(readinessOffset);
      }
    }
  });
});
