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
        // 실패 시 로그인 화면이 이유를 안내할 수 있도록 error 파라미터를 붙인다.
        router.replace(user ? '/' : '/login?error=social');
      })
      .catch(() => {
        router.replace('/login?error=social');
      });
  }, [router]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#F9F8F3]">
      <p role="status" className="text-sm text-[#747B75]">소셜 로그인 처리 중…</p>
    </div>
  );
}
