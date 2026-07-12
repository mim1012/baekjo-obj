'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { concerns } from '@/data/concerns';
import { registerUser, registerBusinessMember, isLoggedIn } from '@/lib/storage';
import SocialLoginButtons from '@/components/common/SocialLoginButtons';
import B2BSignupForm from '@/components/signup/B2BSignupForm';
import InsuranceSignupForm from '@/components/signup/InsuranceSignupForm';
import PartnerSignupForm from '@/components/signup/PartnerSignupForm';

const SIGNUP_SOCIAL_LABELS = { kakao: '카카오로 시작하기', naver: '네이버로 시작하기' };

type SignupTab = 'user' | 'partner' | 'b2b' | 'insurance';
type BusinessRole = 'b2b' | 'insurance' | 'partner';
type BusinessResult = 'success' | 'duplicate' | 'error' | null;

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [signupTab, setSignupTab] = useState<SignupTab>('user');
  const [businessResult, setBusinessResult] = useState<BusinessResult>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    passwordConfirm: '',
    phone: '',
    petType: 'dog',
    breed: '',
    mainConcern: 'tear',
    termsAgree: false,
    privacyAgree: false,
  });

  // 이미 로그인된 사용자는 마이페이지로 — 회원가입 탭 전환 로직과는 무관하게
  // 최초 진입 시 1회만 확인한다.
  useEffect(() => {
    if (isLoggedIn()) {
      router.push('/mypage');
    }
  }, [router]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = event.target;
    const checked = event.target instanceof HTMLInputElement ? event.target.checked : false;
    setFormData((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (formData.password !== formData.passwordConfirm) {
      setError('비밀번호가 서로 일치하지 않습니다.');
      return;
    }
    setError('');
    setPending(true);
    const result = await registerUser({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      phone: formData.phone,
      petType: formData.petType,
      breed: formData.breed,
      mainConcern: formData.mainConcern,
    });
    setPending(false);

    if (result.error === 'duplicate-email') {
      setError('이미 가입된 이메일입니다. 로그인해 주세요.');
      return;
    }
    if (result.error === 'invalid-input') {
      setError('입력값을 다시 확인해 주세요.');
      return;
    }
    if (result.error === 'network') {
      setError('잠시 후 다시 시도해 주세요.');
      return;
    }
    if (result.error === 'session') {
      setError('가입은 완료됐어요. 로그인 화면에서 로그인해 주세요.');
      router.push('/login');
      return;
    }
    router.push('/mypage');
  };

  const handleBusinessSuccess = async (role: BusinessRole, data: Record<string, unknown>) => {
    setPending(true);
    const result = await registerBusinessMember({
      role,
      name: (data.managerName as string | undefined) ?? (data.name as string | undefined) ?? '',
      email: (data.email as string | undefined) ?? '',
      phone: (data.contact as string | undefined) ?? '',
      password: (data.password as string | undefined) ?? '',
      companyName: data.companyName as string | undefined,
      businessNumber: data.businessNumber as string | undefined,
      signupData: data,
    });
    setPending(false);

    if (result.user) {
      setBusinessResult('success');
      return;
    }
    if (result.error === 'duplicate-email') {
      setBusinessResult('duplicate');
      return;
    }
    setBusinessResult('error');
  };

  const handleTabChange = (tab: SignupTab) => {
    setSignupTab(tab);
    setBusinessResult(null);
    setError('');
  };

  const fieldClass = 'w-full border border-[#C9C8C0] px-4 py-3.5 text-sm focus:border-[#2F3B34]';

  if (businessResult === 'success') {
    return (
      <div className="min-h-dvh bg-[#E9E7E0] px-5 py-16 flex flex-col items-center justify-center">
        <div className="max-w-md w-full border border-[#D1D0C8] bg-[#FAF9F5] p-10 text-center shadow-sm">
          <h2 className="text-2xl font-bold text-[#202521] mb-4">가입 신청 완료</h2>
          <p className="text-[#59615B] mb-8">가입 신청이 완료되었습니다.<br />관리자 승인 후 이용 가능합니다.</p>
          <Link href="/" className="inline-flex min-h-12 items-center justify-center bg-[#2F3B34] px-6 text-sm font-semibold text-white w-full">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#E9E7E0] px-5 py-16">
      <div className="mx-auto max-w-2xl border border-[#D1D0C8] bg-[#FAF9F5] p-7 sm:p-12">
        <p className="font-editorial text-lg italic text-[#667368]">Join Baekjo Objet</p>
        <h1 className="mt-3 text-4xl font-normal text-[#202521]">회원가입</h1>
        <p className="mt-3 text-sm text-[#747B75]">
          {signupTab === 'user'
            ? '반려생활 정보를 등록하면 더 가까운 기준을 제안할 수 있습니다.'
            : '함께할 파트너 정보를 등록해주세요. 관리자 승인 후 이용 가능합니다.'}
        </p>

        <div className="mt-8 flex border-b border-[#D1D0C8]">
          {[
            { id: 'user', label: '일반 회원' },
            { id: 'partner', label: '입점 업체' },
            { id: 'b2b', label: 'B2B 업체' },
            { id: 'insurance', label: '보험사' },
          ].map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => handleTabChange(type.id as SignupTab)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                signupTab === type.id
                  ? 'border-b-2 border-[#2F3B34] text-[#2F3B34]'
                  : 'text-[#8B928C] hover:text-[#59615B]'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {businessResult === 'duplicate' && (
          <p className="mt-6 text-sm text-[#A65348]">이미 가입된 이메일입니다.</p>
        )}
        {businessResult === 'error' && (
          <p className="mt-6 text-sm text-[#A65348]">가입 신청 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.</p>
        )}

        {signupTab === 'partner' ? (
          <PartnerSignupForm onSuccess={(data) => handleBusinessSuccess('partner', data)} />
        ) : signupTab === 'b2b' ? (
          <B2BSignupForm onSuccess={(data) => handleBusinessSuccess('b2b', data)} />
        ) : signupTab === 'insurance' ? (
          <InsuranceSignupForm onSuccess={(data) => handleBusinessSuccess('insurance', data as Record<string, unknown>)} />
        ) : (
          <>
            <form onSubmit={handleSubmit} className="mt-9 space-y-7">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="이름 *"><input required name="name" value={formData.name} onChange={handleChange} className={fieldClass} /></Field>
                <Field label="연락처 *"><input required type="tel" name="phone" value={formData.phone} onChange={handleChange} className={fieldClass} placeholder="010-0000-0000" /></Field>
              </div>
              <Field label="이메일 *"><input required type="email" name="email" value={formData.email} onChange={handleChange} className={fieldClass} placeholder="name@example.com" /></Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="비밀번호 *"><input required minLength={6} type="password" name="password" value={formData.password} onChange={handleChange} className={fieldClass} /></Field>
                <Field label="비밀번호 확인 *"><input required minLength={6} type="password" name="passwordConfirm" value={formData.passwordConfirm} onChange={handleChange} className={fieldClass} /></Field>
              </div>
              {error && <p className="-mt-3 text-sm text-[#A65348]">{error}</p>}

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="반려동물 종류">
                  <select name="petType" value={formData.petType} onChange={handleChange} className={fieldClass}>
                    <option value="dog">강아지</option>
                    <option value="cat">고양이</option>
                  </select>
                </Field>
                <Field label="품종"><input name="breed" value={formData.breed} onChange={handleChange} className={fieldClass} placeholder="예: 말티즈" /></Field>
              </div>
              <Field label="주요 고민">
                <select name="mainConcern" value={formData.mainConcern} onChange={handleChange} className={fieldClass}>
                  {concerns.map((concern) => <option key={concern.slug} value={concern.slug}>{concern.title}</option>)}
                </select>
              </Field>

              <div className="space-y-3 border-t border-[#D8D6CE] pt-6">
                <label className="flex cursor-pointer items-start gap-3 text-sm text-[#5F6761]">
                  <input required type="checkbox" name="termsAgree" checked={formData.termsAgree} onChange={handleChange} className="mt-0.5 size-4" />
                  <span><strong>[필수]</strong> 이용약관에 동의합니다.</span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 text-sm text-[#5F6761]">
                  <input required type="checkbox" name="privacyAgree" checked={formData.privacyAgree} onChange={handleChange} className="mt-0.5 size-4" />
                  <span><strong>[필수]</strong> 개인정보 수집 및 이용에 동의합니다.</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={pending}
                className="min-h-14 w-full bg-[#2F3B34] px-6 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? '가입 처리 중…' : '회원가입'}
              </button>
            </form>

            <div className="mt-8 border-t border-[#DEDCD5] pt-6">
              <p className="mb-3 text-center text-[11px] text-[#8D938E]">간편 가입</p>
              {/* 소셜은 첫 로그인 때 자동 가입되므로 로그인과 같은 흐름을 사용한다. */}
              <SocialLoginButtons labels={SIGNUP_SOCIAL_LABELS} />
            </div>
          </>
        )}

        <p className="mt-6 text-center text-xs text-[#7B827C]">
          이미 계정이 있나요? <Link href="/login" className="font-semibold text-[#2F3B34]">로그인</Link>
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-[#4F5751]">{label}</span>
      {children}
    </label>
  );
}
