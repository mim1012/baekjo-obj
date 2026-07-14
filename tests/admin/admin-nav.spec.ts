import { test, expect } from '@playwright/test';
import {
  ADMIN_MAIN_NAV,
  ADMIN_CS_NAV,
  ADMIN_ETC_NAV,
  ADMIN_BREADCRUMB_ONLY,
  resolveActiveHref,
} from '@/components/admin-new/layout/adminNav';

// adminNav.ts(SSOT) 회귀 스펙 — 순수 데이터/함수, 브라우저·DB 불필요.
// 배경: 사이드바 메뉴가 실제로 유실된 적이 있는 프로젝트. SSOT화는 확률을 줄일 뿐 재발을
// 잡지는 못하므로, 메뉴 목록·아이콘·브레드크럼 커버리지·활성 href 판정을 여기서 고정한다.

test.describe('메뉴 스냅샷', () => {
  // 메뉴를 의도적으로 바꿨다면 이 기대값도 같이 고쳐라 — 그 순간이 유실을 자각하는 지점이다.
  const EXPECTED_HREFS = [
    // main (7)
    '/admin',
    '/admin/products',
    '/admin/products/display',
    '/admin/categories',
    '/admin/brands',
    '/admin/orders',
    '/admin/members',
    // cs (6)
    '/admin/insurance',
    '/admin/survey',
    '/admin/survey-results',
    '/admin/qna',
    '/admin/inquiries',
    '/admin/reviews',
    // etc (5)
    '/admin/concerns',
    '/admin/partners',
    '/admin/kits',
    '/admin/notices',
    '/admin/settings',
  ];

  test('전체 사이드바 href 목록이 18개이고 순서까지 일치한다', () => {
    const all = [...ADMIN_MAIN_NAV, ...ADMIN_CS_NAV, ...ADMIN_ETC_NAV];
    expect(all).toHaveLength(18);
    expect(all.map((i) => i.href)).toEqual(EXPECTED_HREFS);
  });

  test('그룹별 개수 — main=7, cs=6, etc=5', () => {
    expect(ADMIN_MAIN_NAV).toHaveLength(7);
    expect(ADMIN_CS_NAV).toHaveLength(6);
    expect(ADMIN_ETC_NAV).toHaveLength(5);
  });

  test('사이드바 3배열의 모든 항목에 icon이 존재한다', () => {
    const all = [...ADMIN_MAIN_NAV, ...ADMIN_CS_NAV, ...ADMIN_ETC_NAV];
    for (const item of all) {
      expect(item.icon, `${item.href} icon`).toBeDefined();
    }
  });

  test('브레드크럼 매핑이 사이드바 전체 href를 빠짐없이 커버한다', () => {
    const all = [...ADMIN_MAIN_NAV, ...ADMIN_CS_NAV, ...ADMIN_ETC_NAV, ...ADMIN_BREADCRUMB_ONLY];
    const routeNames: Record<string, string> = Object.fromEntries(
      all.map((item) => [item.href, item.name]),
    );

    for (const item of [...ADMIN_MAIN_NAV, ...ADMIN_CS_NAV, ...ADMIN_ETC_NAV]) {
      expect(routeNames[item.href], item.href).toBeDefined();
    }
    expect(routeNames['/admin/products/new']).toBeDefined();
  });

  test('href 중복이 없다', () => {
    const all = [...ADMIN_MAIN_NAV, ...ADMIN_CS_NAV, ...ADMIN_ETC_NAV, ...ADMIN_BREADCRUMB_ONLY];
    const hrefs = all.map((i) => i.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

test.describe('resolveActiveHref', () => {
  const allNavItems = [...ADMIN_MAIN_NAV, ...ADMIN_CS_NAV, ...ADMIN_ETC_NAV];

  const cases: Array<[string, string | undefined]> = [
    ['/admin', '/admin'],
    ['/admin/products', '/admin/products'],
    ['/admin/products/display', '/admin/products/display'],
    ['/admin/products/p1', '/admin/products'],
    ['/admin/products/new', '/admin/products'],
    ['/admin/orders/xyz', '/admin/orders'],
    ['/admin/survey-results', '/admin/survey-results'],
    ['/admin/survey', '/admin/survey'],
    ['/admin/zzz', undefined],
  ];

  for (const [pathname, expected] of cases) {
    test(`${pathname} → ${expected}`, () => {
      expect(resolveActiveHref(pathname, allNavItems)).toBe(expected);
    });
  }
});
