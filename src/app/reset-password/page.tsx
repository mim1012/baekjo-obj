'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import BrandMark from '@/components/common/BrandMark';
import { confirmPasswordReset } from '@/lib/storage';
import { useMounted } from '@/lib/useMounted';

const ERROR_MESSAGES: Record<string, string> = {
  'invalid-token': '링크가 만료됐거나 이미 사용됐어요.',
  'invalid-input': '새 비밀번호는 6자 이상, 72바이트 이하로 입력해 주세요.',
  network: '잠시 후 다시 시도해 주세요.',
};

export default function ResetPasswordPage() {
  const router = useRouter();
  const mounted = useMounted();
  // login 페이지와 동일하게 마운트 후에만 URL에서 파생 — hydration 불일치를 피한다.
  const token = mounted ? new URLSearchParams(window.location.search).get('token') : null;

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [success, setSuccess] = useState(false);

  if (!mounted) return null;

  if (!token) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#E9E7E0] px-5 py-20">
        <div className="w-full max-w-md border border-[#D1D0C8] bg-[#FAF9F5] p-7 text-center shadow-sm sm:p-10">
          <BrandMark />
          <p className="mt-8 text-sm text-[#747B75]">링크가 올바르지 않아요.</p>
          <Link
            href="/forgot-password"
            className="mt-6 inline-block bg-[#2F3B34] px-5 py-3 text-sm font-semibold text-white hover:bg-[#3C4941]"
          >
            재설정 링크 다시 받기
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setErrorCode('');

    if (newPassword !== confirmPassword) {
      setError('새 비밀번호가 서로 일치하지 않습니다.');
      return;
    }

    setPending(true);
    const result = await confirmPasswordReset(token, newPassword);
    setPending(false);

    if (result.error) {
      setError(ERROR_MESSAGES[result.error] ?? ERROR_MESSAGES.network);
      setErrorCode(result.error);
      return;
    }
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#E9E7E0] px-5 py-20">
        <div className="w-full max-w-md border border-[#D1D0C8] bg-[#FAF9F5] p-7 text-center shadow-sm sm:p-10">
          <BrandMark />
          <div role="status" className="mt-8 border border-[#D7DED7] bg-[#EEF2EC] p-4 text-sm text-[#2F3B34]">
            비밀번호가 변경되었습니다.
          </div>
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="mt-6 w-full bg-[#2F3B34] py-3.5 text-sm font-semibold text-white hover:bg-[#3C4941]"
          >
            로그인하러 가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#E9E7E0] px-5 py-20">
      <div className="w-full max-w-md border border-[#D1D0C8] bg-[#FAF9F5] p-7 shadow-sm sm:p-10">
        <BrandMark />
        <h1 className="mt-8 text-2xl font-normal text-[#202521]">새 비밀번호 설정</h1>
        <p className="mt-2 text-sm text-[#747B75]">새로 사용할 비밀번호를 입력해 주세요.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {error && (
            <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-600">
              {error}
              {errorCode === 'invalid-token' && (
                <>
                  {' '}
                  <Link href="/forgot-password" className="underline">재요청하기</Link>
                </>
              )}
            </div>
          )}
          <label className="block">
            <span className="mb-2 block text-xs font-medium text-[#5F6761]">새 비밀번호</span>
            <input
              type="password"
              autoComplete="new-password"
              required
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="w-full border border-[#C9C8C0] px-4 py-3.5 text-sm focus:border-[#2F3B34]"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-medium text-[#5F6761]">새 비밀번호 확인</span>
            <input
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full border border-[#C9C8C0] px-4 py-3.5 text-sm focus:border-[#2F3B34]"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="mt-2 w-full bg-[#2F3B34] py-3.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#3C4941] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? '변경 중…' : '비밀번호 변경'}
          </button>
        </form>
      </div>
    </div>
  );
}
