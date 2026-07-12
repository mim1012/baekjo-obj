'use client';

import { useState, useEffect } from 'react';

const fieldClass = 'w-full border border-[#C9C8C0] px-4 py-3.5 text-sm focus:border-[#2F3B34] bg-white';
const textareaClass = 'w-full border border-[#C9C8C0] px-4 py-3.5 text-sm focus:border-[#2F3B34] bg-white resize-y min-h-24';

const initialData = {
  // 1. 기본 정보
  name: '',
  insuranceCompany: '',
  insuranceRegNumber: '',
  contact: '',
  email: '',
  password: '',
  passwordConfirm: '',
  activityArea: '',
  specialty: '',

  // 9. 개인정보 동의
  privacyAgreement: false,
};

export interface InsuranceFormData {
  name?: string;
  insuranceCompany?: string;
  insuranceRegNumber?: string;
  contact?: string;
  email?: string;
  password?: string;
  passwordConfirm?: string;
  activityArea?: string;
  specialty?: string;
  privacyAgreement?: boolean;
  attachedFiles?: string[];
}

export default function InsuranceSignupForm({ onSuccess, onFormChange }: { onSuccess: (data: InsuranceFormData) => void, onFormChange?: (data: InsuranceFormData) => void }) {
  const [formData, setFormData] = useState(initialData);

  // 임시저장 데이터 불러오기
  useEffect(() => {
    const saved = localStorage.getItem('insurance_signup_draft');
    if (saved) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFormData(JSON.parse(saved));
      } catch {
        // 저장된 임시데이터가 손상된 경우 조용히 무시하고 초기값을 유지한다.
      }
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = e.target instanceof HTMLInputElement && type === 'checkbox' ? e.target.checked : false;
    const newData = {
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    };
    setFormData(newData);
    if (onFormChange) {
      onFormChange(newData);
    }
  };

  const handleSaveDraft = () => {
    // 비밀번호는 평문으로 localStorage에 남기지 않는다.
    const draft: Record<string, unknown> = { ...formData };
    delete draft.password;
    delete draft.passwordConfirm;
    localStorage.setItem('insurance_signup_draft', JSON.stringify(draft));
    alert('임시저장 되었습니다.');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.passwordConfirm) {
      alert('비밀번호가 서로 일치하지 않습니다.');
      return;
    }
    if (!formData.privacyAgreement) {
      alert('개인정보 수집 및 이용 동의는 필수입니다.');
      return;
    }

    // 파일 업로드는 mock 처리
    const fileInput = document.getElementById('insuranceFiles') as HTMLInputElement;
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      alert('인증 자료(서류)를 1개 이상 업로드해주세요.');
      return;
    }

    const attachedFiles = Array.from(fileInput.files).map(f => f.name);

    localStorage.removeItem('insurance_signup_draft');
    onSuccess({ ...formData, attachedFiles });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-9 space-y-12">
      {/* 1. 입력 항목 */}
      <section className="space-y-5">
        <h2 className="text-xl font-bold text-[#202521] border-b border-[#D1D0C8] pb-3">1. 기본 정보</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="성명 *"><input required name="name" value={formData.name} onChange={handleChange} className={fieldClass} /></Field>
          <Field label="연락처 *"><input required name="contact" value={formData.contact} onChange={handleChange} className={fieldClass} placeholder="010-0000-0000" /></Field>
          <Field label="이메일 *"><input required type="email" name="email" value={formData.email} onChange={handleChange} className={fieldClass} placeholder="name@example.com" /></Field>
          <Field label="소속 보험회사 또는 GA *"><input required name="insuranceCompany" value={formData.insuranceCompany} onChange={handleChange} className={fieldClass} /></Field>
          <Field label="보험설계사 등록번호 *"><input required name="insuranceRegNumber" value={formData.insuranceRegNumber} onChange={handleChange} className={fieldClass} /></Field>
          <Field label="비밀번호 *"><input required minLength={6} type="password" name="password" value={formData.password} onChange={handleChange} className={fieldClass} /></Field>
          <Field label="비밀번호 확인 *"><input required minLength={6} type="password" name="passwordConfirm" value={formData.passwordConfirm} onChange={handleChange} className={fieldClass} /></Field>
          <Field label="활동 지역 (선택)"><input name="activityArea" value={formData.activityArea} onChange={handleChange} className={fieldClass} placeholder="예: 서울, 경기" /></Field>
          <Field label="전문 분야 (선택)"><input name="specialty" value={formData.specialty} onChange={handleChange} className={fieldClass} placeholder="예: 펫보험, 손해보험" /></Field>
        </div>
      </section>

      {/* 2. 첨부파일 */}
      <section className="space-y-5">
        <h2 className="text-xl font-bold text-[#202521] border-b border-[#D1D0C8] pb-3">2. 인증 자료 첨부 (필수)</h2>
        <p className="text-sm text-[#747B75] mb-2">아래 서류 중 1개 이상 업로드해주세요.</p>
        <ul className="text-sm text-[#5F6761] list-disc list-inside mb-4 bg-white p-4 border border-[#D1D0C8]">
          <li>보험설계사 등록증</li>
          <li>보험설계사 위촉확인서</li>
          <li>보험회사 위촉 확인서</li>
          <li>GA 위촉(재직) 확인서</li>
          <li>기타 보험설계사 자격을 확인할 수 있는 서류</li>
        </ul>
        <div className="mt-4">
          <input id="insuranceFiles" type="file" multiple className={fieldClass} accept=".pdf,.jpg,.jpeg,.png" required />
          <p className="text-xs text-[#8B928C] mt-2">* 다중 파일 업로드 지원. 허용 파일 형식: PDF, JPG, JPEG, PNG (최대 20MB)</p>
        </div>
      </section>

      {/* 9. 개인정보 및 자료 활용 동의 */}
      <section className="space-y-5 border-t border-[#D1D0C8] pt-6">
        <h2 className="text-xl font-bold text-[#202521] mb-2">3. 개인정보 수집 및 이용 동의</h2>
        <div className="bg-white p-4 border border-[#D1D0C8] text-sm text-[#5F6761] mb-3">
          제출한 자료는 백조 오브제의 보험설계사 자격 확인 및 승인 절차를 위한 용도로만 활용됩니다.<br />
          외부 공개 또는 제3자 제공은 별도 협의 없이 진행되지 않습니다.
        </div>
        <Checkbox label="[필수] 위 내용에 동의합니다." name="privacyAgreement" checked={formData.privacyAgreement} onChange={handleChange} required />
      </section>

      <div className="flex gap-3 pt-6 border-t border-[#D1D0C8]">
        <button type="button" onClick={handleSaveDraft} className="min-h-14 flex-1 bg-white border border-[#D1D0C8] text-base font-semibold text-[#202521] hover:bg-[#FAF9F5]">
          임시저장
        </button>
        <button type="submit" className="min-h-14 flex-[2] bg-[#2F3B34] text-base font-semibold text-white">
          자격 인증 신청하기
        </button>
      </div>
    </form>
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

function Checkbox({ label, name, checked, onChange, required = false }: { label: string, name: string, checked: boolean, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, required?: boolean }) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-sm text-[#4F5751]">
      <input type="checkbox" name={name} checked={checked} onChange={onChange} className="mt-0.5 size-4" required={required} />
      <span>{label}</span>
    </label>
  );
}
