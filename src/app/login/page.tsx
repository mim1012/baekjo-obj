'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import BrandMark from '@/components/common/BrandMark';
import { login, isLoggedIn } from '@/lib/storage';
import SocialLoginButtons from '@/components/common/SocialLoginButtons';
import { useMounted } from '@/lib/useMounted';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const mounted = useMounted();

  const [pending, setPending] = useState(false);

  // 이미 로그인된 상태로 로그인 화면에 오면 마이페이지로 보낸다(기획 방향).
  // 단, 관리자 접근 거부 등 ?error=... 안내가 있을 땐 배너를 보여줘야 하므로 자동이동하지 않는다.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (isLoggedIn() && !params.get('error')) {
      router.replace('/mypage');
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
    if (result.error === 'network' || !result.user) {
      setError('로그인 처리 중 문제가 발생했어요. 새로고침 후 다시 시도해 주세요.');
      return;
    }

    if (typeof window !== 'undefined') {
      if (remember) localStorage.setItem('baekjo_remember_email', email);
      else localStorage.removeItem('baekjo_remember_email');
    }
    router.push(result.user.role === 'admin' ? '/admin' : '/');
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#E9E7E0] px-5 py-20">
      <div className="grid w-full max-w-4xl border border-[#D1D0C8] bg-[#FAF9F5] shadow-sm md:grid-cols-[0.85fr_1.15fr]">
        <div className="hidden border-r border-[#D1D0C8] bg-[#687069] p-10 text-white md:flex md:flex-col md:justify-between">
          <BrandMark inverse />
          <div>
            <p className="font-editorial text-4xl leading-tight">
              함께한 오늘을
              <br />
              오래 기억하도록.
            </p>
            <p className="mt-5 text-sm leading-7 text-[#D2D7D2]">
              나의 관심 상품과 주문,
              <br />
              맞춤 케어 기록을 이어서 확인하세요.
            </p>
          </div>
        </div>

        <div className="p-7 sm:p-12">
          <div className="md:hidden">
            <BrandMark />
          </div>
          <h1 className="mt-10 text-3xl font-normal text-[#202521] md:mt-0">다시 만나 반가워요.</h1>
          <p className="mt-2 text-sm text-[#747B75]">백조오브제 계정으로 로그인해 주세요.</p>

          <form onSubmit={handleLogin} className="mt-9 space-y-4">
            {(error || socialError) && (
              <div role="alert" className="rounded-md bg-red-50 p-3 text-xs font-medium text-red-600 border border-red-200">
                {error || socialError}
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
            <label className="block">
              <span className="mb-2 block text-xs font-medium text-[#5F6761]">비밀번호</span>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="비밀번호를 입력해 주세요"
                className="w-full border border-[#C9C8C0] px-4 py-3.5 text-sm focus:border-[#2F3B34]"
              />
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-[#697069]">
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

          <div className="mt-6 flex items-center justify-center gap-4 text-xs text-[#777E78]">
            <Link href="/signup" className="hover:text-[#2F3B34]">회원가입</Link>
            <span className="h-3 w-px bg-[#D3D2CA]" />
            <Link href="#" className="hover:text-[#2F3B34]">아이디 찾기</Link>
            <span className="h-3 w-px bg-[#D3D2CA]" />
            <Link href="/forgot-password" className="hover:text-[#2F3B34]">비밀번호 찾기</Link>
          </div>

          <div className="mt-8 border-t border-[#DEDCD5] pt-6">
            <p className="mb-3 text-center text-[11px] text-[#8D938E]">간편 로그인</p>
            <SocialLoginButtons />
          </div>
        </div>
      </div>
    </div>
  );
}
