'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import BrandMark from '@/components/common/BrandMark';
import { login, isLoggedIn, setCurrentUser } from '@/lib/storage';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isLoggedIn()) {
      router.push('/mypage');
    }
  }, [router]);

  const handleLogin = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    // 관리자 로그인 분기 처리
    if (email === 'admin@naver.com') {
      if (password === 'admin1234') {
        setCurrentUser(
          {
            id: 'admin',
            name: '관리자',
            email,
            phone: '',
            role: 'admin',
            status: 'active',
            createdAt: new Date().toISOString(),
          },
          remember,
        );
        if (typeof window !== 'undefined') {
          if (remember) localStorage.setItem('baekjo_remember_email', email);
          else localStorage.removeItem('baekjo_remember_email');
        }
        router.push('/admin');
        return;
      } else {
        setError('관리자 비밀번호가 일치하지 않습니다.');
        return;
      }
    }

    // 일반 유저
    login(email, remember);
    if (typeof window !== 'undefined') {
      if (remember) localStorage.setItem('baekjo_remember_email', email);
      else localStorage.removeItem('baekjo_remember_email');
    }
    router.push('/');
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
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-xs font-medium text-red-600 border border-red-200">
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
              className="mt-2 w-full bg-[#2F3B34] py-3.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#3C4941]"
            >
              로그인
            </button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-4 text-xs text-[#777E78]">
            <Link href="/signup" className="hover:text-[#2F3B34]">회원가입</Link>
            <span className="w-px h-3 bg-[#D1D0C8]" />
            <Link href="#" className="hover:text-[#2F3B34]">아이디 찾기</Link>
            <span className="w-px h-3 bg-[#D1D0C8]" />
            <Link href="#" className="hover:text-[#2F3B34]">비밀번호 찾기</Link>
          </div>

          <div className="mt-8 border-t border-[#DEDCD5] pt-6">
            <p className="mb-3 text-center text-[11px] text-[#8D938E]">간편 로그인</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-md bg-[#FEE500] py-3 text-xs font-semibold text-[#191600] transition-opacity duration-150 hover:opacity-90"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden="true">
                  <path d="M12 3C6.5 3 2 6.58 2 11c0 2.86 1.9 5.37 4.76 6.78-.21.75-.76 2.75-.87 3.18-.14.53.19.52.4.38.17-.11 2.66-1.81 3.74-2.55.63.09 1.29.14 1.97.14 5.5 0 10-3.58 10-8S17.5 3 12 3z" />
                </svg>
                카카오 로그인
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-md bg-[#03C75A] py-3 text-xs font-semibold text-white transition-opacity duration-150 hover:opacity-90"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="size-3.5" aria-hidden="true">
                  <path d="M15.9 12.6 8.35 3H3v18h5.1v-9.6L15.65 21H21V3h-5.1z" />
                </svg>
                네이버 로그인
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
