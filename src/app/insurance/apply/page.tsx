'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveInsuranceApplication } from '@/lib/storage';

const coverageOptions = [
  '수술/입원비 집중 보장',
  '통원비 중심',
  '슬개골/피부/구강 특약 희망',
  '가성비 중심',
];

export default function InsuranceApplyPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    petName: '',
    petType: '강아지',
    breed: '',
    petAge: '',
    hasCurrentInsurance: 'no',
    currentInsuranceName: '',
    medicalHistory: '',
    targetPremium: '',
    neutered: 'yes',
    gender: 'male',
    coverageNeeds: [] as string[],
    message: '',
    privacyAgree: false,
    thirdPartyAgree: false,
  });

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = event.target;
    const checked = event.target instanceof HTMLInputElement ? event.target.checked : false;
    setFormData((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  const toggleCoverage = (coverage: string) => {
    setFormData((current) => ({
      ...current,
      coverageNeeds: current.coverageNeeds.includes(coverage)
        ? current.coverageNeeds.filter((item) => item !== coverage)
        : [...current.coverageNeeds, coverage],
    }));
  };

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.privacyAgree || !formData.thirdPartyAgree || submitting) return;

    // id/createdAt/status/member_id 는 서버(POST /api/insurance)가 정한다 — 콘센트만 거친다(§4).
    setSubmitting(true);
    try {
      await saveInsuranceApplication({
        name: formData.name,
        phone: formData.phone,
        petName: formData.petName,
        petType: formData.petType,
        breed: formData.breed,
        petBreed: formData.breed,
        petAge: Number(formData.petAge) || 0,
        coverageNeeds: formData.coverageNeeds,
        message: formData.message,
        concerns: formData.message,
        privacyAgree: formData.privacyAgree,
        thirdPartyAgree: formData.thirdPartyAgree,
        hasCurrentInsurance: formData.hasCurrentInsurance === 'yes',
        currentInsuranceName: formData.currentInsuranceName,
        medicalHistory: formData.medicalHistory,
        targetPremium: formData.targetPremium,
        neutered: formData.neutered === 'yes',
        gender: formData.gender,
        ownerName: formData.name,
      });
    } catch {
      setSubmitting(false);
      alert('신청 접수에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    router.push('/insurance/complete');
  };

  const fieldClass = 'w-full border border-[#C9C8C0] bg-[#FAF9F5] px-4 py-3.5 text-sm focus:border-[#2F3B34]';

  return (
    <div className="min-h-dvh bg-[#F4F2EC] py-16">
      <div className="mx-auto max-w-3xl px-5">
        <div className="mb-10 text-center">
          <p className="font-editorial text-lg italic text-[#667368]">Free insurance review</p>
          <h1 className="mt-3 text-4xl font-normal text-[#202521]">보험 분석 신청</h1>
          <p className="mt-4 text-sm leading-7 text-[#747B75]">가입 권유 없이 현재 보장과 필요한 조건을 무료로 분석합니다.</p>
        </div>

        <form onSubmit={handleSubmit} className="border border-[#D8D6CE] bg-[#FAF9F5] p-6 sm:p-10">
          <div className="space-y-10">
            <section>
              <h2 className="border-b border-[#D8D6CE] pb-3 text-xl font-normal text-[#202521]">보호자 정보</h2>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <Field label="성명 *"><input required name="name" value={formData.name} onChange={handleChange} className={fieldClass} placeholder="성명을 입력해 주세요" /></Field>
                <Field label="연락처 *"><input required type="tel" name="phone" value={formData.phone} onChange={handleChange} className={fieldClass} placeholder="010-0000-0000" /></Field>
              </div>
            </section>

            <section>
              <h2 className="border-b border-[#D8D6CE] pb-3 text-xl font-normal text-[#202521]">반려동물 정보</h2>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <Field label="아이 이름 *"><input required name="petName" value={formData.petName} onChange={handleChange} className={fieldClass} placeholder="아이 이름" /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="종류 *">
                    <select name="petType" value={formData.petType} onChange={handleChange} className={fieldClass}>
                      <option value="강아지">강아지</option>
                      <option value="고양이">고양이</option>
                    </select>
                  </Field>
                  <Field label="성별 *">
                    <select name="gender" value={formData.gender} onChange={handleChange} className={fieldClass}>
                      <option value="male">남아</option>
                      <option value="female">여아</option>
                    </select>
                  </Field>
                </div>
                <Field label="품종 *"><input required name="breed" value={formData.breed} onChange={handleChange} className={fieldClass} placeholder="예: 말티즈, 코리안 숏헤어" /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="아이의 나이 *"><input required min="0" max="30" type="number" name="petAge" value={formData.petAge} onChange={handleChange} className={fieldClass} placeholder="나이" /></Field>
                  <Field label="중성화 여부 *">
                    <select name="neutered" value={formData.neutered} onChange={handleChange} className={fieldClass}>
                      <option value="yes">완료</option>
                      <option value="no">미완료</option>
                    </select>
                  </Field>
                </div>
              </div>
              <div className="mt-5">
                <Field label="병력 특이사항">
                  <input name="medicalHistory" value={formData.medicalHistory} onChange={handleChange} className={fieldClass} placeholder="최근 병원 진료 기록이나 지병이 있다면 적어주세요 (선택)" />
                </Field>
              </div>
            </section>

            <section>
              <h2 className="border-b border-[#D8D6CE] pb-3 text-xl font-normal text-[#202521]">보험 및 관심 보장</h2>
              <div className="mt-6">
                <p className="mb-3 text-sm font-medium text-[#4F5751]">현재 가입된 펫보험이 있나요?</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['yes', '네, 있습니다'],
                    ['no', '아니요, 없습니다'],
                  ].map(([value, label]) => (
                    <label key={value} className={`flex min-h-12 cursor-pointer items-center justify-center border px-4 text-sm ${formData.hasCurrentInsurance === value ? 'border-[#2F3B34] bg-[#E5E9E4] font-semibold text-[#2F3B34]' : 'border-[#D8D6CE] text-[#6F756F]'}`}>
                      <input className="sr-only" type="radio" name="hasCurrentInsurance" value={value} checked={formData.hasCurrentInsurance === value} onChange={handleChange} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              {formData.hasCurrentInsurance === 'yes' && (
                <div className="mt-5">
                  <Field label="현재 보험사 / 상품명"><input name="currentInsuranceName" value={formData.currentInsuranceName} onChange={handleChange} className={fieldClass} placeholder="선택 입력" /></Field>
                </div>
              )}

              <div className="mt-7">
                <p className="mb-3 text-sm font-medium text-[#4F5751]">관심 보장 항목 *</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {coverageOptions.map((coverage) => {
                    const selected = formData.coverageNeeds.includes(coverage);
                    return (
                      <button key={coverage} type="button" onClick={() => toggleCoverage(coverage)} className={`min-h-12 border px-4 text-left text-sm ${selected ? 'border-[#2F3B34] bg-[#E5E9E4] font-semibold text-[#2F3B34]' : 'border-[#D8D6CE] text-[#6F756F]'}`}>
                        {selected ? '✓ ' : ''}{coverage}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-7">
                <Field label="희망 월 납입금 (선택)">
                  <select name="targetPremium" value={formData.targetPremium} onChange={handleChange} className={fieldClass}>
                    <option value="">선택해주세요</option>
                    <option value="3만원 미만">3만원 미만</option>
                    <option value="3~5만원">3~5만원</option>
                    <option value="5만원 이상">5만원 이상</option>
                  </select>
                </Field>
              </div>

              <div className="mt-7">
                <Field label="문의내용">
                  <textarea name="message" value={formData.message} onChange={handleChange} rows={5} className={fieldClass} placeholder="현재 고민과 확인하고 싶은 내용을 적어주세요." />
                </Field>
              </div>
            </section>

            <section className="space-y-3 border-t border-[#D8D6CE] pt-7">
              <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-[#5F6761]">
                <input required type="checkbox" name="privacyAgree" checked={formData.privacyAgree} onChange={handleChange} className="mt-1 size-4" />
                <span><strong>[필수]</strong> 개인정보 수집 및 이용에 동의합니다.</span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-[#5F6761]">
                <input required type="checkbox" name="thirdPartyAgree" checked={formData.thirdPartyAgree} onChange={handleChange} className="mt-1 size-4" />
                <span><strong>[필수]</strong> 분석 상담을 위한 개인정보 제3자 제공에 동의합니다.</span>
              </label>
            </section>
          </div>

          <button type="submit" disabled={formData.coverageNeeds.length === 0 || submitting} className="mt-10 min-h-14 w-full bg-[#2F3B34] px-6 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
            {submitting ? '신청 접수 중…' : '무료 분석 신청하기'}
          </button>
        </form>
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
