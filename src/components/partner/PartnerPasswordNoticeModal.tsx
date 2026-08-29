'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const DISMISS_KEY = 'baekjo_pw_notice_dismissed';

/**
 * 파트너가 운영자 발급 초기 비밀번호로 로그인했을 때(user.mustChangePassword) 변경을 유도하는
 * 안내 모달. 강제는 아니라 "나중에 변경하기"를 누르면 같은 브라우저 세션 동안 다시 뜨지 않는다
 * (sessionStorage — 로그아웃/탭 종료 후에는 다시 확인).
 */
export default function PartnerPasswordNoticeModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.sessionStorage.getItem(DISMISS_KEY) === '1') {
      return;
    }
    let cancelled = false;
    void fetch('/api/members/me')
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('no-session'))))
      .then((payload: { user?: { mustChangePassword?: boolean } }) => {
        if (!cancelled && payload.user?.mustChangePassword === true) {
          setOpen(true);
        }
      })
      .catch(() => {
        // 비로그인/조회 실패는 조용히 무시 — 안내 모달은 부가 기능이라 로그인 플로우를 막지 않는다.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!open) return null;

  const handleDismiss = () => {
    window.sessionStorage.setItem(DISMISS_KEY, '1');
    setOpen(false);
  };

  const handleChangeNow = () => {
    window.sessionStorage.setItem(DISMISS_KEY, '1');
    setOpen(false);
    router.push('/mypage#password');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="partner-password-notice-title"
        className="w-full max-w-sm border border-gray-100 bg-white p-8 shadow-sm"
      >
        <h2 id="partner-password-notice-title" className="text-lg font-bold text-[#202521]">
          비밀번호를 변경해 주세요
        </h2>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          초기 비밀번호로 로그인하셨습니다. 안전한 이용을 위해 비밀번호를 변경해 주세요.
        </p>
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={handleChangeNow}
            className="bg-[#2F3B34] px-5 py-3 text-sm font-semibold text-white hover:bg-[#3C4941]"
          >
            비밀번호 변경하기
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="border border-gray-200 px-5 py-3 text-sm text-gray-600 hover:bg-gray-50"
          >
            나중에 변경하기
          </button>
        </div>
      </div>
    </div>
  );
}
