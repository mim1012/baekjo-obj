'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { completeSocialLogin } from '@/lib/socialAuth';

export default function AuthCompletePage() {
  const router = useRouter();
  const handledRef = useRef(false);

  useEffect(() => {
    // React StrictMode 이중 실행 방지 (등록 중복/레이스 차단)
    if (handledRef.current) return;
    handledRef.current = true;

    completeSocialLogin()
      .then((user) => {
        router.replace(user ? '/' : '/login');
      })
      .catch(() => {
        router.replace('/login');
      });
  }, [router]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#F9F8F3]">
      <p className="text-sm text-[#747B75]">소셜 로그인 처리 중…</p>
    </div>
  );
}
