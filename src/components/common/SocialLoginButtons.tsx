'use client';

import { useState } from 'react';
import { isSocialLoginEnabled, loginWithProvider } from '@/lib/socialAuth';

type SocialProvider = 'kakao' | 'naver';

// 카카오/네이버 공식 로그인 버튼 (검수 요건: 지정 배경색 + 심볼 — 간편 로그인 영역에 한해
// 브랜드 컬러 예외. 카카오 #FEE500, 네이버 #03C75A는 각 사 디자인 가이드 지정값)
const DEFAULT_LABELS: Record<SocialProvider, string> = {
  kakao: '카카오 로그인',
  naver: '네이버 로그인',
};

function KakaoSymbol() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill="currentColor" aria-hidden>
      <path d="M12 3C6.48 3 2 6.54 2 10.9c0 2.8 1.86 5.26 4.66 6.66-.15.52-.97 3.36-1 3.58 0 0-.02.17.09.24.11.07.24.02.24.02.32-.04 3.66-2.4 4.24-2.81.57.08 1.16.13 1.77.13 5.52 0 10-3.54 10-7.9S17.52 3 12 3Z" />
    </svg>
  );
}

function NaverSymbol() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5 shrink-0" fill="currentColor" aria-hidden>
      <path d="M16.273 12.845 7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845Z" />
    </svg>
  );
}

export default function SocialLoginButtons({
  labels = DEFAULT_LABELS,
}: {
  labels?: Record<SocialProvider, string>;
}) {
  const [pending, setPending] = useState<SocialProvider | null>(null);
  const [notice, setNotice] = useState('');

  const handleClick = (provider: SocialProvider) => {
    if (pending) return;
    if (!isSocialLoginEnabled()) {
      setNotice('간편 로그인은 아직 준비 중이에요. 조금만 기다려 주세요.');
      return;
    }
    // 제공자 페이지로 넘어가기 전까지 버튼을 잠가 중복 시도(PKCE 꼬임)를 막는다.
    setPending(provider);
    loginWithProvider(provider).catch(() => {
      // 리다이렉트 전에 실패(네트워크 등)하면 잠금을 풀어 재시도할 수 있게 한다.
      setPending(null);
      setNotice('로그인 연결에 실패했어요. 잠시 후 다시 시도해 주세요.');
    });
  };

  return (
    <div>
      {notice && (
        <p role="status" aria-live="polite" className="mb-3 text-center text-xs text-[#A65348]">
          {notice}
        </p>
      )}
      <div className="grid gap-2">
        <button
          type="button"
          onClick={() => handleClick('kakao')}
          disabled={pending !== null}
          className="flex min-h-11 w-full items-center justify-center gap-2 bg-[#FEE500] text-sm font-semibold text-black/85 transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <KakaoSymbol />
          {pending === 'kakao' ? '카카오로 이동 중…' : labels.kakao}
        </button>
        <button
          type="button"
          onClick={() => handleClick('naver')}
          disabled={pending !== null}
          className="flex min-h-11 w-full items-center justify-center gap-2 bg-[#03C75A] text-sm font-semibold text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <NaverSymbol />
          {pending === 'naver' ? '네이버로 이동 중…' : labels.naver}
        </button>
      </div>
    </div>
  );
}
