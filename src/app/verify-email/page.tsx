'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import BrandMark from '@/components/common/BrandMark';
import { confirmEmailVerification, getCurrentUser } from '@/lib/storage';
import { useMounted } from '@/lib/useMounted';

type ConfirmResult = 'success' | 'error' | null;

export default function VerifyEmailPage() {
  const mounted = useMounted();
  const handledRef = useRef(false);
  // null = 아직 서버 응답을 못 받음(호출 준비/진행 중). 실제 성공/실패만 여기서 갱신한다.
  const [confirmResult, setConfirmResult] = useState<ConfirmResult>(null);

  // login/reset-password 페이지와 동일 패턴: 마운트 후에만 URL·세션에서 파생 — SSR과
  // 초기 클라이언트 렌더가 항상 일치해 hydration 불일치가 없다.
  const token = mounted ? new URLSearchParams(window.location.search).get('token') : null;
  const isLoggedIn = mounted ? getCurrentUser() !== null : false;

  useEffect(() => {
    if (!mounted || !token) return;
    // React StrictMode 이중 실행 방지 (토큰 중복 소비 차단) — auth/complete 페이지와 동일 패턴
    if (handledRef.current) return;
    handledRef.current = true;

    confirmEmailVerification(token)
      .then((result) => setConfirmResult(result.ok ? 'success' : 'error'))
      .catch(() => setConfirmResult('error'));
  }, [mounted, token]);

  if (!mounted || (token && confirmResult === null)) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F9F8F3]">
        <p role="status" className="text-sm text-[#747B75]">이메일 인증 처리 중…</p>
      </div>
    );
  }

  const isSuccess = confirmResult === 'success';

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#E9E7E0] px-5 py-20">
      <div className="w-full max-w-md border border-[#D1D0C8] bg-[#FAF9F5] p-7 text-center shadow-sm sm:p-10">
        <BrandMark />
        {isSuccess ? (
          <>
            <div role="status" className="mt-8 border border-[#D7DED7] bg-[#EEF2EC] p-4 text-sm text-[#2F3B34]">
              이메일 인증이 완료되었습니다.
            </div>
            <div className="mt-6 flex items-center justify-center gap-4 text-sm">
              <Link href="/" className="bg-[#2F3B34] px-5 py-3 font-semibold text-white hover:bg-[#3C4941]">
                홈으로
              </Link>
              <Link href="/mypage" className="text-[#5F6761] hover:text-[#2F3B34]">마이페이지</Link>
            </div>
          </>
        ) : (
          <>
            <div role="alert" className="mt-8 border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              링크가 만료됐거나 올바르지 않아요.
            </div>
            {isLoggedIn && (
              <p className="mt-4 text-xs text-[#8D938E]">
                마이페이지에서 인증 메일을 다시 보낼 수 있어요.
              </p>
            )}
            {isLoggedIn && (
              <Link
                href="/mypage"
                className="mt-6 inline-block bg-[#2F3B34] px-5 py-3 text-sm font-semibold text-white hover:bg-[#3C4941]"
              >
                마이페이지로
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}
