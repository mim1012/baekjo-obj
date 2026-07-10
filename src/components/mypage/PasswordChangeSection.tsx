'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';
import { changePassword } from '@/lib/storage';

const ERROR_MESSAGES: Record<string, string> = {
  'invalid-current': '현재 비밀번호가 올바르지 않습니다.',
  'invalid-input': '새 비밀번호는 6자 이상, 72바이트 이하로 입력해 주세요.',
  'social-account': '간편 로그인 계정은 비밀번호가 없어요.',
  network: '잠시 후 다시 시도해 주세요.',
};

/** 이메일/비밀번호 회원 전용 비밀번호 변경 폼. 소셜 연결 계정에서는 렌더하지 않는다(호출부에서 분기). */
export default function PasswordChangeSection() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError('새 비밀번호가 서로 일치하지 않습니다.');
      return;
    }

    setPending(true);
    const result = await changePassword(currentPassword, newPassword);
    setPending(false);

    if (result.error) {
      setError(ERROR_MESSAGES[result.error] ?? ERROR_MESSAGES.network);
      return;
    }

    setSuccess(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <section id="password" className="border border-gray-100 bg-white p-8 shadow-sm">
      <h2 className="flex items-center text-lg font-bold text-[#202521]">
        <Lock className="mr-2 size-5 text-[#2F3B34]" /> 비밀번호 변경
      </h2>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {error && (
          <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-600">
            {error}
          </div>
        )}
        {success && (
          <div role="status" className="rounded-md border border-[#D7DED7] bg-[#EEF2EC] p-3 text-xs font-medium text-[#2F3B34]">
            비밀번호가 변경되었습니다.
          </div>
        )}

        <label className="block">
          <span className="mb-2 block text-xs text-gray-500">현재 비밀번호</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className="mt-0 w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#2F3B34]"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs text-gray-500">새 비밀번호</span>
          <input
            type="password"
            autoComplete="new-password"
            required
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="mt-0 w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#2F3B34]"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs text-gray-500">새 비밀번호 확인</span>
          <input
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="mt-0 w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#2F3B34]"
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="mt-5 min-h-11 bg-[#2F3B34] px-5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#3C4941] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? '변경 중…' : '비밀번호 변경'}
        </button>
      </form>
    </section>
  );
}
