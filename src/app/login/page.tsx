'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getCurrentUser, login, isLoggedIn } from '@/lib/storage';
import type { User } from '@/types';
import SocialLoginButtons from '@/components/common/SocialLoginButtons';
import { useMounted } from '@/lib/useMounted';

function resolveLoginRedirect(role: User['role'], redirectTo: string | null): string {
  if (role === 'admin') return '/admin';
  if (role === 'partner') return '/partner/orders';
  if (redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//') && !redirectTo.startsWith('/admin')) {
    return redirectTo;
  }
  return '/';
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const mounted = useMounted();

  const [pending, setPending] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (isLoggedIn() && !params.get('error')) {
      const currentUser = getCurrentUser();
      router.replace(resolveLoginRedirect(currentUser?.role ?? 'user', params.get('redirect')));
    }
  }, [router]);

  // 소셜 로그인 실패/미들웨어 리다이렉트로 돌아온 경우(/login?error=...) 이유를 안내한다.
  // setState 없이 렌더 시점에 URL에서 파생 — 마운트 후에만 읽어 hydration 불일치를 피하고,
  // URL은 건드리지 않는다(주소가 곧 상태 — 지우면 다음 리렌더에서 배너가 소리 없이 사라진다).
  const errorParam = mounted ? new URLSearchParams(window.location.search).get('error') : null;
  const socialError = errorParam
    ? errorParam === 'admin'
      ? '관리자 로그인이 필요합니다.'
      : '간편 로그인에 실패했어요. 잠시 후 다시 시도해 주세요.'
    : '';

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setPending(true);
    const result = await login(email, password);
    setPending(false);

    if (result.error === 'invalid-credentials') {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      return;
    }
    if (result.error === 'pending-approval') {
      setError('가입 신청 검토 중입니다. 관리자 승인 완료 후 로그인할 수 있어요.');
      return;
    }
    if (result.error === 'member-rejected') {
      setError('가입 신청이 승인되지 않았습니다. 자세한 내용은 고객센터에 문의해 주세요.');
      return;
    }
    if (result.error === 'member-inactive') {
      setError('이용이 중지되었거나 탈퇴한 계정입니다. 고객센터에 문의해 주세요.');
      return;
    }
    if (result.error === 'email-not-verified') {
      setError('이메일 인증 후 로그인할 수 있어요. 인증 메일을 확인해 주세요.');
      return;
    }
    if (result.error === 'network' || !result.user) {
      setError('로그인 처리 중 문제가 발생했어요. 새로고침 후 다시 시도해 주세요.');
      return;
    }

    if (typeof window !== 'undefined') {
      if (remember) localStorage.setItem('baekjo_remember_email', email);
      else localStorage.removeItem('baekjo_remember_email');
    }
    const params = new URLSearchParams(window.location.search);
    const redirectTo = params.get('redirect');
    router.push(resolveLoginRedirect(result.user.role, redirectTo));
  };

  return (
    <div className="grid w-full bg-white lg:min-h-[calc(100svh-72px)] lg:grid-cols-2">
      <section aria-label="백조오브제와 함께하는 반려생활" className="relative order-2 min-w-0 lg:order-1">
        <div className="relative aspect-square w-full lg:absolute lg:inset-0 lg:aspect-auto">
          <Image
            src="/images/login-cat-window-v1.png"
            alt="햇살이 들어오는 창가의 리넨 위에서 편안하게 잠든 고양이"
            fill
            preload
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-contain lg:object-cover"
          />
        </div>
        <div className="relative px-5 py-8 sm:px-10 lg:absolute lg:inset-x-0 lg:bottom-0 lg:bg-[linear-gradient(0deg,rgba(250,249,245,0.92),rgba(250,249,245,0))] lg:px-12 lg:pt-20 lg:pb-10">
          <p className="font-editorial text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.4] text-[#17211D]">
            함께한 오늘을
            <br />
            오래 기억하도록.
          </p>
          <p className="mt-4 text-[15px] leading-7 text-[#45514A]">
            나의 관심 상품과 주문,
            <br />
            맞춤 케어 기록을 이어서 확인하세요.
          </p>
        </div>
      </section>
      <section aria-label="로그인" className="order-1 flex min-w-0 items-center justify-center px-5 py-10 sm:px-10 sm:py-14 lg:order-2 lg:px-12 lg:py-16">
        <div className="w-full max-w-[480px]">
          <h1 className="page-title">다시 만나 반가워요.</h1>
          <p className="mt-3 text-[15px] leading-7 text-[#59615B]">백조오브제 계정으로 로그인해 주세요.</p>

          <form onSubmit={handleLogin} className="mt-9 space-y-4">
            {(error || socialError) && (
              <div role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-600 border border-red-200">
                {error || socialError}
              </div>
            )}
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[#5F6761]">이메일</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                className="w-full border border-[#C9C8C0] min-h-12 px-4 py-3.5 text-base focus:border-[#2F3B34]"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[#5F6761]">비밀번호</span>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="비밀번호를 입력해 주세요"
                className="w-full border border-[#C9C8C0] min-h-12 px-4 py-3.5 text-base focus:border-[#2F3B34]"
              />
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-[#697069]">
              <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="size-4" />
              로그인 상태 유지
            </label>
            <button
              type="submit"
              disabled={pending}
              className="mt-2 w-full bg-[#2F3B34] py-3.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#3C4941] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? '로그인 중…' : '로그인'}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-4 text-sm text-[#59615B]">
            <Link href="/signup" className="hover:text-[#2F3B34]">회원가입</Link>
            <span className="h-3 w-px bg-[#D3D2CA]" />
            <Link href="/forgot-password" className="hover:text-[#2F3B34]">비밀번호 찾기</Link>
          </div>

          <div className="mt-8 border-t border-[#DEDCD5] pt-6">
            <p className="mb-3 text-center text-sm text-[#59615B]">간편 로그인</p>
            <SocialLoginButtons returnTo={mounted ? new URLSearchParams(window.location.search).get('redirect') ?? '/' : '/'} />
          </div>
        </div>
      </section>
    </div>
  );
}
