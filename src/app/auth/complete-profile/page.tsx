'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import BrandMark from '@/components/common/BrandMark';
import { getSessionUser, setCurrentUser, updateMyProfile } from '@/lib/storage';
import { normalizeReturnTo } from '@/lib/socialAuth';

function CompleteProfileForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = normalizeReturnTo(searchParams.get('returnTo'));
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getSessionUser().then((user) => {
      if (!user) {
        router.replace('/login');
        return;
      }
      if (user.profileCompleted) {
        router.replace(returnTo);
        return;
      }
      setName(user.name === '백조회원' ? '' : user.name);
      setPhone(user.phone);
      setLoading(false);
    });
  }, [returnTo, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    const result = await updateMyProfile({ name: name.trim(), phone: phone.trim() });
    setSaving(false);
    if (result.error || !result.user) {
      setError(result.error === 'invalid-input' ? '이름과 전화번호를 확인해 주세요.' : '저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }
    setCurrentUser(result.user);
    router.replace(returnTo);
  };

  if (loading) {
    return <div className="flex min-h-dvh items-center justify-center bg-[#F9F8F3]">회원정보를 확인하고 있어요…</div>;
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#E9E7E0] px-5 py-12">
      <section className="w-full max-w-lg border border-[#D1D0C8] bg-[#FAF9F5] p-7 shadow-sm sm:p-12">
        <BrandMark />
        <h1 className="mt-10 text-2xl font-bold text-[#202521]">주문에 필요한 정보를 입력해 주세요.</h1>
        <p className="mt-3 text-sm leading-6 text-[#59615B]">이름과 휴대폰 번호를 저장하면 주문 시 자동으로 불러옵니다.</p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#202521]">이름 *</span>
            <input required minLength={1} maxLength={50} value={name} onChange={(event) => setName(event.target.value)} className="w-full border border-[#C9C8C0] px-4 py-3.5 text-sm focus:border-[#2F3B34]" autoComplete="name" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#202521]">휴대폰 번호 *</span>
            <input required maxLength={40} value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="010-0000-0000" className="w-full border border-[#C9C8C0] px-4 py-3.5 text-sm focus:border-[#2F3B34]" autoComplete="tel" />
          </label>
          {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}
          <button type="submit" disabled={saving} className="w-full bg-[#2F3B34] py-3.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? '저장 중…' : '저장하고 계속하기'}
          </button>
        </form>
      </section>
    </main>
  );
}

export default function CompleteProfilePage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center bg-[#F9F8F3]">회원정보를 확인하고 있어요…</div>}>
      <CompleteProfileForm />
    </Suspense>
  );
}
