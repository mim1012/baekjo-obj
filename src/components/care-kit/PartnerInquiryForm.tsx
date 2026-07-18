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

const FIELD_CLASS =
  'w-full border-b border-[#E7E0D5] bg-transparent pb-3 pt-3 text-[15px] text-[#17211D] placeholder:text-[#6F766F]/45 transition-colors duration-300 focus:border-[#A8742E] focus:outline-none';

const LABEL_CLASS = 'block text-[12px] font-bold tracking-wide text-[#6F766F]';

/**
 * B2B 제휴 문의 폼(케어키트 랜딩 #partner 섹션). 데이터는 storage 콘센트(addPartnerInquiry)만
 * 거친다(§4) — 컴포넌트에서 fetch 직접 호출 금지. 성공 시 폼 리셋+성공 메시지,
 * 실패 시 aria-live 오류 텍스트(alert 금지). 표현은 dad 에디토리얼 폼 스타일 기준.
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
    <form onSubmit={handleSubmit} className="space-y-6 text-left" aria-label="B2B 파트너십 문의 양식">
      <div>
        <label htmlFor="partner-company" className={LABEL_CLASS}>기관 / 업체명</label>
        <input
          id="partner-company"
          name="companyName"
          type="text"
          required
          maxLength={100}
          autoComplete="organization"
          value={form.companyName}
          onChange={(e) => setField('companyName', e.target.value)}
          placeholder="상호명 입력"
          className={FIELD_CLASS}
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="partner-contact-name" className={LABEL_CLASS}>담당자 성함</label>
          <input
            id="partner-contact-name"
            name="contactPerson"
            type="text"
            required
            maxLength={100}
            autoComplete="name"
            value={form.contactPerson}
            onChange={(e) => setField('contactPerson', e.target.value)}
            placeholder="홍길동"
            className={FIELD_CLASS}
          />
        </div>
        <div>
          <label htmlFor="partner-contact-phone" className={LABEL_CLASS}>연락처</label>
          <input
            id="partner-contact-phone"
            name="phone"
            type="tel"
            required
            maxLength={40}
            autoComplete="tel"
            inputMode="tel"
            value={form.phone}
            onChange={(e) => setField('phone', e.target.value)}
            placeholder="010-0000-0000"
            className={FIELD_CLASS}
          />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="partner-email" className={LABEL_CLASS}>이메일</label>
          <input
            id="partner-email"
            name="email"
            type="email"
            required
            maxLength={200}
            autoComplete="email"
            value={form.email}
            onChange={(e) => setField('email', e.target.value)}
            placeholder="contact@example.com"
            className={FIELD_CLASS}
          />
        </div>
        <div>
          <label htmlFor="partner-type" className={LABEL_CLASS}>업체 유형</label>
          <select
            id="partner-type"
            name="partnerType"
            required
            value={form.partnerType}
            onChange={(e) => setField('partnerType', e.target.value as PartnerInquiry['partnerType'])}
            className={FIELD_CLASS}
          >
            {PARTNER_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="partner-inquiry" className={LABEL_CLASS}>문의 내용</label>
        <textarea
          id="partner-inquiry"
          name="message"
          required
          maxLength={2000}
          rows={4}
          value={form.message}
          onChange={(e) => setField('message', e.target.value)}
          placeholder="제휴 관련 문의하실 내용을 자유롭게 적어주세요."
          className={`${FIELD_CLASS} min-h-32 resize-y leading-[1.7]`}
        />
      </div>

      <div className="flex items-start gap-3 rounded-[16px] bg-[#FAF8F3] p-4">
        <input
          type="checkbox"
          id="partner-agree"
          name="agree"
          required
          checked={privacyAgreed}
          onChange={(e) => setPrivacyAgreed(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-[#17211D] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A8742E] focus-visible:ring-offset-2"
        />
        <label htmlFor="partner-agree" className="text-[13px] leading-[1.7] text-[#6F766F]">
          <span className="font-bold text-[#17211D]">개인정보 수집 및 이용에 동의합니다. (필수)</span>
          <span className="mt-1 block text-[12px] leading-[1.7]">
            제휴 문의 응대 목적으로 담당자명·연락처·이메일을 수집하며, 상담 종료 후 1년간
            보관 후 파기합니다. 동의를 거부할 수 있으나 거부 시 제휴 문의 접수가 제한됩니다.
          </span>
        </label>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="flex min-h-14 w-full items-center justify-center rounded-full bg-[#17211D] px-6 text-[15px] font-bold text-[#FBFAF7] transition-all duration-500 ease-out hover:bg-[#202521] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A8742E] focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? '접수 중…' : '제휴 문의 제출하기'}
      </button>

      <p aria-live="polite" className="min-h-5 text-center text-[14px]">
        {result === 'success' && (
          <span className="text-[#17211D]">
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
