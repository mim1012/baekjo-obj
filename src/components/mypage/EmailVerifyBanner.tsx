'use client';

import { useState } from 'react';
import { Mail } from 'lucide-react';
import { requestEmailVerification } from '@/lib/storage';

const ERROR_MESSAGES: Record<string, string> = {
  'no-session': '로그인 정보를 확인할 수 없어요. 새로고침 후 다시 시도해 주세요.',
  network: '잠시 후 다시 시도해 주세요.',
};

/**
 * 이메일 미인증 회원용 배너. 렌더 여부는 mypage/page.tsx가 판단하고, 이 컴포넌트는
 * 판단 없이 그리기만 한다(무props) — currentUser 재조회로 인한 상태 불일치를 피한다.
 */
export default function EmailVerifyBanner() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSend = async () => {
    setError('');
    setMessage('');
    setPending(true);
    const result = await requestEmailVerification();
    setPending(false);

    if (result.error) {
      setError(ERROR_MESSAGES[result.error] ?? ERROR_MESSAGES.network);
      return;
    }
    setMessage(result.already ? '이미 인증된 계정이에요.' : '인증 메일을 보냈어요. 메일함을 확인해 주세요.');
  };

  return (
    <div className="flex flex-col gap-3 border border-[#E4DED6] bg-[#F4F2EC] p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Mail className="mt-0.5 size-5 shrink-0 text-[#A65348]" />
        <div>
          <p className="text-sm font-semibold text-[#A65348]">이메일 인증을 완료해 주세요</p>
          {message && <p role="status" className="mt-1 text-xs text-[#2F3B34]">{message}</p>}
          {error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
      </div>
      <button
        type="button"
        onClick={handleSend}
        disabled={pending}
        className="shrink-0 whitespace-nowrap bg-[#2F3B34] px-5 py-2.5 text-xs font-semibold text-white transition-colors duration-150 hover:bg-[#3C4941] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? '전송 중…' : '인증 메일 보내기'}
      </button>
    </div>
  );
}
