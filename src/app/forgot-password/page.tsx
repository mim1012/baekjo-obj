'use client';

import Link from 'next/link';
import { useState } from 'react';
import BrandMark from '@/components/common/BrandMark';
import { requestPasswordReset } from '@/lib/storage';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setPending(true);
    const result = await requestPasswordReset(email);
    setPending(false);

    // 이메일 존재 여부를 노출하지 않기 위해 성공/실패(가입 여부)와 무관하게 항상 같은 안내를 보여준다.
    // network 오류만 별도로 안내한다.
    if (result.error === 'network') {
      setError('잠시 후 다시 시도해 주세요.');
      return;
    }
    setDone(true);
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#E9E7E0] px-5 py-20">
      <div className="w-full max-w-md border border-[#D1D0C8] bg-[#FAF9F5] p-7 shadow-sm sm:p-10">
        <BrandMark />
        <h1 className="mt-8 text-2xl font-normal text-[#202521]">비밀번호를 잊으셨나요?</h1>
        <p className="mt-2 text-sm text-[#747B75]">
          가입하신 이메일 주소를 입력해 주시면 재설정 링크를 보내드릴게요.
        </p>

        {done ? (
          <div role="status" className="mt-8 border border-[#D7DED7] bg-[#EEF2EC] p-4 text-sm text-[#2F3B34]">
            가입된 이메일이라면 재설정 링크를 보내드렸어요. 메일함(스팸함 포함)을 확인해 주세요.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {error && (
              <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-600">
                {error}
              </div>
            )}
            <label className="block">
              <span className="mb-2 block text-xs font-medium text-[#5F6761]">이메일</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                className="w-full border border-[#C9C8C0] px-4 py-3.5 text-sm focus:border-[#2F3B34]"
              />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="mt-2 w-full bg-[#2F3B34] py-3.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#3C4941] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? '전송 중…' : '재설정 링크 보내기'}
            </button>
          </form>
        )}

        <div className="mt-8 border-t border-[#DEDCD5] pt-6 text-center text-xs text-[#777E78]">
          <Link href="/login" className="hover:text-[#2F3B34]">로그인으로 돌아가기</Link>
        </div>
      </div>
    </div>
  );
}
