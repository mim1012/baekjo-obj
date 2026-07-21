'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { User } from '@/types';
import { setCurrentUser, updateMyProfile, withdrawAccount } from '@/lib/storage';

interface ProfileSectionProps {
  user: User | null;
}

const ERROR_MESSAGES: Record<string, string> = {
  'invalid-input': '입력하신 정보를 다시 확인해 주세요.',
  'not-found': '회원 정보를 찾을 수 없습니다. 다시 로그인해 주세요.',
  network: '잠시 후 다시 시도해 주세요.',
};

const WITHDRAW_ERROR_MESSAGES: Record<string, string> = {
  unauthorized: '로그인이 만료되었습니다. 다시 로그인해 주세요.',
  'not-found': '회원 정보를 찾을 수 없습니다.',
  network: '잠시 후 다시 시도해 주세요.',
};

export default function ProfileSection({ user }: ProfileSectionProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    petType: user?.petType || '',
    breed: user?.breed || '',
  });
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');

  if (!user) return null;

  const handleWithdraw = async () => {
    setWithdrawError('');
    setIsWithdrawing(true);
    const result = await withdrawAccount();
    if (result.error) {
      setIsWithdrawing(false);
      setWithdrawError(WITHDRAW_ERROR_MESSAGES[result.error] ?? WITHDRAW_ERROR_MESSAGES.network);
      return;
    }
    // 서버 탈퇴 처리(status='withdrawn')가 끝난 뒤에만 클라이언트 세션을 끊는다 —
    // 순서를 바꾸면 탈퇴가 실패했는데 로그아웃만 되는 상태가 생길 수 있다.
    await signOut({ callbackUrl: '/' });
    router.push('/');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSaving(true);
    const result = await updateMyProfile(formData);
    setIsSaving(false);

    if (result.error) {
      setError(ERROR_MESSAGES[result.error] ?? ERROR_MESSAGES.network);
      return;
    }

    // 서버(DB)가 진실이므로 200 응답을 받은 뒤에만 로컬 캐시를 갱신한다.
    if (result.user) setCurrentUser(result.user);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setIsSaved(false);
  };

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#18231F]">회원정보 수정</h2>
        <p className="mt-2 text-sm text-[#68716C]">고객님의 소중한 정보를 안전하게 관리하세요.</p>
      </div>

      <div className="mypage-card">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#18231F]">이메일 (아이디)</label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full rounded-lg border border-[#DED8CC] bg-gray-50 px-4 py-3 text-sm text-[#68716C] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#18231F]">이름</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-[#DED8CC] px-4 py-3 text-sm focus:border-[#18231F] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#18231F]">휴대폰 번호</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="010-0000-0000"
              className="w-full rounded-lg border border-[#DED8CC] px-4 py-3 text-sm focus:border-[#18231F] focus:outline-none sm:w-1/2"
            />
          </div>

          <div className="grid gap-6 border-t border-[#EBE6DC] pt-6 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#18231F]">반려동물 종류</label>
              <select
                name="petType"
                value={formData.petType}
                onChange={handleChange}
                className="w-full rounded-lg border border-[#DED8CC] px-4 py-3 text-sm focus:border-[#18231F] focus:outline-none bg-white"
              >
                <option value="">선택해주세요</option>
                <option value="dog">강아지</option>
                <option value="cat">고양이</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#18231F]">견종 / 묘종</label>
              <input
                type="text"
                name="breed"
                value={formData.breed}
                onChange={handleChange}
                placeholder="예: 말티즈, 코리안 숏헤어"
                className="w-full rounded-lg border border-[#DED8CC] px-4 py-3 text-sm focus:border-[#18231F] focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-4 border-t border-[#EBE6DC] pt-6">
            {error && (
              <span role="alert" className="text-sm font-semibold text-red-600">
                {error}
              </span>
            )}
            {isSaved && <span role="status" className="text-sm font-semibold text-[#B99562]">저장되었습니다.</span>}
            <button type="submit" disabled={isSaving} className="mp-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
              {isSaving ? '저장 중…' : '회원정보 저장'}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={() => setIsWithdrawModalOpen(true)}
          className="text-sm text-[#68716C] underline decoration-[#DED8CC] underline-offset-4 hover:text-[#18231F]"
        >
          회원 탈퇴
        </button>
      </div>

      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !isWithdrawing && setIsWithdrawModalOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="withdraw-modal-title"
            className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2 id="withdraw-modal-title" className="text-lg font-bold text-[#18231F]">
              회원 탈퇴
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#68716C]">
              탈퇴하시면 즉시 로그아웃되며 재로그인이 불가능합니다. 이름·연락처·이메일 등 개인정보는
              삭제·익명 처리되고, 주문 이력은 관계 법령에 따라 보존됩니다. 계속하시겠어요?
            </p>
            {withdrawError && (
              <p role="alert" className="mt-3 text-sm font-semibold text-[#8A5A3B]">
                {withdrawError}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsWithdrawModalOpen(false)}
                disabled={isWithdrawing}
                className="rounded-lg border border-[#DED8CC] px-4 py-2.5 text-sm font-semibold text-[#18231F] transition-colors hover:bg-[#F8F6F0] disabled:cursor-not-allowed disabled:opacity-60"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleWithdraw}
                disabled={isWithdrawing}
                className="rounded-lg bg-[#14211C] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isWithdrawing ? '처리 중…' : '탈퇴하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
