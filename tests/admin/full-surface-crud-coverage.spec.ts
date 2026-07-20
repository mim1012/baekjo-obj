import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  CORE_ADMIN_DOMAIN_KEYS,
  FULL_SURFACE_DOMAINS,
  type FullSurfaceDomain,
} from '../golden/_lib/fullSurfaceMatrix';

const root = path.resolve(__dirname, '..', '..');
const GOLDEN_SPEC_DIR = path.join(root, 'tests/golden');
const APP_DIR = path.join(root, 'src/app');

function stripRouteDecorators(route: string): string {
  return route.split('?')[0].split('#')[0];
}

function appRouteExists(route: string): boolean {
  const cleanRoute = stripRouteDecorators(route);
  const segments = cleanRoute.split('/').filter(Boolean);
  const routeDir = path.join(APP_DIR, ...segments);
  return fs.existsSync(path.join(routeDir, 'page.tsx'));
}

function apiRouteExists(route: string): boolean {
  const cleanRoute = stripRouteDecorators(route);
  const segments = cleanRoute.split('/').filter(Boolean);
  const routeDir = path.join(APP_DIR, ...segments);
  return fs.existsSync(path.join(routeDir, 'route.ts'));
}

function readSpec(domain: FullSurfaceDomain): string {
  return domain.goldenSpecs
    .map((spec) => fs.readFileSync(path.join(GOLDEN_SPEC_DIR, spec), 'utf8'))
    .join('\n');
}

test.describe('관리자 핵심 도메인 full-surface CRUD/API/DB/화면 반영 매트릭스', () => {
  test('사용자가 지정한 9개 관리자 도메인이 모두 매트릭스에 정확히 등록돼 있다', () => {
    const keys = FULL_SURFACE_DOMAINS.map((domain) => domain.key).sort();
    expect(keys).toEqual([...CORE_ADMIN_DOMAIN_KEYS].sort());
  });

  for (const domain of FULL_SURFACE_DOMAINS) {
    test(`${domain.label}: 관리자 페이지·API·실구동 스펙·반영 surface가 연결돼 있다`, () => {
      expect(domain.goldenSpecs.length, `${domain.label} goldenSpecs 비어 있음`).toBeGreaterThan(0);
      expect(domain.operations.length, `${domain.label} operations 비어 있음`).toBeGreaterThan(0);
      expect(domain.publicOrMemberSurfaces.length, `${domain.label} public/member surfaces 비어 있음`).toBeGreaterThan(0);

      for (const adminPage of domain.adminPages) {
        expect(appRouteExists(adminPage), `${domain.label} 관리자 페이지 없음: ${adminPage}`).toBe(true);
      }
      for (const apiRoute of domain.adminApiRoutes) {
        expect(apiRouteExists(apiRoute), `${domain.label} 관리자 API route.ts 없음: ${apiRoute}`).toBe(true);
      }
      for (const spec of domain.goldenSpecs) {
        expect(fs.existsSync(path.join(GOLDEN_SPEC_DIR, spec)), `${domain.label} 스펙 파일 없음: ${spec}`).toBe(true);
      }

      const specSource = readSpec(domain);
      for (const needle of domain.evidenceNeedles) {
        expect(specSource, `${domain.label} 스펙 근거 문자열 누락: ${needle}`).toContain(needle);
      }
    });
  }

  test('공개/회원 반영이 불완전하거나 관리자 전용인 도메인은 gap을 명시한다', () => {
    const missingGap = FULL_SURFACE_DOMAINS
      .filter((domain) => domain.status !== 'verified')
      .filter((domain) => !domain.gap || domain.gap.trim().length === 0)
      .map((domain) => domain.key);
    expect(missingGap).toEqual([]);
  });
});
