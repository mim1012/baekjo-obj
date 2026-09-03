'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { registerUser, registerBusinessMember, isLoggedIn, getConcernsConfig, requestEmailVerificationByEmail } from '@/lib/storage';
import { defaultConcernsConfig } from '@/lib/concerns/config';
import type { Concern } from '@/types';
import SocialLoginButtons from '@/components/common/SocialLoginButtons';
import B2BSignupForm from '@/components/signup/B2BSignupForm';
import InsuranceSignupForm from '@/components/signup/InsuranceSignupForm';
import PartnerSignupForm from '@/components/signup/PartnerSignupForm';
import { useEmailAvailability, EmailCheckMessage } from '@/components/signup/emailAvailability';
import { FEATURES } from '@/config/features';

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
  const [verificationPendingEmail, setVerificationPendingEmail] = useState('');
  const [verificationMessage, setVerificationMessage] = useState('');
  // 주요 고민 select 옵션. 초기값은 기본 config, 마운트 후 콘센트로 실제 config 를 불러온다(§4).
  const [concerns, setConcerns] = useState<Concern[]>(defaultConcernsConfig.items);
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
  // 이메일 입력 시점(디바운스) 중복 선체크 — 최종 판정은 가입 API 409가 담당한다.
  const emailStatus = useEmailAvailability(formData.email);

  // 이미 로그인된 사용자는 마이페이지로 — 회원가입 탭 전환 로직과는 무관하게
  // 최초 진입 시 1회만 확인한다.
  useEffect(() => {
    if (isLoggedIn()) {
      router.push('/mypage');
    }
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    getConcernsConfig().then((config) => {
      if (cancelled) return;
      setConcerns(config.items);
      // 기본값 'tear' 는 관리자가 해당 slug 를 삭제했을 수 있다 — 옵션 로드 후 현재 선택값이
      // 옵션에 없으면 첫 옵션 slug 로 보정해, 삭제된 slug 가 신규 회원에 저장되는 것을 막는다.
      if (config.items.length > 0) {
        setFormData((current) =>
          config.items.some((concern) => concern.slug === current.mainConcern)
            ? current
            : { ...current, mainConcern: config.items[0].slug },
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = event.target;
    const checked = event.target instanceof HTMLInputElement ? event.target.checked : false;
    setFormData((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (formData.password !== formData.passwordConfirm) {
      setError('비밀번호가 서로 일치하지 않습니다.');
      scrollToError();
      return;
    }
    if (emailStatus === 'duplicate') {
      setError('이미 가입된 이메일입니다. 로그인해 주세요.');
      scrollToError();
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
      termsAgree: formData.termsAgree,
      privacyAgree: formData.privacyAgree,
    });
    setPending(false);

    if (result.error === 'duplicate-email') {
      setError('이미 가입된 이메일입니다. 로그인해 주세요.');
      scrollToError();
      return;
    }
    if (result.error === 'invalid-input') {
      setError('입력값을 다시 확인해 주세요.');
      scrollToError();
      return;
    }
    if (result.error === 'network') {
      setError('잠시 후 다시 시도해 주세요.');
      scrollToError();
      return;
    }
    if (result.verificationPending) {
      setVerificationPendingEmail(formData.email);
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
      scrollToError();
      return;
    }
    setBusinessResult('error');
    scrollToError();
  };

  // 폼이 길어(입점 양식 9섹션) 제출 버튼 근처에서 에러가 보이지 않는 문제 방지 —
  // 에러 표시 대상(인라인 에러 id 또는 페이지 상단 배너)으로 스크롤을 이동한다.
  const scrollToError = () => {
    if (typeof document === 'undefined') return;
    requestAnimationFrame(() => {
      document.getElementById('signup-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
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
          <p className="text-[#59615B] mb-6">
            가입 신청이 완료되었습니다.<br />
            관리자 승인 후 이용 가능합니다.
          </p>
          <ul className="mb-8 space-y-2 rounded-sm border border-[#D8D6CE] bg-white/60 p-4 text-left text-xs leading-6 text-[#5F6761]">
            <li>· 제출하신 신청서는 관리자 심사 후 승인됩니다.</li>
            <li>· 승인 완료 후 가입 시 등록한 이메일과 비밀번호로 로그인하실 수 있습니다.</li>
            <li>· 승인 전에는 로그인이 제한되며, 심사 관련 문의는 고객센터(카카오톡·인스타그램)로 가능합니다.</li>
          </ul>
          <Link href="/" className="inline-flex min-h-12 items-center justify-center bg-[#2F3B34] px-6 text-sm font-semibold text-white w-full">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  if (verificationPendingEmail) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#E9E7E0] px-5 py-16">
        <div className="w-full max-w-md border border-[#D1D0C8] bg-[#FAF9F5] p-8 text-center shadow-sm sm:p-10">
          <h1 className="text-2xl font-bold text-[#202521]">이메일 인증을 완료해 주세요</h1>
          <p className="mt-4 text-sm leading-7 text-[#59615B]">
            가입이 완료되었습니다. 입력한 이메일의 인증 링크를 확인한 뒤 로그인해 주세요.
          </p>
          {verificationMessage && <p role="status" className="mt-4 text-sm text-[#2F3B34]">{verificationMessage}</p>}
          <button
            type="button"
            onClick={async () => {
              setVerificationMessage('');
              const response = await requestEmailVerificationByEmail(verificationPendingEmail);
              setVerificationMessage(response.ok ? '인증 메일을 다시 보냈어요. 메일함을 확인해 주세요.' : '잠시 후 다시 시도해 주세요.');
            }}
            className="mt-7 min-h-12 w-full bg-[#2F3B34] px-5 text-sm font-semibold text-white"
          >
            인증 메일 다시 보내기
          </button>
          <Link href="/login" className="mt-5 inline-block text-sm font-semibold text-[#59615B] underline underline-offset-4">로그인으로 이동</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#E9E7E0] px-5 py-16">
      <div className="mx-auto max-w-2xl border border-[#D1D0C8] bg-[#FAF9F5] p-7 sm:p-12">
        <p className="font-editorial text-lg italic text-[#667368]">Join Baekjo Objet</p>
        <h1 className="mt-3 text-4xl font-normal text-[#202521]">회원가입</h1>
        <p className="mt-3 text-sm text-[#59615B]">
          {signupTab === 'user'
            ? '반려생활 정보를 등록하면 더 가까운 기준을 제안할 수 있습니다.'
            : '함께할 파트너 정보를 등록해주세요. 관리자 승인 후 이용 가능합니다.'}
        </p>

        <div className="mt-8 flex border-b border-[#D1D0C8]">
          {[
            { id: 'user', label: '일반 회원' },
            { id: 'partner', label: '입점 업체' },
            { id: 'b2b', label: 'B2B 업체' },
            ...(FEATURES.insurance ? [{ id: 'insurance', label: '보험사' }] : []),
          ].map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => handleTabChange(type.id as SignupTab)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                signupTab === type.id
                  ? 'border-b-2 border-[#2F3B34] text-[#2F3B34]'
                  : 'text-[#59615B] hover:text-[#2F3B34]'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {businessResult === 'duplicate' && (
          <p id="signup-error" className="mt-6 rounded-sm border border-[#E3C9C4] bg-[#FBF1EF] p-3 text-sm text-[#A65348]" role="alert">
            이미 가입된 이메일입니다. 가입하신 계정으로 로그인해 주세요.
          </p>
        )}
        {businessResult === 'error' && (
          <p id="signup-error" className="mt-6 rounded-sm border border-[#E3C9C4] bg-[#FBF1EF] p-3 text-sm text-[#A65348]" role="alert">
            가입 신청 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.
          </p>
        )}

        {signupTab === 'partner' ? (
          <PartnerSignupForm onSuccess={(data) => handleBusinessSuccess('partner', data)} pending={pending} />
        ) : signupTab === 'b2b' ? (
          <B2BSignupForm onSuccess={(data) => handleBusinessSuccess('b2b', data)} pending={pending} />
        ) : signupTab === 'insurance' ? (
          <InsuranceSignupForm onSuccess={(data) => handleBusinessSuccess('insurance', data as Record<string, unknown>)} pending={pending} />
        ) : (
          <>
            <form onSubmit={handleSubmit} className="mt-9 space-y-7">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="이름 *"><input required name="name" value={formData.name} onChange={handleChange} className={fieldClass} /></Field>
                <Field label="연락처 *"><input required type="tel" name="phone" value={formData.phone} onChange={handleChange} className={fieldClass} placeholder="010-0000-0000" /></Field>
              </div>
              <Field label="이메일 *"><input required type="email" name="email" value={formData.email} onChange={handleChange} className={fieldClass} placeholder="name@example.com" /></Field>
              <EmailCheckMessage status={emailStatus} />
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="비밀번호 *"><input required minLength={6} type="password" name="password" value={formData.password} onChange={handleChange} className={fieldClass} /></Field>
                <Field label="비밀번호 확인 *"><input required minLength={6} type="password" name="passwordConfirm" value={formData.passwordConfirm} onChange={handleChange} className={fieldClass} /></Field>
              </div>
              {error && (
                <p id="signup-error" className="sm:col-span-2 rounded-sm border border-[#E3C9C4] bg-[#FBF1EF] p-3 text-sm text-[#A65348]" role="alert">
                  {error}
                  {error.includes('가입된 이메일') && (
                    <>
                      {' '}
                      <Link href="/login" className="font-semibold underline underline-offset-2">로그인하러 가기</Link>
                    </>
                  )}
                </p>
              )}

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

              <div className="space-y-4 border-t border-[#D8D6CE] pt-6">
                <div className="rounded-sm border border-[#D8D6CE] bg-white/55 p-4 text-xs leading-6 text-[#59615B]">
                  회원 식별, 가입/로그인, 맞춤 큐레이션 제공을 위해 이름, 이메일, 비밀번호, 연락처,
                  반려동물 정보와 주요 고민을 수집·이용합니다. 회원정보는 회원 탈퇴 시까지 보관하며,
                  법령상 보존이 필요한 기록은 정해진 기간 동안 분리 보관됩니다.
                </div>
                <label className="flex cursor-pointer items-start gap-3 text-sm text-[#5F6761]">
                  <input required type="checkbox" name="termsAgree" checked={formData.termsAgree} onChange={handleChange} className="mt-0.5 size-4" />
                  <span>
                    <strong>[필수]</strong>{' '}
                    <Link href="/terms" className="font-semibold text-[#2F3B34] underline underline-offset-2">이용약관</Link>
                    에 동의합니다.
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 text-sm text-[#5F6761]">
                  <input required type="checkbox" name="privacyAgree" checked={formData.privacyAgree} onChange={handleChange} className="mt-0.5 size-4" />
                  <span>
                    <strong>[필수]</strong>{' '}
                    <Link href="/privacy" className="font-semibold text-[#2F3B34] underline underline-offset-2">개인정보 수집 및 이용</Link>
                    에 동의합니다.
                  </span>
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
              <p className="mb-3 text-center text-[11px] text-[#59615B]">간편 가입</p>
              {/* 소셜은 첫 로그인 때 자동 가입되므로 로그인과 같은 흐름을 사용한다. */}
              <SocialLoginButtons labels={SIGNUP_SOCIAL_LABELS} />
            </div>
          </>
        )}

        <p className="mt-6 text-center text-xs text-[#59615B]">
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
