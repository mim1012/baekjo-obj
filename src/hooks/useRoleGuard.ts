import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getCurrentUser } from '@/lib/storage';
import { isPathAllowedForRole } from '@/lib/mypage-permissions';
import { useMounted } from '@/lib/useMounted';

export function useRoleGuard() {
  const mounted = useMounted();
  const router = useRouter();
  const pathname = usePathname();
  
  const user = mounted ? getCurrentUser() : null;
  const isAllowed = mounted && user?.role ? isPathAllowedForRole(user.role, pathname) : false;

  useEffect(() => {
    if (!mounted) return;
    if (!user) {
      router.replace('/login');
      return;
    }

    if (!user.role) {
      router.replace('/');
      return;
    }

    if (!isAllowed) {
      if (user.role === 'admin' && pathname !== '/mypage/profile' && pathname !== '/mypage/password') {
        router.replace('/admin');
      } else {
        router.replace('/mypage');
      }
    }
  }, [mounted, user, pathname, router, isAllowed]);

  return { isAllowed, mounted, user };
}
