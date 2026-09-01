import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { CMS_PAGE_DEFINITIONS } from '@/lib/cms/pageDefinitions';
import {
  PUBLIC_PAGE_REGISTRY,
  PUBLIC_PAGE_REGISTRY_ALIAS_ROUTE_PATTERNS,
  PUBLIC_PAGE_REGISTRY_EXCLUDED_ROUTE_PATTERNS,
} from '@/lib/admin/publicPageRegistry';

const root = path.resolve(__dirname, '..', '..');
const appRoot = path.join(root, 'src', 'app');

function collectPageFiles(dir: string): string[] {
  const result: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...collectPageFiles(fullPath));
    else if (entry.name === 'page.tsx') result.push(fullPath);
  }
  return result;
}

function toRoute(pageFile: string): string {
  const relative = path.relative(appRoot, path.dirname(pageFile)).split(path.sep).join('/');
  return relative ? `/${relative}` : '/';
}

test.describe('실제 고객 화면 ↔ 관리자 단일 연결 기준표', () => {
  test('보험·화면 없는 콜백을 제외한 모든 고객 page.tsx가 정확히 한 번 등록돼 있다', () => {
    const excluded = new Set<string>(PUBLIC_PAGE_REGISTRY_EXCLUDED_ROUTE_PATTERNS);
    const actual = collectPageFiles(appRoot)
      .map(toRoute)
      .filter((route) => !route.startsWith('/admin') && !excluded.has(route))
      .sort();
    const registered = [
      ...PUBLIC_PAGE_REGISTRY
        .map((page) => page.routePattern)
        .filter((route) => route !== '/_site-shell'),
      ...PUBLIC_PAGE_REGISTRY_ALIAS_ROUTE_PATTERNS,
    ].sort();

    expect(registered).toEqual(actual);
    expect(new Set(registered).size).toBe(registered.length);
  });

  test('모든 화면은 고객 위치·바꿀 내용·실제 관리자 버튼을 가진다', () => {
    for (const page of PUBLIC_PAGE_REGISTRY) {
      expect(page.title.length, page.key).toBeGreaterThan(1);
      expect(page.previewRoute.startsWith('/'), page.key).toBe(true);
      expect(page.editableAreas.length, page.key).toBeGreaterThan(0);
      expect(page.actions.length, page.key).toBeGreaterThan(0);
      for (const action of page.actions) {
        expect(action.adminRoute.startsWith('/admin/'), `${page.key}: ${action.label}`).toBe(true);
        expect(action.description.length, `${page.key}: ${action.label}`).toBeGreaterThan(5);
        expect(action.capabilities.length, `${page.key}: ${action.label}`).toBeGreaterThan(0);
      }
    }
  });

  test('연결 기준표의 모든 관리자 버튼은 실제 관리 화면으로 열린다', () => {
    const actionRoutes = new Set(PUBLIC_PAGE_REGISTRY.flatMap((page) => page.actions.map((action) => action.adminRoute)));
    for (const route of actionRoutes) {
      const segments = route.replace(/^\//, '').split('/');
      const directPage = path.join(appRoot, ...segments, 'page.tsx');
      const dynamicPage = path.join(appRoot, ...segments.slice(0, -1), '[pageKey]', 'page.tsx');
      expect(
        fs.existsSync(directPage) || fs.existsSync(dynamicPage),
        `${route}: 연결된 실제 관리자 화면 없음`,
      ).toBe(true);
    }
  });

  test('고객에게 보이는 목록·상세 데이터는 등록·수정·삭제 관리가 연결돼 있다', () => {
    const contentLists = PUBLIC_PAGE_REGISTRY.filter(
      (page) => page.screenType === '목록 화면' || page.screenType === '상세 화면',
    );
    for (const page of contentLists) {
      const capabilities = new Set(page.actions.flatMap((action) => action.capabilities));
      expect(capabilities.has('등록'), `${page.title}: 등록 없음`).toBe(true);
      expect(capabilities.has('수정'), `${page.title}: 수정 없음`).toBe(true);
      expect(capabilities.has('삭제'), `${page.title}: 삭제 없음`).toBe(true);
    }
  });

  test('게시형 관리 버튼은 실제 CMS 정의와 1:1로 연결된다', () => {
    const cmsKeys = new Set(CMS_PAGE_DEFINITIONS.map((page) => page.key));
    const linkedKeys = PUBLIC_PAGE_REGISTRY
      .flatMap((page) => page.actions)
      .flatMap((action) => action.cmsPageKey ? [action.cmsPageKey] : []);

    for (const key of linkedKeys) expect(cmsKeys.has(key), key).toBe(true);
    expect(new Set(linkedKeys).size).toBe(linkedKeys.length);

    const nonInsuranceCmsKeys = CMS_PAGE_DEFINITIONS
      .map((page) => page.key)
      .filter((key) => key !== 'insurance-landing')
      .sort();
    expect([...linkedKeys].sort()).toEqual(nonInsuranceCmsKeys);
  });

  test('가짜·중복 관리자 화면은 연결 기준표와 실제 페이지에서 제거됐다', () => {
    const removedRoutes = ['/admin/survey-results', '/admin/partners', '/admin/qna'];
    const actionRoutes = PUBLIC_PAGE_REGISTRY.flatMap((page) => page.actions.map((action) => action.adminRoute));
    for (const route of removedRoutes) {
      expect(actionRoutes).not.toContain(route);
      expect(fs.existsSync(path.join(appRoot, route.replace(/^\//, ''), 'page.tsx')), route).toBe(false);
    }
  });
});
