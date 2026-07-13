import { Package, Heart, MessageCircle, Star, Settings, Lock, Briefcase, FileSignature, FileKey, Receipt, Building2, LucideIcon, FileText, HelpCircle } from 'lucide-react';
import type { User as UserType } from '@/types';

type Role = NonNullable<UserType['role']>;

export interface MenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const mypageMenuByRole: Record<Role, MenuItem[]> = {
  user: [
    { href: '/mypage/orders', label: '주문·배송 내역', icon: Package },
    { href: '/mypage/wishlist', label: '관심 상품', icon: Heart },
    { href: '/mypage/pets', label: '반려동물 관리', icon: Heart }, 
    { href: '/mypage/care', label: '맞춤 케어', icon: Briefcase }, 
    { href: '/mypage/insurance', label: '보험 분석 내역', icon: FileText },
    { href: '/mypage/reviews', label: '구매평 관리', icon: Star },
    { href: '/mypage/qna', label: '상품문의 관리', icon: MessageCircle },
    { href: '/mypage/profile', label: '회원정보 수정', icon: Settings },
    { href: '/mypage/password', label: '비밀번호 변경', icon: Lock },
  ],
  partner: [
    { href: '/mypage/application', label: '입점 신청 현황', icon: FileSignature },
    { href: '/mypage/documents', label: '제출 서류', icon: FileKey },
    { href: '/mypage/inquiries', label: '문의 내역', icon: HelpCircle },
    { href: '/mypage/profile', label: '담당자 정보 수정', icon: Settings },
    { href: '/mypage/password', label: '비밀번호 변경', icon: Lock },
  ],
  insurance: [
    { href: '/mypage/application', label: '제휴 신청 현황', icon: FileSignature },
    { href: '/mypage/documents', label: '제출 서류', icon: FileKey },
    { href: '/mypage/inquiries', label: '제휴 문의 내역', icon: HelpCircle },
    { href: '/mypage/profile', label: '담당자 정보 수정', icon: Settings },
    { href: '/mypage/password', label: '비밀번호 변경', icon: Lock },
  ],
  b2b: [
    { href: '/mypage/application', label: '사업자 인증 현황', icon: Building2 },
    { href: '/mypage/requests', label: '견적·주문 요청', icon: Receipt },
    { href: '/mypage/inquiries', label: '문의 내역', icon: HelpCircle },
    { href: '/mypage/documents', label: '제출 서류', icon: FileKey },
    { href: '/mypage/profile', label: '담당자 정보 수정', icon: Settings },
    { href: '/mypage/password', label: '비밀번호 변경', icon: Lock },
  ],
  admin: [
    // 관리자는 마이페이지를 이용하지 않고 /admin으로 이동해야 하지만,
    // /mypage 접근 시 프로필과 비밀번호 변경 정도만 표시하거나 /admin으로 리다이렉트합니다.
    { href: '/mypage/profile', label: '개인정보 수정', icon: Settings },
    { href: '/mypage/password', label: '비밀번호 변경', icon: Lock },
  ],
};

export const roleAllowedPaths: Record<Role, string[]> = {
  user: [
    '/mypage',
    '/mypage/orders',
    '/mypage/wishlist',
    '/mypage/pets',
    '/mypage/care',
    '/mypage/insurance',
    '/mypage/reviews',
    '/mypage/qna',
    '/mypage/profile',
    '/mypage/password',
  ],
  partner: [
    '/mypage',
    '/mypage/application',
    '/mypage/documents',
    '/mypage/inquiries',
    '/mypage/profile',
    '/mypage/password',
  ],
  insurance: [
    '/mypage',
    '/mypage/application',
    '/mypage/documents',
    '/mypage/inquiries',
    '/mypage/profile',
    '/mypage/password',
  ],
  b2b: [
    '/mypage',
    '/mypage/application',
    '/mypage/requests',
    '/mypage/inquiries',
    '/mypage/documents',
    '/mypage/profile',
    '/mypage/password',
  ],
  admin: [
    '/mypage',
    '/mypage/profile',
    '/mypage/password',
  ],
};

/** 권한 체크 함수. 해당 역할이 주어진 경로에 접근 가능한지 반환합니다. */
export function isPathAllowedForRole(role: Role, pathname: string): boolean {
  const allowed = roleAllowedPaths[role] || [];
  return allowed.includes(pathname);
}
