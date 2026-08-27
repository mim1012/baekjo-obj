import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { assertAllowedTestSupabaseRef } from '../_lib/supabaseSafety';

const root = path.resolve(__dirname, '..', '..');

function read(...segments: string[]): string {
  return fs.readFileSync(path.join(root, ...segments), 'utf8');
}

function functionBody(source: string, functionName: string): string {
  const functionStart = source.indexOf(`export async function ${functionName}(`);
  expect(functionStart, `${functionName} export`).toBeGreaterThanOrEqual(0);
  const nextFunction = source.indexOf('\nexport async function ', functionStart + 1);
  return source.slice(functionStart, nextFunction < 0 ? source.length : nextFunction);
}

function expectGuardBeforeWrite(body: string, guard: string, writeMarkers: readonly string[]): void {
  const guardIndex = body.indexOf(guard);
  expect(guardIndex, `${guard} presence`).toBeGreaterThanOrEqual(0);
  for (const marker of writeMarkers) {
    const writeIndex = body.indexOf(marker);
    expect(writeIndex, `${marker} presence`).toBeGreaterThanOrEqual(0);
    expect(guardIndex, `${guard} before ${marker}`).toBeLessThan(writeIndex);
  }
}

test.describe('golden app-mediated write safety contract', () => {
  test('admin and member login entries inherit the write preflight', () => {
    const adminSource = read('tests', 'golden', '_lib', 'adminCrudHelpers.ts');
    const memberSource = read('tests', 'golden', '_lib', 'memberCrudHelpers.ts');

    expectGuardBeforeWrite(functionBody(adminSource, 'loginAsAdmin'), 'await assertGoldenWritePreflight();', [
      'loginWithCredentials(',
    ]);
    expectGuardBeforeWrite(functionBody(memberSource, 'loginAsMember'), 'await assertGoldenWritePreflight();', [
      'loginWithCredentials(',
    ]);
  });

  test('admin cleanup helpers preflight before the first delete click', () => {
    const source = read('tests', 'golden', '_lib', 'adminCrudHelpers.ts');

    for (const functionName of ['deleteMatchingAdminRows', 'deleteMatchingRowsWithin']) {
      expectGuardBeforeWrite(
        functionBody(source, functionName),
        'await assertGoldenWritePreflight();',
        ['deleteButton.first().click()'],
      );
    }
  });

  test('member create, upload, cleanup, update, and confirm paths preflight before writes', () => {
    const source = read('tests', 'golden', '_lib', 'memberCrudHelpers.ts');
    const contracts = [
      ['createThrowawayProduct', ['setInputFiles(imageFilePath)', 'name: /등록|저장/']],
      ['cleanupThrowawayProducts', ['deleteButton.click()']],
      ['patchProductAsAdmin', ['page.request.patch(']],
      ['forceOrderDelivered', ['page.request.patch(']],
      ['forceOrderPurchaseConfirmed', ['page.request.patch(', 'page.request.post(']],
    ] as const;

    for (const [functionName, writeMarkers] of contracts) {
      expectGuardBeforeWrite(
        functionBody(source, functionName),
        'await assertGoldenWritePreflight();',
        writeMarkers,
      );
    }
  });

  test('shipment cleanup preserves the existing runtime preflight before any request', () => {
    const source = read('tests', 'golden', '_lib', 'orderShipmentScenarioHelpers.ts');
    const body = functionBody(source, 'cleanupScenarioRows');

    expectGuardBeforeWrite(body, 'await assertScenarioWritePreflight();', [
      'getAdminProducts(page)',
      'page.request.delete(',
    ]);
  });

  test('insurance upload preflights before purge/upload and Storage list guards before createClient', () => {
    const source = read('tests', 'golden', 'admin-crud-insurance-cert.spec.ts');
    const appPreflight = source.indexOf('await assertGoldenWritePreflight();');
    const purge = source.indexOf('await purgeStaleApplications(adminPage);');
    const upload = source.indexOf('setInputFiles(certFilePath)');
    const storageGuard = source.indexOf("assertAllowedTestSupabaseRef('storage');");
    const storageClient = source.indexOf('createClient(process.env.SUPABASE_URL');

    expect(appPreflight).toBeGreaterThanOrEqual(0);
    expect(appPreflight).toBeLessThan(purge);
    expect(appPreflight).toBeLessThan(upload);
    expect(storageGuard).toBeGreaterThanOrEqual(0);
    expect(storageGuard).toBeLessThan(storageClient);
  });

  test('direct Storage ref mismatch fails before a request can be attempted', () => {
    let requestCount = 0;
    const listStorageAfterGuard = (): void => {
      assertAllowedTestSupabaseRef('storage', {
        SUPABASE_URL: 'https://wrongref1234567890.supabase.co',
        TEST_SUPABASE_PROJECT_REF: 'aeooyivfijthfcrfrnyk',
        SUPABASE_SECRET_KEY: 'synthetic-secret-key',
      });
      requestCount += 1;
    };

    expect(listStorageAfterGuard).toThrow();
    expect(requestCount).toBe(0);
  });
});
