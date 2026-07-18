import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
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
    // cs (7)
    '/admin/insurance',
    '/admin/survey',
    '/admin/survey-results',
    '/admin/qna',
    '/admin/inquiries',
    '/admin/reviews',
    '/admin/insurance-content',
    // etc (7)
    '/admin/concerns',
    '/admin/partners',
    '/admin/kits',
    '/admin/partner-inquiries',
    '/admin/notices',
    '/admin/order-policy',
    '/admin/settings',
  ];

  test('전체 사이드바 href 목록이 21개이고 순서까지 일치한다', () => {
    const all = [...ADMIN_MAIN_NAV, ...ADMIN_CS_NAV, ...ADMIN_ETC_NAV];
    expect(all).toHaveLength(21);
    expect(all.map((i) => i.href)).toEqual(EXPECTED_HREFS);
  });

  test('그룹별 개수 — main=7, cs=7, etc=7', () => {
    expect(ADMIN_MAIN_NAV).toHaveLength(7);
    expect(ADMIN_CS_NAV).toHaveLength(7);
    expect(ADMIN_ETC_NAV).toHaveLength(7);
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

test.describe('관리자 브랜드 로고 홈 링크', () => {
  test('데스크톱/모바일 로고는 관리자 대시보드가 아니라 공개 홈으로 이동한다', () => {
    const sidebar = fs.readFileSync(
      path.resolve(__dirname, '..', '..', 'src', 'components', 'admin-new', 'layout', 'AdminSidebar.tsx'),
      'utf8',
    );
    const mobile = fs.readFileSync(
      path.resolve(__dirname, '..', '..', 'src', 'components', 'admin-new', 'layout', 'AdminMobileNav.tsx'),
      'utf8',
    );

    expect(sidebar).toContain('href="/" className="font-bold text-[18px] text-[#17201B] truncate"');
    expect(sidebar).toContain('href="/" className="mx-auto font-bold text-[18px] text-[#17201B]"');
    expect(mobile).toContain('href="/" className="font-bold text-[18px] text-[#17201B]" onClick={onClose}');
    expect(sidebar).not.toContain('href="/admin" className="font-bold text-[18px] text-[#17201B] truncate"');
    expect(mobile).not.toContain('href="/admin" className="font-bold text-[18px] text-[#17201B]" onClick={onClose}');
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
    // trailingSlash 방어: next.config.ts에서 trailingSlash:true로 바뀌면 pathname이
    // '/admin/'처럼 들어온다 — 정규화 없이는 대시보드 항목만 조용히 영영 비활성화된다.
    ['/admin/', '/admin'],
  ];

  for (const [pathname, expected] of cases) {
    test(`${pathname} → ${expected}`, () => {
      expect(resolveActiveHref(pathname, allNavItems)).toBe(expected);
    });
  }
});

test.describe('고아 라우트 가드', () => {
  // 2026-07-14 메뉴 4종 유실 사고 + /admin/products/display 고아 라우트(페이지는 있는데
  // 사이드바에 없어 클릭으로 도달 불가능했던 상태, 이번 PR에서 수동 발견해 고쳤다).
  // EXPECTED_HREFS 하드코딩 스냅샷은 "메뉴와 기대값을 함께 지우면 초록불"이라 이 유실 패턴을
  // 못 잡는다. 여기서는 파일시스템(src/app/admin/**/page.tsx)에서 실제 정적 라우트를 도출해
  // "파일이 존재한다"가 아니라 "메뉴에서 도달 가능하다"를 판정한다.
  const ADMIN_APP_ROOT = path.resolve(__dirname, '..', '..', 'src', 'app', 'admin');

  function collectPageFiles(dir: string): string[] {
    const out: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        out.push(...collectPageFiles(full));
      } else if (entry.name === 'page.tsx') {
        out.push(full);
      }
    }
    return out;
  }

  function toRoute(pageFile: string): string {
    const rel = path.relative(ADMIN_APP_ROOT, path.dirname(pageFile)).split(path.sep).join('/');
    return rel === '' ? '/admin' : `/admin/${rel}`;
  }

  test('src/app/admin의 모든 정적 라우트가 메뉴(사이드바 3배열)에서 도달 가능하다', () => {
    const pageFiles = collectPageFiles(ADMIN_APP_ROOT);
    expect(pageFiles.length).toBeGreaterThan(0); // 스캔 경로가 비면 가드가 무력해진다 — 먼저 잡는다.

    const staticRoutes = pageFiles.map(toRoute).filter((route) => !route.includes('['));

    const reachable = new Set(
      [...ADMIN_MAIN_NAV, ...ADMIN_CS_NAV, ...ADMIN_ETC_NAV, ...ADMIN_BREADCRUMB_ONLY].map(
        (i) => i.href,
      ),
    );

    const orphans = staticRoutes.filter((route) => !reachable.has(route));

    expect(
      orphans,
      orphans.length > 0
        ? `고아 라우트: 페이지는 있는데 메뉴에서 도달할 수 없다\n` +
            orphans.map((r) => ` - ${r}`).join('\n')
        : undefined,
    ).toEqual([]);
  });
});
