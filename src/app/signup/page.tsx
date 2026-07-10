'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { concerns } from '@/data/concerns';
import { registerUser, isLoggedIn } from '@/lib/storage';
import { User } from '@/types';
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
    keepLoggedIn: true,
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

    registerUser(newUser, formData.keepLoggedIn);

    if (signupType === 'user') {
      router.push('/mypage');
    } else {
      setIsSuccess(true);
    }
  };

  const fieldClass = 'w-full border border-[#C9C8C0] px-4 py-3.5 text-sm focus:border-[#2F3B34]';

  if (isSuccess) {
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
        <p className="mt-3 text-sm text-[#747B75]">함께할 파트너 또는 반려동물 정보를 등록해주세요.</p>

        <div className="mt-8 flex border-b border-[#D1D0C8]">
          {[
            { id: 'user', label: '일반 회원' },
            { id: 'partner', label: '입점 업체' },
            { id: 'b2b', label: 'B2B 업체' },
            { id: 'insurance', label: '보험사' }
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setSignupType(type.id as any)}
              type="button"
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                signupType === type.id
                  ? 'border-b-2 border-[#2F3B34] text-[#2F3B34]'
                  : 'text-[#8B928C] hover:text-[#59615B]'
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

            {signupType === 'user' ? (
              <>
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
              </>
            ) : null}

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
            <label className="flex cursor-pointer items-center gap-3 text-sm text-[#5F6761]">
              <input type="checkbox" name="keepLoggedIn" checked={formData.keepLoggedIn} onChange={handleChange} className="size-4" />
              로그인 상태 유지 (자동 로그인)
            </label>

            <button type="submit" className="min-h-14 w-full bg-[#2F3B34] px-6 text-base font-semibold text-white">
              {signupType === 'user' ? '회원가입' : '가입 신청하기'}
            </button>
          </form>
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
