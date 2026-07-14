import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Package,
  LayoutGrid,
  FolderTree,
  Tag,
  ShoppingCart,
  Users,
  HeartHandshake,
  Stethoscope,
  MessageSquare,
  MessageCircle,
  Star,
  Activity,
  HeartPulse,
  Handshake,
  Gift,
  Bell,
  Settings,
} from 'lucide-react';

export interface AdminNavItem {
  name: string;
  href: string;
  icon?: LucideIcon; // breadcrumb 전용 항목은 아이콘이 없다
  showInSidebar?: boolean; // 기본 true. false면 브레드크럼 제목에만 쓰인다
}

export const ADMIN_MAIN_NAV: AdminNavItem[] = [
  { name: '대시보드', href: '/admin', icon: LayoutDashboard },
  { name: '상품 관리', href: '/admin/products', icon: Package },
  { name: '상품 진열 관리', href: '/admin/products/display', icon: LayoutGrid },
  { name: '카테고리 관리', href: '/admin/categories', icon: FolderTree },
  { name: '브랜드 관리', href: '/admin/brands', icon: Tag },
  { name: '주문 관리', href: '/admin/orders', icon: ShoppingCart },
  { name: '회원 관리', href: '/admin/members', icon: Users },
];

export const ADMIN_CS_NAV: AdminNavItem[] = [
  { name: '보험 상담', href: '/admin/insurance', icon: HeartHandshake },
  { name: '맞춤 진단', href: '/admin/survey', icon: Stethoscope },
  { name: '진단 참여 내역', href: '/admin/survey-results', icon: Activity },
  { name: '문의 관리', href: '/admin/qna', icon: MessageSquare },
  { name: '상품문의 관리', href: '/admin/inquiries', icon: MessageCircle },
  { name: '후기 관리', href: '/admin/reviews', icon: Star },
];

export const ADMIN_ETC_NAV: AdminNavItem[] = [
  { name: '고민 관리', href: '/admin/concerns', icon: HeartPulse },
  { name: '제휴 관리', href: '/admin/partners', icon: Handshake },
  { name: '케어키트 관리', href: '/admin/kits', icon: Gift },
  { name: '공지사항', href: '/admin/notices', icon: Bell },
  { name: '환경 설정', href: '/admin/settings', icon: Settings },
];

// 사이드바에는 노출되지 않지만 브레드크럼 제목 매핑에는 필요한 항목
export const ADMIN_BREADCRUMB_ONLY: AdminNavItem[] = [
  { name: '상품 등록', href: '/admin/products/new', showInSidebar: false },
];

/**
 * 여러 후보 href 중 pathname과 가장 길게(구체적으로) 일치하는 href를 고른다.
 * `startsWith`만 쓰면 ①형제 경로(`/admin/products` vs `/admin/products/display`)가
 * 동시에 활성화되거나 ②정확 매칭만 쓰면 `/admin/products/[id]` 같은 하위 라우트에서
 * 부모 메뉴가 전부 비활성화되는 문제가 생긴다. longest-prefix가 둘 다 해결한다.
 */
export function resolveActiveHref(pathname: string, items: AdminNavItem[]): string | undefined {
  return items
    .map((i) => i.href)
    .filter((h) =>
      h === '/admin' ? pathname === '/admin' : pathname === h || pathname.startsWith(h + '/'),
    )
    .sort((a, b) => b.length - a.length)[0];
}
