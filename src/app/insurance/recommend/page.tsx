'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowLeft, Check, HeartPulse, ShieldCheck, Activity, ChevronRight } from 'lucide-react';
import BrandMark from '@/components/common/BrandMark';

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

  const toggleConcern = (c: string) => {
    setFormData(prev => ({
      ...prev,
      concerns: prev.concerns.includes(c) 
        ? prev.concerns.filter(i => i !== c)
        : [...prev.concerns, c]
    }));
  };

  return (
    <div className="min-h-dvh bg-[#FBFAF7] flex flex-col">
      {/* Header */}
      <header className="h-[72px] bg-white border-b border-[rgba(15,23,42,0.06)] flex items-center px-5 sm:px-10 justify-between shrink-0">
        <Link href="/" className="text-[#17211D]">
          <BrandMark />
        </Link>
        <button onClick={() => window.history.back()} className="text-sm font-semibold text-[#64748B] hover:text-[#17211D]">
          나가기
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-5 sm:p-10 relative">
        <div className="w-full max-w-xl">
          
          {/* Step 1: Consent */}
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <span className="inline-flex items-center justify-center size-12 rounded-full bg-[#F4EFE8] mb-6">
                <ShieldCheck className="size-6 text-[#17211D]" />
              </span>
              <h1 className="text-3xl font-editorial text-[#17211D] tracking-tight mb-4">실시간 맞춤 보험 분석</h1>
              <p className="text-[#64748B] leading-7 mb-8">
                아이의 건강 상태와 나이를 바탕으로, 시중 펫보험 중 가장 유리한 특약을 실시간으로 매칭해 드립니다.<br/>
                <span className="text-xs text-slate-400 mt-2 block">*본 추천은 가상 데이터를 기반으로 한 데모(Mock UI) 기능입니다.</span>
              </p>

              <div className="bg-white rounded-[18px] border border-[rgba(15,23,42,0.08)] p-6 mb-8 shadow-sm">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center size-6 rounded-md border border-slate-300 bg-white group-hover:border-[#17211D] mt-0.5 shrink-0 transition-colors">
                    <Check className="size-4 text-transparent transition-colors" />
                    {/* Native checkbox logic is simulated here, but we'll just allow direct next for demo */}
                  </div>
                  <div>
                    <p className="font-semibold text-[#17211D] text-sm">(필수) 개인정보 수집 및 이용 동의</p>
                    <p className="text-xs text-slate-400 mt-1">분석을 위해 아이의 나이와 품종 정보를 임시 수집합니다.</p>
                  </div>
                </label>
              </div>

              <button onClick={handleNext} className="w-full py-4 bg-[#17211D] text-white rounded-[16px] font-semibold text-lg hover:bg-[#334155] transition-all shadow-md flex items-center justify-center gap-2">
                시작하기 <ArrowRight className="size-5" />
              </button>
            </div>
          )}

          {/* Step 2: Conditions */}
          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <button onClick={handlePrev} className="flex items-center gap-1 text-sm text-[#64748B] hover:text-[#17211D] mb-8 transition-colors">
                <ArrowLeft className="size-4" /> 이전으로
              </button>
              
              <h1 className="text-3xl font-editorial text-[#17211D] tracking-tight mb-2">아이 정보를 알려주세요</h1>
              <p className="text-[#64748B] mb-8">품종과 나이에 따라 추천 보장 비율이 달라집니다.</p>

              <div className="space-y-6">
                <div>
                  <p className="text-sm font-semibold text-[#17211D] mb-3">반려동물 종류</p>
                  <div className="grid grid-cols-2 gap-3">
                    {['강아지', '고양이'].map(type => (
                      <button
                        key={type}
                        onClick={() => setFormData({...formData, petType: type})}
                        className={`py-3 rounded-[12px] border font-medium text-sm transition-all ${formData.petType === type ? 'border-[#17211D] bg-[#17211D] text-white shadow-md' : 'border-[rgba(15,23,42,0.12)] bg-white text-[#334155] hover:border-[#17211D]'}`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-[#17211D] mb-3">걱정되는 건강 고민 (다중 선택)</p>
                  <div className="grid grid-cols-2 gap-3">
                    {['슬개골 탈구', '피부 질환', '구강/치과', '소화기 질환'].map(concern => (
                      <button
                        key={concern}
                        onClick={() => toggleConcern(concern)}
                        className={`py-3 px-4 rounded-[12px] border text-sm text-left transition-all ${formData.concerns.includes(concern) ? 'border-[#17211D] bg-[#FBFAF7] font-semibold text-[#17211D]' : 'border-[rgba(15,23,42,0.12)] bg-white text-[#64748B] hover:border-[#17211D]'}`}
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
                className="w-full mt-10 py-4 bg-[#17211D] text-white rounded-[16px] font-semibold text-lg hover:bg-[#334155] transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2"
              >
                결과 확인하기 <ArrowRight className="size-5" />
              </button>
            </div>
          )}

          {/* Step 3: Loading / Result Simulation */}
          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-center py-20"
                 ref={(el) => {
                   if (el) setTimeout(handleNext, 2500);
                 }}
            >
              <div className="inline-flex items-center justify-center size-16 rounded-full bg-[#17211D] mb-6 animate-pulse shadow-xl shadow-slate-300">
                <Activity className="size-8 text-white" />
              </div>
              <h2 className="text-2xl font-editorial text-[#17211D] tracking-tight mb-2">최적의 보장 조건을 탐색 중입니다...</h2>
              <p className="text-[#64748B]">국내 5개 손해보험사 약관을 비교하고 있습니다.</p>
            </div>
          )}

          {/* Step 4: Recommendation Result & CTA */}
          {step === 4 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-3 mb-6">
                <span className="flex items-center justify-center size-10 rounded-full bg-slate-800 text-white shadow-md">
                  <Check className="size-5" />
                </span>
                <h1 className="text-2xl sm:text-3xl font-editorial text-[#17211D] tracking-tight">분석이 완료되었습니다</h1>
              </div>

              <div className="bg-white rounded-[18px] border border-[rgba(15,23,42,0.08)] p-6 sm:p-8 mb-6 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <HeartPulse className="size-32" />
                </div>
                <div className="relative z-10">
                  <div className="inline-block px-3 py-1 bg-[#F4EFE8] text-[#17211D] rounded-sm text-xs font-bold mb-4">가장 유리한 플랜</div>
                  <h2 className="text-2xl font-bold text-[#17211D] mb-2 tracking-tight">메리츠 펫퍼민트 안심 특약형</h2>
                  <p className="text-[#64748B] text-sm leading-6 mb-6">
                    {formData.concerns.length > 0 ? formData.concerns.join(', ') + ' 보장에 가장 강점이 있는 플랜입니다.' : '전반적인 통원/수술비 커버에 최적화되어 있습니다.'}
                  </p>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-slate-100">
                      <span className="text-sm font-medium text-slate-500">입원/통원 치료비</span>
                      <span className="text-sm font-bold text-[#17211D]">70% 보장</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-slate-100">
                      <span className="text-sm font-medium text-slate-500">슬개골 탈구 특약</span>
                      <span className="text-sm font-bold text-[#17211D]">기본 포함</span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-sm font-medium text-slate-500">예상 월 납입금</span>
                      <span className="text-lg font-editorial font-bold text-[#17211D]">약 34,000원</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 mb-8">
                <button onClick={() => alert('가입 페이지로 이동합니다 (가상 구현)')} className="w-full py-4 bg-[#17211D] text-white rounded-[16px] font-semibold text-base hover:bg-[#334155] transition-all shadow-md flex items-center justify-center gap-2">
                  이 플랜으로 가입하기
                </button>
                <Link href="/insurance/apply" className="w-full py-4 bg-white border border-slate-200 text-[#17211D] rounded-[16px] font-semibold text-base hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                  전문가 상세 상담 신청
                </Link>
              </div>

              <p className="text-xs text-center text-slate-400">
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
