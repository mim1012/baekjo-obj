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
  MessageCircle,
  Star,
  HeartPulse,
  Gift,
  Inbox,
  Bell,
  Settings,
  FileText,
  Timer,
  PanelsTopLeft,
  Tags,
  BookOpenCheck,
} from 'lucide-react';

/** 브레드크럼 제목 매핑에 쓰이는 공통 형태(아이콘 불필요). */
export interface AdminNavItem {
  name: string;
  href: string;
}

/** 사이드바·모바일 내비에 렌더되는 항목 — 아이콘이 반드시 있어야 한다. */
export interface AdminSidebarItem extends AdminNavItem {
  icon: LucideIcon;
  /** 첫 직원이 메뉴 이름만 보고도 관리 범위를 알 수 있도록 메뉴 아래에 표시한다. */
  description: string;
}

export const ADMIN_MAIN_NAV: AdminSidebarItem[] = [
  { name: '대시보드', href: '/admin', icon: LayoutDashboard, description: '오늘 확인할 운영 현황' },
  { name: '전체 화면 관리', href: '/admin/pages', icon: PanelsTopLeft, description: '고객 화면에서 관리 위치 찾기' },
  { name: '사용 안내', href: '/admin/guide', icon: BookOpenCheck, description: '처음 일할 때 보는 업무 설명서' },
];

/** 고객 홈페이지에서 실제로 보이는 내용을 만드는 메뉴. */
export const ADMIN_SITE_NAV: AdminSidebarItem[] = [
  { name: '홈 화면', href: '/admin/settings', icon: Settings, description: '홈 배너·바로가기·문구' },
  { name: '상품 관리', href: '/admin/products', icon: Package, description: '상품 정보·가격·재고·상세' },
  { name: '상품 태그', href: '/admin/products/tags', icon: Tags, description: '상품 카드 배지·스토어 고민 필터' },
  { name: '상품 진열', href: '/admin/products/display', icon: LayoutGrid, description: '베스트·추천·스토어 노출' },
  { name: '상품 카테고리', href: '/admin/categories', icon: FolderTree, description: '스토어 상품 분류·필터' },
  { name: '브랜드', href: '/admin/brands', icon: Tag, description: '브랜드관 카드·상세 내용' },
  { name: '고민·케어 가이드', href: '/admin/concerns', icon: HeartPulse, description: '고민별 안내 글·연결 상품' },
  { name: '맞춤 진단', href: '/admin/survey', icon: Stethoscope, description: '진단 질문·답변·결과 연결' },
  { name: '후기', href: '/admin/reviews', icon: Star, description: '후기 노출·내용·사진' },
  { name: '공지사항', href: '/admin/notices', icon: Bell, description: '공지 목록·상세 글' },
  { name: '케어키트 카드', href: '/admin/kits', icon: Gift, description: '제휴 화면의 케어키트 소개' },
];

/** 고객 행동으로 생긴 실제 주문·회원·문의 데이터를 처리하는 메뉴. */
export const ADMIN_OPERATIONS_NAV: AdminSidebarItem[] = [
  { name: '주문·배송', href: '/admin/orders', icon: ShoppingCart, description: '주문 상태·송장·취소 처리' },
  { name: '회원·승인', href: '/admin/members', icon: Users, description: '회원 상태·입점업체 승인' },
  { name: '상품 문의 답변', href: '/admin/inquiries', icon: MessageCircle, description: '고객 상품 질문에 답변' },
  { name: '제휴 문의 접수', href: '/admin/partner-inquiries', icon: Inbox, description: '고객이 남긴 제휴 신청 확인' },
  { name: '무통장 자동취소', href: '/admin/order-policy', icon: Timer, description: '입금대기 자동취소 사용 여부·시간' },
];

/** 보험 기능은 사용자 요청에 따라 이번 전체 화면 개편과 섞지 않고 별도 유지한다. */
export const ADMIN_INSURANCE_NAV: AdminSidebarItem[] = [
  { name: '보험 상담', href: '/admin/insurance', icon: HeartHandshake, description: '보험 상담 신청 처리' },
  { name: '보험 콘텐츠', href: '/admin/insurance-content', icon: FileText, description: '보험 동의문·질문과 답변' },
];

// 사이드바에는 노출되지 않지만 브레드크럼 제목 매핑에는 필요한 항목
export const ADMIN_BREADCRUMB_ONLY: AdminNavItem[] = [
  { name: '상품 등록', href: '/admin/products/new' },
];

/** 사이드바·모바일내비가 공유하는 전체 목록(SSOT) — 각자 렌더마다 재생성하지 않도록 여기서 한 번만 만든다. */
export const ADMIN_ALL_NAV: AdminSidebarItem[] = [
  ...ADMIN_MAIN_NAV,
  ...ADMIN_SITE_NAV,
  ...ADMIN_OPERATIONS_NAV,
  ...ADMIN_INSURANCE_NAV,
];

/**
 * 여러 후보 href 중 pathname과 가장 길게(구체적으로) 일치하는 href를 고른다.
 * `startsWith`만 쓰면 ①형제 경로(`/admin/products` vs `/admin/products/display`)가
 * 동시에 활성화되거나 ②정확 매칭만 쓰면 `/admin/products/[id]` 같은 하위 라우트에서
 * 부모 메뉴가 전부 비활성화되는 문제가 생긴다. longest-prefix가 둘 다 해결한다.
 */
export function resolveActiveHref(
  pathname: string,
  items: readonly AdminNavItem[],
): string | undefined {
  // next.config.ts의 trailingSlash가 true로 바뀌면 pathname이 '/admin/'처럼 들어와
  // '/admin' 항목만 정확매칭에 실패해 조용히 영영 비활성화된다 — 진입부에서 정규화해 방어한다.
  const p = pathname.replace(/\/+$/, '') || '/';
  return items
    .map((i) => i.href)
    .filter((h) => (h === '/admin' ? p === '/admin' : p === h || p.startsWith(h + '/')))
    .sort((a, b) => b.length - a.length)[0];
}
