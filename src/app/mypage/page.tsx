'use client';

import { getCurrentUser } from '@/lib/storage';
import { useMounted } from '@/lib/useMounted';
import GeneralHome from '@/components/mypage/home/GeneralHome';
import PartnerHome from '@/components/mypage/home/PartnerHome';
import InsuranceHome from '@/components/mypage/home/InsuranceHome';
import B2BHome from '@/components/mypage/home/B2BHome';

export default function MyPageHome() {
  const mounted = useMounted();
  if (!mounted) return null;
  const user = getCurrentUser();
  if (!user) return null;

  switch (user.role) {
    case 'partner':
      return <PartnerHome />;
    case 'insurance':
      return <InsuranceHome />;
    case 'b2b':
      return <B2BHome />;
    case 'user':
    default:
      return <GeneralHome />;
  }
}
