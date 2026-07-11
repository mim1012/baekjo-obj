'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ClipboardCheck, ShieldCheck, Sparkles } from 'lucide-react';
import { concerns } from '@/data/concerns';
import { registerUser, isLoggedIn } from '@/lib/storage';
import { User } from '@/types';
import BrandMark from '@/components/common/BrandMark';
import B2BSignupForm from '@/components/signup/B2BSignupForm';
import InsuranceSignupForm from '@/components/signup/InsuranceSignupForm';
import PartnerSignupForm from '@/components/signup/PartnerSignupForm';

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [signupType, setSignupType] = useState<'user' | 'partner' | 'b2b' | 'insurance'>('user');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isLoggedIn()) {
      router.push('/mypage');
    }
  }, [router]);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    passwordConfirm: '',
    phone: '',
    petType: 'dog',
    breed: '',
    mainConcern: 'tear',
    companyName: '',
    businessNumber: '',
    termsAgree: false,
    privacyAgree: false,
  });

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = event.target;
    const checked = event.target instanceof HTMLInputElement ? event.target.checked : false;
    setFormData((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (formData.password !== formData.passwordConfirm) {
      setError('비밀번호가 서로 일치하지 않습니다.');
      return;
    }
    setError('');
    
    const newUser: User = {
      id: `u-${Date.now()}`,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      role: signupType,
      status: signupType === 'user' ? 'active' : 'pending',
      createdAt: new Date().toISOString(),
    };

    if (signupType === 'user') {
      newUser.petType = formData.petType;
      newUser.breed = formData.breed;
      newUser.mainConcern = formData.mainConcern;
    } else {
      newUser.companyName = formData.companyName;
      newUser.businessNumber = formData.businessNumber;
    }

    registerUser(newUser);

    if (signupType === 'user') {
      router.push('/mypage');
    } else {
      setIsSuccess(true);
    }
  };

  const fieldClass = 'h-[52px] w-full rounded-md border border-[#C9C8C0] bg-white px-4 text-base text-[#17211D] outline-none transition-colors placeholder:text-[#9A9F99] focus:border-[#A8742E] focus:ring-2 focus:ring-[#A8742E]/15';

  if (isSuccess) {
    return (
      <div className="signup-page flex min-h-dvh flex-col items-center justify-center bg-[#F4F2EC] bg-noise px-5 py-12">
      <div className="w-full max-w-md rounded-2xl border border-[#E7E0D5] bg-[#FBFAF7] p-8 text-center sm:p-10">
          <h2 className="mb-4 text-2xl font-bold tracking-tight text-[#17211D]">가입 신청 완료</h2>
          <p className="mb-8 text-sm leading-7 text-[#6F766F]">가입 신청이 완료되었습니다.<br />관리자 승인 후 이용 가능합니다.</p>
          <Link href="/" className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-[#17211D] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#2F3B34]">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="signup-page min-h-dvh bg-[#F4F2EC] bg-noise py-8 lg:py-10">
      <div className="mx-auto grid max-w-[1180px] items-start gap-8 px-4 sm:px-8 lg:grid-cols-[35%_65%] lg:px-10">
        <aside className="hidden lg:sticky lg:top-24 lg:block">
          <BrandMark />
          <p className="mt-8 font-editorial text-[13px] italic text-[#A8742E]">Join Baekjo Objet</p>
          <h1 className="mt-3 text-[42px] font-bold leading-[1.15] tracking-tight text-[#17211D]">회원가입</h1>
          <p className="mt-4 max-w-sm text-sm leading-[1.8] text-[#6F766F] break-keep">반려생활을 위한 계정부터 브랜드·제휴 파트너 신청까지, 필요한 방식으로 백조오브제와 함께 시작하세요.</p>
          <div className="mt-8 space-y-5 border-t border-[#D8D6CE] pt-6">
            {[
              { icon: ShieldCheck, title: '신뢰할 수 있는 기준', description: '검증된 정보와 브랜드만 소개합니다.' },
              { icon: Sparkles, title: '맞춤형 큐레이션', description: '반려생활에 맞는 상품과 콘텐츠를 연결합니다.' },
              { icon: ClipboardCheck, title: '간편한 신청 관리', description: '파트너 신청은 검토 후 별도로 안내합니다.' },
            ].map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#F3EEE6] text-[#A8742E]"><Icon className="size-4" strokeWidth={1.6} /></span>
                <div><p className="text-sm font-semibold text-[#17211D]">{title}</p><p className="mt-1 text-xs leading-5 text-[#6F766F]">{description}</p></div>
              </div>
            ))}
          </div>
        </aside>

        <div className="rounded-2xl border border-[#E7E0D5] bg-[#FBFAF7] p-5 sm:p-8 lg:p-9">
          <div className="lg:hidden"><BrandMark /><p className="mt-5 font-editorial text-[13px] italic text-[#A8742E]">Join Baekjo Objet</p></div>
          <h1 className="mt-3 text-[30px] font-bold leading-[1.2] tracking-tight text-[#17211D] lg:hidden">회원가입</h1>
          <p className="mt-3 text-sm text-[#6F766F] break-keep">함께할 파트너 또는 반려동물 정보를 등록해주세요.</p>

        <div className="mt-6 grid grid-cols-2 gap-1 border-b border-[#D8D6CE] pb-1 sm:grid-cols-4">
          {[
            { id: 'user', label: '일반 회원' },
            { id: 'partner', label: '입점 업체' },
            { id: 'b2b', label: 'B2B 업체' },
            { id: 'insurance', label: '보험사' }
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setSignupType(type.id as typeof signupType)}
              type="button"
              aria-pressed={signupType === type.id}
              className={`flex min-h-12 items-center justify-center rounded-t-md px-2 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A8742E]/40 ${
                signupType === type.id
                  ? 'border-b-2 border-[#A8742E] bg-[#F3EEE6] text-[#17211D]'
                  : 'text-[#59615B] hover:bg-[#FAF8F3] hover:text-[#17211D]'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {signupType === 'partner' ? (
          <PartnerSignupForm onSuccess={(data) => {
            const newUser: User = {
              id: `u-${Date.now()}`,
              name: data.managerName ?? '',
              email: data.email ?? '',
              phone: data.contact ?? '',
              role: 'partner',
              status: 'pending',
              createdAt: new Date().toISOString(),
              companyName: data.companyName,
              businessNumber: data.businessNumber,
              attachedFiles: data.attachedFiles,
              partnerData: data,
            };
            registerUser(newUser);
            setIsSuccess(true);
          }} />
        ) : signupType === 'b2b' ? (
          <B2BSignupForm onSuccess={(data) => {
            const newUser: User = {
              id: `u-${Date.now()}`,
              name: data.managerName ?? '',
              email: data.email ?? '',
              phone: data.contact ?? '',
              role: 'b2b',
              status: 'pending',
              createdAt: new Date().toISOString(),
              companyName: data.companyName,
              businessNumber: data.businessNumber,
              attachedFiles: data.attachedFiles,
              b2bData: data,
            };
            registerUser(newUser);
            setIsSuccess(true);
          }} />
        ) : signupType === 'insurance' ? (
          <InsuranceSignupForm onSuccess={(data) => {
            const newUser: User = {
              id: `u-${Date.now()}`,
              name: data.name ?? '',
              email: data.email ?? '',
              phone: data.contact ?? '',
              role: 'insurance',
              status: 'pending',
              createdAt: new Date().toISOString(),
              insuranceCompany: data.insuranceCompany,
              insuranceRegNumber: data.insuranceRegNumber,
              activityArea: data.activityArea,
              specialty: data.specialty,
              attachedFiles: data.attachedFiles,
              insuranceData: data,
            };
            registerUser(newUser);
            setIsSuccess(true);
          }} />
        ) : (
          <form onSubmit={handleSubmit} className="auth-user-form mt-7 space-y-8">
            <section className="space-y-5">
              <h2 className="border-b border-[#E1DDD4] pb-3 text-[17px] font-semibold tracking-tight text-[#17211D]">기본 정보</h2>
              <div className="grid gap-5 sm:grid-cols-2">
              <Field label="이름 *"><input required name="name" value={formData.name} onChange={handleChange} className={fieldClass} /></Field>
              <Field label="연락처 *"><input required type="tel" name="phone" value={formData.phone} onChange={handleChange} className={fieldClass} placeholder="010-0000-0000" /></Field>
              </div>
            </section>

            <section className="space-y-5">
              <h2 className="border-b border-[#E1DDD4] pb-3 text-[17px] font-semibold tracking-tight text-[#17211D]">계정 정보</h2>
              <Field label="이메일 *"><input required type="email" name="email" value={formData.email} onChange={handleChange} className={fieldClass} placeholder="name@example.com" /></Field>
              <div className="grid gap-5 sm:grid-cols-2">
              <Field label="비밀번호 *"><input required minLength={6} type="password" name="password" value={formData.password} onChange={handleChange} className={fieldClass} /></Field>
              <Field label="비밀번호 확인 *"><input required minLength={6} type="password" name="passwordConfirm" value={formData.passwordConfirm} onChange={handleChange} className={fieldClass} /></Field>
              </div>
              {error && <p role="alert" className="-mt-2 text-[13px] text-[#9E3939]">{error}</p>}
            </section>

            {signupType === 'user' ? (
              <section className="space-y-5">
                <h2 className="border-b border-[#E1DDD4] pb-3 text-[17px] font-semibold tracking-tight text-[#17211D]">반려동물 정보</h2>
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
              </section>
            ) : null}

            <section className="space-y-3 rounded-lg border border-[#E7E0D5] bg-[#FAF8F3] p-4">
              <h2 className="text-[17px] font-semibold tracking-tight text-[#17211D]">약관 동의</h2>
              <label className="flex min-h-10 cursor-pointer items-center gap-3 text-[13px] text-[#59615B]">
                <input required type="checkbox" name="termsAgree" checked={formData.termsAgree} onChange={handleChange} className="size-4 accent-[#17211D]" />
                <span><strong className="text-[#17211D]">[필수]</strong> 이용약관에 동의합니다.</span>
              </label>
              <label className="flex min-h-10 cursor-pointer items-center gap-3 text-[13px] text-[#59615B]">
                <input required type="checkbox" name="privacyAgree" checked={formData.privacyAgree} onChange={handleChange} className="size-4 accent-[#17211D]" />
                <span><strong className="text-[#17211D]">[필수]</strong> 개인정보 수집 및 이용에 동의합니다.</span>
              </label>
            </section>

            <button type="submit" className="min-h-[54px] w-full rounded-lg bg-[#17211D] px-6 text-[15px] font-semibold text-[#FBFAF7] transition-colors hover:bg-[#2F3B34] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A8742E] focus-visible:ring-offset-2">
              {signupType === 'user' ? '회원가입' : '가입 신청하기'}
            </button>
          </form>
        )}

        <p className="mt-5 min-h-9 text-center text-[13px] text-[#7B827C]">
          이미 계정이 있나요? <Link href="/login" className="inline-flex min-h-9 items-center font-semibold text-[#2F3B34]">로그인</Link>
        </p>
      </div>
    </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[13px] font-medium text-[#4F5751]">{label}</span>
      {children}
    </label>
  );
}
