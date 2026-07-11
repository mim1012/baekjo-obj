'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import BrandMark from '@/components/common/BrandMark';
import { login, isLoggedIn } from '@/lib/storage';

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
        login(email);
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
    login(email);
    if (typeof window !== 'undefined') {
      if (remember) localStorage.setItem('baekjo_remember_email', email);
      else localStorage.removeItem('baekjo_remember_email');
    }
    router.push('/');
  };

  return (
    <div className="auth-login-page min-h-dvh bg-[#F4F2EC] bg-noise px-4 py-8 sm:px-8 lg:py-10">
      <div className="mx-auto grid w-full max-w-[1000px] overflow-hidden border border-[#D8D6CE] bg-[#FBFAF7] md:min-h-[600px] md:grid-cols-[38%_62%]">
        <div className="flex min-h-[124px] flex-col justify-between bg-[#687069] p-6 text-[#FBFAF7] sm:p-8 md:min-h-0 md:border-r md:border-[#D1D0C8] lg:p-10">
          <BrandMark inverse />
          <div className="mt-8 md:mt-0">
            <p className="font-editorial text-[28px] leading-[1.2] md:text-[32px]">
              함께한 오늘을
              <br />
              오래 기억하도록.
            </p>
            <p className="mt-3 max-w-[280px] text-[14px] leading-[1.7] text-[#D2D7D2] md:mt-5">
              나의 관심 상품과 주문,
              <br />
              맞춤 케어 기록을 이어서 확인하세요.
            </p>
          </div>
        </div>

        <div className="flex items-center px-6 py-8 sm:px-10 md:px-12 md:py-12">
          <div className="mx-auto w-full max-w-[440px]">
          <h1 className="text-[30px] font-semibold leading-[1.2] tracking-tight text-[#17211D] sm:text-[40px]">다시 만나 반가워요.</h1>
          <p className="mt-3 text-[15px] text-[#6F766F]">백조오브제 계정으로 로그인해 주세요.</p>

          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            {error && (
              <div role="alert" className="rounded-md border border-[#D9A4A0] bg-[#F9EFED] p-3 text-[13px] font-medium text-[#9E3939]">
                {error}
              </div>
            )}
            <label className="block">
              <span className="mb-2 block text-[13px] font-medium text-[#4F5751]">이메일</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                className="h-[52px] w-full rounded-md border border-[#C9C8C0] bg-white px-4 text-base text-[#17211D] outline-none transition-colors placeholder:text-[#9A9F99] focus:border-[#A8742E] focus:ring-2 focus:ring-[#A8742E]/15"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-[13px] font-medium text-[#4F5751]">비밀번호</span>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="비밀번호를 입력해 주세요"
                className="h-[52px] w-full rounded-md border border-[#C9C8C0] bg-white px-4 text-base text-[#17211D] outline-none transition-colors placeholder:text-[#9A9F99] focus:border-[#A8742E] focus:ring-2 focus:ring-[#A8742E]/15"
              />
            </label>
            <label className="flex min-h-9 cursor-pointer items-center gap-2 text-[13px] text-[#59615B]">
              <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="size-4 accent-[#17211D]" />
              로그인 상태 유지
            </label>
            <button
              type="submit"
              className="mt-1 min-h-[52px] w-full rounded-md bg-[#17211D] px-4 text-[15px] font-semibold text-[#FBFAF7] transition-colors duration-300 hover:bg-[#2F3B34] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A8742E] focus-visible:ring-offset-2"
            >
              로그인
            </button>
          </form>

          <div className="mt-4 flex min-h-9 items-center justify-center gap-3 text-[13px] text-[#6F766F]">
            <Link href="/signup" className="inline-flex min-h-9 items-center px-1 hover:text-[#17211D]">회원가입</Link>
            <span className="h-3 w-px bg-[#D1D0C8]" aria-hidden="true" />
            <Link href="#" className="inline-flex min-h-9 items-center px-1 hover:text-[#17211D]">아이디 찾기</Link>
            <span className="h-3 w-px bg-[#D1D0C8]" aria-hidden="true" />
            <Link href="#" className="inline-flex min-h-9 items-center px-1 hover:text-[#17211D]">비밀번호 찾기</Link>
          </div>

          <div className="mt-5 border-t border-[#DEDCD5] pt-5">
            <div className="mb-4 flex items-center gap-3 text-[12px] font-medium text-[#8D938E]"><span className="h-px flex-1 bg-[#DEDCD5]" />간편 로그인<span className="h-px flex-1 bg-[#DEDCD5]" /></div>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" className="min-h-[48px] rounded-md border border-[#E6D000] bg-[#FEE500] text-[13px] font-semibold text-[#3B1E1E] transition-colors hover:bg-[#F5DC00] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A8742E] focus-visible:ring-offset-2">
                카카오
              </button>
              <button type="button" className="min-h-[48px] rounded-md border border-[#02A94F] bg-[#03C75A] text-[13px] font-semibold text-white transition-colors hover:bg-[#02B351] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A8742E] focus-visible:ring-offset-2">
                네이버
              </button>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
