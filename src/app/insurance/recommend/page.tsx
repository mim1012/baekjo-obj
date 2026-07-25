'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowLeft, Check, HeartPulse, ShieldCheck, Activity } from 'lucide-react';

export default function InsuranceRecommendFlow() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    petType: '',
    petAge: '',
    breed: '',
    concerns: [] as string[]
  });

  const handleNext = () => setStep(s => Math.min(s + 1, 4));
  const handlePrev = () => setStep(s => Math.max(s - 1, 1));

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [step]);

  const toggleConcern = (c: string) => {
    setFormData(prev => ({
      ...prev,
      concerns: prev.concerns.includes(c) 
        ? prev.concerns.filter(i => i !== c)
        : [...prev.concerns, c]
    }));
  };

  return (
    <div className="min-h-dvh bg-[#FBFAF7] bg-noise">
      <main className="site-container flex min-h-[calc(100dvh-64px)] flex-col items-center py-8 sm:py-12">
        <div className="w-full max-w-xl">
          <div className="mb-7 flex items-center justify-between border-b border-[#E7E0D5] pb-4">
            <div>
              <p className="font-editorial text-sm italic text-[#A8742E]">Pet insurance analysis</p>
              <p className="mt-1 text-xs font-semibold text-[#6F766F]">펫보험 맞춤 분석</p>
            </div>
            <button onClick={() => window.history.back()} className="text-xs font-semibold text-[#6F766F] transition-colors hover:text-[#17211D]">
              나가기
            </button>
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between text-xs font-semibold text-[#6F766F]">
              <span>분석 단계</span>
              <span className="tabular-nums text-[#A8742E]">0{step} / 04</span>
            </div>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-[#E7E0D5]">
              <div className="h-full rounded-full bg-[#17211D] transition-all duration-500" style={{ width: `${(step / 4) * 100}%` }} />
            </div>
          </div>
          
          {/* Step 1: Consent */}
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <span className="mb-4 inline-flex size-10 items-center justify-center rounded-2xl bg-[#F3EEE6]">
                <ShieldCheck className="size-5 text-[#A8742E]" />
              </span>
              <h1 className="mb-3 text-2xl font-bold leading-[1.2] tracking-tight text-[#17211D] sm:text-3xl">실시간 맞춤 보험 분석</h1>
              <p className="mb-5 text-sm leading-[1.8] text-[#6F766F] break-keep">
                아이의 건강 상태와 나이를 바탕으로, 시중 펫보험 중 가장 유리한 특약을 실시간으로 매칭해 드립니다.<br/>
                <span className="mt-2 block text-xs text-[#A7AAA4]">*본 추천은 가상 데이터를 기반으로 한 데모(Mock UI) 기능입니다.</span>
              </p>

              <div className="mb-6 rounded-2xl border border-[#E7E0D5] bg-white p-4 shadow-[0_8px_20px_rgba(23,33,29,0.04)]">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border border-[#D8D6CE] bg-white transition-colors group-hover:border-[#17211D]">
                    <Check className="size-4 text-transparent transition-colors" />
                    {/* Native checkbox logic is simulated here, but we'll just allow direct next for demo */}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#17211D]">(필수) 개인정보 수집 및 이용 동의</p>
                    <p className="mt-1 text-xs leading-5 text-[#A7AAA4]">분석을 위해 아이의 나이와 품종 정보를 임시 수집합니다.</p>
                  </div>
                </label>
              </div>

              <button onClick={handleNext} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#17211D] py-3.5 text-base font-semibold text-white shadow-md transition-all hover:bg-[#2F3B34]">
                시작하기 <ArrowRight className="size-5" />
              </button>
            </div>
          )}

          {/* Step 2: Conditions */}
          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <button onClick={handlePrev} className="mb-5 flex items-center gap-1 text-xs font-semibold text-[#6F766F] transition-colors hover:text-[#17211D]">
                <ArrowLeft className="size-4" /> 이전으로
              </button>
              
              <h1 className="mb-2 text-2xl font-bold tracking-tight text-[#17211D] sm:text-3xl">아이 정보를 알려주세요</h1>
              <p className="mb-6 text-sm text-[#6F766F]">품종과 나이에 따라 추천 보장 비율이 달라집니다.</p>

              <div className="space-y-5">
                <div>
                  <p className="mb-2 text-sm font-semibold text-[#17211D]">반려동물 종류</p>
                  <div className="grid grid-cols-2 gap-3">
                    {['강아지', '고양이'].map(type => (
                      <button
                        key={type}
                        onClick={() => setFormData({...formData, petType: type})}
                        className={`rounded-xl border py-3 text-sm font-medium transition-all ${formData.petType === type ? 'border-[#17211D] bg-[#17211D] text-white shadow-md' : 'border-[#E7E0D5] bg-white text-[#334155] hover:border-[#17211D]'}`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-semibold text-[#17211D]">걱정되는 건강 고민 (다중 선택)</p>
                  <div className="grid grid-cols-2 gap-3">
                    {['슬개골 탈구', '피부 질환', '구강/치과', '소화기 질환'].map(concern => (
                      <button
                        key={concern}
                        onClick={() => toggleConcern(concern)}
                        className={`rounded-xl border px-4 py-3 text-left text-sm transition-all ${formData.concerns.includes(concern) ? 'border-[#17211D] bg-[#F3EEE6] font-semibold text-[#17211D]' : 'border-[#E7E0D5] bg-white text-[#6F766F] hover:border-[#17211D]'}`}
                      >
                        {formData.concerns.includes(concern) ? '✓ ' : ''}{concern}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button 
                onClick={handleNext} 
                disabled={!formData.petType}
                className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-[#17211D] py-3.5 text-base font-semibold text-white shadow-md transition-all hover:bg-[#2F3B34] disabled:cursor-not-allowed disabled:opacity-30"
              >
                결과 확인하기 <ArrowRight className="size-5" />
              </button>
            </div>
          )}

          {/* Step 3: Loading / Result Simulation */}
          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 py-10 text-center duration-500"
                 ref={(el) => {
                   if (el) setTimeout(handleNext, 2500);
                 }}
            >
              <div className="mb-5 inline-flex size-14 animate-pulse items-center justify-center rounded-full bg-[#17211D] shadow-xl shadow-[#D8D6CE]">
                <Activity className="size-8 text-white" />
              </div>
              <h2 className="mb-2 text-xl font-bold tracking-tight text-[#17211D]">최적의 보장 조건을 탐색 중입니다...</h2>
              <p className="text-sm text-[#6F766F]">국내 5개 손해보험사 약관을 비교하고 있습니다.</p>
            </div>
          )}

          {/* Step 4: Recommendation Result & CTA */}
          {step === 4 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-full bg-[#17211D] text-white shadow-md">
                  <Check className="size-5" />
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-[#17211D] sm:text-3xl">분석이 완료되었습니다</h1>
              </div>

              <div className="relative mb-5 overflow-hidden rounded-2xl border border-[#E7E0D5] bg-white p-5 shadow-[0_8px_20px_rgba(23,33,29,0.04)] sm:p-6">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <HeartPulse className="size-32" />
                </div>
                <div className="relative z-10">
                  <div className="mb-3 inline-block rounded-full bg-[#F3EEE6] px-3 py-1 text-xs font-bold text-[#17211D]">가장 유리한 플랜</div>
                  <h2 className="mb-2 text-xl font-bold tracking-tight text-[#17211D]">메리츠 펫퍼민트 안심 특약형</h2>
                  <p className="mb-5 text-sm leading-6 text-[#6F766F]">
                    {formData.concerns.length > 0 ? formData.concerns.join(', ') + ' 보장에 가장 강점이 있는 플랜입니다.' : '전반적인 통원/수술비 커버에 최적화되어 있습니다.'}
                  </p>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-[#E7E0D5] py-3">
                      <span className="text-sm font-medium text-[#6F766F]">입원/통원 치료비</span>
                      <span className="text-sm font-bold text-[#17211D]">70% 보장</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-[#E7E0D5] py-3">
                      <span className="text-sm font-medium text-[#6F766F]">슬개골 탈구 특약</span>
                      <span className="text-sm font-bold text-[#17211D]">기본 포함</span>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <span className="text-sm font-medium text-[#6F766F]">예상 월 납입금</span>
                      <span className="font-editorial text-lg font-bold text-[#17211D]">약 34,000원</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-7 grid gap-3 sm:grid-cols-2">
                <button onClick={() => alert('가입 페이지로 이동합니다 (가상 구현)')} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#17211D] py-3.5 text-base font-semibold text-white shadow-md transition-all hover:bg-[#2F3B34]">
                  이 플랜으로 가입하기
                </button>
                <Link href="/insurance/apply" className="flex w-full items-center justify-center gap-2 rounded-full border border-[#D8D6CE] bg-white py-3.5 text-base font-semibold text-[#17211D] transition-all hover:bg-[#F3EEE6]">
                  전문가 상세 상담 신청
                </Link>
              </div>

              <p className="text-center text-xs text-[#A7AAA4]">
                위 결과는 입력하신 조건을 바탕으로 한 가상 데이터입니다.<br/>
                실제 가입 시 심사 결과에 따라 조건이 변경될 수 있습니다.
              </p>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
