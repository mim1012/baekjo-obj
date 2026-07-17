'use client';

import { useState, type FormEvent } from 'react';
import { addPartnerInquiry, type CreatePartnerInquiryInput } from '@/lib/storage';
import type { PartnerInquiry } from '@/types';

const PARTNER_TYPE_OPTIONS: Array<{ value: PartnerInquiry['partnerType']; label: string }> = [
  { value: 'hospital', label: '동물병원' },
  { value: 'funeral', label: '장례식장' },
  { value: 'brand', label: '브랜드' },
  { value: 'petshop', label: '펫샵' },
  { value: 'hotel', label: '호텔' },
  { value: 'etc', label: '기타' },
];

const EMPTY_FORM: CreatePartnerInquiryInput = {
  companyName: '',
  contactPerson: '',
  phone: '',
  email: '',
  partnerType: 'hospital',
  message: '',
};

const INPUT_CLASS =
  'w-full border border-[#D8D6CE] bg-white px-4 py-3 text-sm text-[#2F3B34] placeholder:text-[#9AA09A] focus:border-[#2F3B34] focus:outline-none';

/**
 * B2B 제휴 문의 폼(케어키트 랜딩 #partner 섹션). 데이터는 storage 콘센트(addPartnerInquiry)만
 * 거친다(§4) — 컴포넌트에서 fetch 직접 호출 금지. 성공 시 폼 리셋+성공 메시지,
 * 실패 시 aria-live 오류 텍스트(alert 금지).
 */
export default function PartnerInquiryForm() {
  const [form, setForm] = useState<CreatePartnerInquiryInput>(EMPTY_FORM);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<'idle' | 'success' | 'error'>('idle');

  const setField = <K extends keyof CreatePartnerInquiryInput>(
    key: K,
    value: CreatePartnerInquiryInput[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setResult('idle');
    try {
      await addPartnerInquiry(form);
      setForm(EMPTY_FORM);
      setPrivacyAgreed(false);
      setResult('success');
    } catch {
      setResult('error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 text-left">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-[#2F3B34]">
          업체명
          <input
            type="text"
            required
            maxLength={100}
            value={form.companyName}
            onChange={(e) => setField('companyName', e.target.value)}
            placeholder="예) 백조동물병원"
            className={`mt-2 ${INPUT_CLASS}`}
          />
        </label>
        <label className="block text-sm font-semibold text-[#2F3B34]">
          담당자
          <input
            type="text"
            required
            maxLength={100}
            value={form.contactPerson}
            onChange={(e) => setField('contactPerson', e.target.value)}
            placeholder="담당자 성함"
            className={`mt-2 ${INPUT_CLASS}`}
          />
        </label>
        <label className="block text-sm font-semibold text-[#2F3B34]">
          연락처
          <input
            type="tel"
            required
            maxLength={40}
            value={form.phone}
            onChange={(e) => setField('phone', e.target.value)}
            placeholder="010-0000-0000"
            className={`mt-2 ${INPUT_CLASS}`}
          />
        </label>
        <label className="block text-sm font-semibold text-[#2F3B34]">
          이메일
          <input
            type="email"
            required
            maxLength={200}
            value={form.email}
            onChange={(e) => setField('email', e.target.value)}
            placeholder="contact@example.com"
            className={`mt-2 ${INPUT_CLASS}`}
          />
        </label>
      </div>

      <label className="block text-sm font-semibold text-[#2F3B34]">
        업체 유형
        <select
          required
          value={form.partnerType}
          onChange={(e) => setField('partnerType', e.target.value as PartnerInquiry['partnerType'])}
          className={`mt-2 ${INPUT_CLASS}`}
        >
          {PARTNER_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-semibold text-[#2F3B34]">
        문의 내용
        <textarea
          required
          maxLength={2000}
          rows={5}
          value={form.message}
          onChange={(e) => setField('message', e.target.value)}
          placeholder="희망하시는 협력 형태와 문의 내용을 남겨주세요."
          className={`mt-2 resize-y ${INPUT_CLASS}`}
        />
      </label>

      <div className="border border-[#D8D6CE] bg-[#FAF9F5] p-4">
        <label className="flex items-start gap-3 text-sm text-[#4F5751]">
          <input
            type="checkbox"
            required
            checked={privacyAgreed}
            onChange={(e) => setPrivacyAgreed(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-[#2F3B34]"
          />
          <span>
            <span className="font-semibold text-[#2F3B34]">개인정보 수집·이용 동의 (필수)</span>
            <span className="mt-1 block text-xs leading-5 text-[#6F756F]">
              제휴 문의 응대 목적으로 담당자명·연락처·이메일을 수집하며, 상담 종료 후 1년간
              보관 후 파기합니다. 동의를 거부할 수 있으나 거부 시 제휴 문의 접수가 제한됩니다.
            </span>
          </span>
        </label>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex w-full items-center justify-center bg-[#2F3B34] px-6 py-4 font-semibold text-white shadow-md transition hover:-translate-y-1 hover:bg-[#3D4A42] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? '접수 중…' : '제휴 문의 제출하기'}
      </button>

      <p aria-live="polite" className="min-h-5 text-center text-sm">
        {result === 'success' && (
          <span className="text-[#2F3B34]">
            제휴 문의가 접수되었습니다. 담당자가 검토 후 연락드리겠습니다.
          </span>
        )}
        {result === 'error' && (
          <span className="text-[#8A5A44]">
            접수에 실패했습니다. 잠시 후 다시 시도해 주세요.
          </span>
        )}
      </p>
    </form>
  );
}
