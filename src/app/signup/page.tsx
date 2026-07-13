'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { User, Store, Shield, Building2, Check } from 'lucide-react';
import { concerns } from '@/data/concerns';
import { registerUser, registerBusinessMember, isLoggedIn } from '@/lib/storage';
import SocialLoginButtons from '@/components/common/SocialLoginButtons';
import B2BSignupForm from '@/components/signup/B2BSignupForm';
import InsuranceSignupForm from '@/components/signup/InsuranceSignupForm';
import PartnerSignupForm from '@/components/signup/PartnerSignupForm';
import BrandMark from '@/components/common/BrandMark';

const SIGNUP_SOCIAL_LABELS = { kakao: '카카오로 시작하기', naver: '네이버로 시작하기' };

type SignupTab = 'user' | 'partner' | 'b2b' | 'insurance';
type BusinessRole = 'b2b' | 'insurance' | 'partner';
type BusinessResult = 'success' | 'duplicate' | 'error' | null;

const MEMBER_TYPES = [
  {
    id: 'user',
    icon: User,
    title: '일반회원',
    description: '상품 구매와 케어 서비스를 이용하실 수 있습니다.',
    features: ['상품 구매 및 주문', '맞춤 케어 가이드', '후기 작성 및 회원 혜택', '보험 분석 서비스'],
  },
  {
    id: 'partner',
    icon: Store,
    title: '입점업체',
    description: '브랜드와 상품을 등록하고 판매하실 수 있습니다.',
    features: ['브랜드 입점 신청', '상품 등록 및 관리', '주문 및 고객 관리', '정산 및 매출 관리'],
  },
  {
    id: 'insurance',
    icon: Shield,
    title: '보험사회원',
    description: '보험 상품과 상담 서비스를 운영하실 수 있습니다.',
    features: ['보험 상품 등록', '상담 신청 관리', '보험 서비스 운영', '제휴 및 마케팅 지원'],
  },
  {
    id: 'b2b',
    icon: Building2,
    title: 'B2B회원',
    description: '사업자 전용 구매와 제휴 서비스를 이용하실 수 있습니다.',
    features: ['사업자 전용 구매', '대량 구매 및 견적', '기업·기관 제휴', 'B2B 전용 혜택'],
  },
];

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#F8F6F0]" />}>
      <SignupContent />
    </Suspense>
  );
}

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get('type') as SignupTab | null;

  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
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

  const fieldClass = 'w-full border border-[#C9C8C0] px-3 py-2 text-[13px] focus:border-[#2F3B34]';

  if (businessResult === 'success') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[#E9E7E0] px-5 py-8">
        <div className="w-full max-w-md border border-[#D1D0C8] bg-[#FAF9F5] p-8 text-center shadow-sm">
          <h2 className="mb-4 text-2xl font-bold text-[#202521]">가입 신청 완료</h2>
          <p className="mb-8 text-[#59615B]">
            가입 신청이 완료되었습니다.<br />
            관리자 승인 후 이용 가능합니다.
          </p>
          <Link href="/" className="inline-flex min-h-11 w-full items-center justify-center bg-[#2F3B34] px-6 text-sm font-semibold text-white">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const isValidType = typeParam && ['user', 'partner', 'b2b', 'insurance'].includes(typeParam);

  if (!isValidType) {
    return (
      <div className="flex min-h-dvh flex-col items-center bg-[#F8F6F0] px-[18px] pb-8 pt-8 text-[#18271F] md:px-12 md:pb-10 md:pt-10">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center">
          <Link href="/" className="mb-6 block md:mb-8">
            <BrandMark />
          </Link>
          
          <h1 className="text-center text-[24px] font-semibold leading-[1.2] tracking-[-0.035em] md:text-[36px]">
            회원 유형을 선택해 주세요
          </h1>
          <p className="mb-[20px] mt-3 text-center text-[14px] leading-[1.7] text-[#71766F] md:mb-[28px] md:mt-[14px] md:text-[16px]">
            회원 유형에 따라 이용 가능한 서비스와 가입 절차가 달라집니다.
          </p>

          <div className="w-full rounded-[20px] border border-[#E2DACC] bg-[#FFFEFB] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] md:rounded-[24px] md:p-6 lg:p-8">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {MEMBER_TYPES.map((type) => (
                <article key={type.id} className="flex h-full min-h-[420px] flex-col rounded-[18px] border border-[#E2DACC] bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-[#AA8A55] xl:min-h-[450px]">
                  <div className="mb-4 flex h-[64px] w-[64px] items-center justify-center rounded-full bg-[#F8F6F0]">
                    <type.icon className="h-7 w-7 text-[#173B2E]" strokeWidth={1.5} />
                  </div>
                  <h2 className="text-lg font-bold text-[#18271F]">{type.title}</h2>
                  <p className="mt-2 text-[14px] leading-relaxed text-[#71766F]">
                    {type.description}
                  </p>
                  <hr className="my-4 border-[#E2DACC]" />
                  <ul className="mb-6 space-y-2.5">
                    {type.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-[14px] text-[#18271F]">
                        <Check className="mt-[2px] h-3.5 w-3.5 shrink-0 text-[#AA8A55]" strokeWidth={2.5} />
                        <span className="leading-snug">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/signup?type=${type.id}`}
                    className="mt-auto flex h-[46px] w-full items-center justify-center rounded-lg bg-[#173B2E] text-[14px] font-semibold text-white transition-colors hover:bg-[#102A21]"
                  >
                    선택하고 가입하기
                  </Link>
                </article>
              ))}
            </div>

            <div className="mt-8 flex flex-col items-center">
              <div className="flex w-full max-w-[320px] items-center gap-4">
                <div className="h-px flex-1 bg-[#E2DACC]" />
                <span className="text-[13px] text-[#71766F]">이미 계정이 있으신가요?</span>
                <div className="h-px flex-1 bg-[#E2DACC]" />
              </div>
              <Link
                href="/login"
                className="mt-4 flex h-11 w-full max-w-[240px] items-center justify-center rounded-lg border border-[#173B2E] text-[14px] font-semibold text-[#173B2E] transition-colors hover:bg-[#F8F6F0]"
              >
                로그인하기 →
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const signupTab = typeParam as SignupTab;

  return (
    <div className="grid min-h-dvh w-full bg-[#FAF9F5] md:grid-cols-[0.6fr_1.4fr] lg:grid-cols-[0.5fr_1.5fr] overflow-hidden">
      <div className="hidden border-r border-[#D1D0C8] bg-[#8A9BA7] md:flex md:flex-col lg:p-12 p-8 relative">
        <Link href="/" className="relative z-10">
          <BrandMark inverse />
        </Link>
        
        {/* 중앙 장식 이미지 (사용자 업로드 일러스트) */}
        <div className="flex-1 flex items-center justify-center mt-8 mb-8 relative w-full max-w-[280px] lg:max-w-[340px] mx-auto min-h-[300px]">
          <Image 
            src="/images/signup-left.png" 
            alt="Baekjo Objet Illustration" 
            fill
            className="object-contain drop-shadow-md" 
          />
        </div>

        <div className="mt-auto relative z-10">
          <p className="font-editorial text-3xl leading-tight text-white drop-shadow-sm">
            Join Baekjo
            <br />
            Objet
          </p>
          <p className="mt-4 text-[13px] leading-6 text-white/90 drop-shadow-sm">
            반려생활의 새로운 기준,
            <br />
            백조오브제와 함께 시작하세요.
          </p>
        </div>
      </div>

      <div className="flex flex-col justify-center px-5 py-4 sm:px-10 lg:px-16 overflow-y-auto">
        <div className="mx-auto w-full max-w-lg">
          <div className="md:hidden mb-4">
            <Link href="/">
              <BrandMark />
            </Link>
          </div>
          <h1 className="text-2xl font-normal text-[#202521] md:mt-0">회원가입</h1>
          <p className="mt-1 text-[13px] text-[#747B75]">
            {signupTab === 'user'
              ? '반려생활 정보를 등록하면 더 가까운 기준을 제안할 수 있습니다.'
              : '함께할 파트너 정보를 등록해주세요. 관리자 승인 후 이용 가능합니다.'}
          </p>

          <div className="mb-4 mt-4 flex items-center justify-between rounded-lg border border-[#D1D0C8] bg-white px-3 py-2">
            <div className="flex items-center gap-2.5">
              <span className="text-[13px] font-medium text-[#59615B]">선택한 회원 유형</span>
              <span className="rounded-md bg-[#2F3B34] px-2.5 py-0.5 text-[12px] font-semibold text-white">
                {signupTab === 'user' ? '일반회원' : signupTab === 'partner' ? '입점업체' : signupTab === 'insurance' ? '보험사회원' : 'B2B회원'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('회원 유형을 변경하시겠습니까? (공통 입력 정보는 유지됩니다)')) {
                  router.push('/signup');
                }
              }}
              className="text-[13px] font-medium text-[#747B75] underline underline-offset-2 hover:text-[#202521]"
            >
              변경하기
            </button>
          </div>

          {businessResult === 'duplicate' && (
            <p className="mb-3 text-[13px] text-[#A65348]">이미 가입된 이메일입니다.</p>
          )}
          {businessResult === 'error' && (
            <p className="mb-3 text-[13px] text-[#A65348]">가입 신청 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.</p>
          )}

          {signupTab === 'partner' ? (
            <PartnerSignupForm onSuccess={(data) => handleBusinessSuccess('partner', data)} />
          ) : signupTab === 'b2b' ? (
            <B2BSignupForm onSuccess={(data) => handleBusinessSuccess('b2b', data)} />
          ) : signupTab === 'insurance' ? (
            <InsuranceSignupForm onSuccess={(data) => handleBusinessSuccess('insurance', data as Record<string, unknown>)} />
          ) : (
            <>
              <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="이름 *"><input required name="name" value={formData.name} onChange={handleChange} className={fieldClass} /></Field>
                  <Field label="연락처 *"><input required type="tel" name="phone" value={formData.phone} onChange={handleChange} className={fieldClass} placeholder="010-0000-0000" /></Field>
                </div>
                <Field label="이메일 *"><input required type="email" name="email" value={formData.email} onChange={handleChange} className={fieldClass} placeholder="name@example.com" /></Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="비밀번호 *"><input required minLength={6} type="password" name="password" value={formData.password} onChange={handleChange} className={fieldClass} /></Field>
                  <Field label="비밀번호 확인 *"><input required minLength={6} type="password" name="passwordConfirm" value={formData.passwordConfirm} onChange={handleChange} className={fieldClass} /></Field>
                </div>
                {error && <p className="text-[13px] text-[#A65348]">{error}</p>}

                <div className="grid gap-3 sm:grid-cols-2">
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

                <div className="space-y-1.5 border-t border-[#D8D6CE] pt-3 mt-4">
                  <label className="flex cursor-pointer items-start gap-2 text-xs text-[#5F6761]">
                    <input required type="checkbox" name="termsAgree" checked={formData.termsAgree} onChange={handleChange} className="mt-0.5 size-3.5" />
                    <span><strong>[필수]</strong> 이용약관에 동의합니다.</span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-2 text-xs text-[#5F6761]">
                    <input required type="checkbox" name="privacyAgree" checked={formData.privacyAgree} onChange={handleChange} className="mt-0.5 size-3.5" />
                    <span><strong>[필수]</strong> 개인정보 수집 및 이용에 동의합니다.</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={pending}
                  className="min-h-11 mt-2 w-full bg-[#2F3B34] px-6 text-[14px] font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pending ? '가입 처리 중…' : '회원가입'}
                </button>
              </form>

              <div className="mt-4 border-t border-[#DEDCD5] pt-4">
                <p className="mb-2 text-center text-[11px] text-[#8D938E]">간편 가입</p>
                <SocialLoginButtons labels={SIGNUP_SOCIAL_LABELS} />
              </div>
            </>
          )}

          <p className="mt-4 text-center text-[12px] text-[#7B827C]">
            이미 계정이 있나요? <Link href="/login" className="font-semibold text-[#2F3B34]">로그인</Link>
          </p>
        </div>
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
