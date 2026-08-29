'use client';

import { useState, useEffect } from 'react';
import { useEmailAvailability, EmailCheckMessage } from '@/components/signup/emailAvailability';
import { uploadBusinessFile, type UploadedFile } from '@/components/signup/uploadBusinessFile';

const fieldClass = 'w-full border border-[#C9C8C0] px-4 py-3.5 text-sm focus:border-[#2F3B34] bg-white';
const textareaClass = 'w-full border border-[#C9C8C0] px-4 py-3.5 text-sm focus:border-[#2F3B34] bg-white resize-y min-h-24';

const initialData = {
  // 1. 기본 정보
  companyName: '',
  ceoName: '',
  businessNumber: '',
  businessType: '',
  establishedYear: '',
  managerName: '',
  contact: '',
  email: '',
  website: '',
  address: '',
  password: '',
  passwordConfirm: '',

  // 2. 업체 소개
  companyTagline: '',
  mainServices: '',
  joinReason: '',

  // 3. 인증 자료 (체크 항목)
  attachBizLicense: false,
  attachMedicalLicense: false,
  attachFuneralLicense: false,
  attachEntrustLicense: false,
  attachBeautyLicense: false,
  attachOtherLicense: false,

  // 4. 추가 첨부자료 (체크 항목)
  attachCompanyIntro: false,
  attachServiceIntro: false,
  attachFacilityPhoto: false,
  attachCert: false,
  attachEtc: false,

  // 5. 운영 정보
  operationHours: '',
  providedServices: '',
  serviceArea: '',

  // 6. 개인정보 동의
  privacyAgreement: false,
};

export default function B2BSignupForm({
  onSuccess,
  pending = false,
}: {
  onSuccess: (data: Record<string, unknown>) => void;
  /** 제출 중 여부 — 페이지 레벨 API 호출 중 재제출을 막는다. */
  pending?: boolean;
}) {
  const [formData, setFormData] = useState(initialData);
  // alert 대신 제출 버튼 바로 위 인라인 배너로 안내한다(긴 양식에서 상단 메시지는 안 보임).
  const [formError, setFormError] = useState('');
  const emailStatus = useEmailAvailability(formData.email);
  // 실제 업로드 상태 — 체크박스는 "보유 서류" 표시일 뿐이고, 서류 자체는
  // signup-docs private 버킷에 업로드해야 관리자가 열람할 수 있다.
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const scrollToFormError = () => {
    requestAnimationFrame(() => {
      document.getElementById('business-form-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  // 임시저장 데이터 불러오기
  useEffect(() => {
    const saved = localStorage.getItem('b2b_signup_draft');
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
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSaveDraft = () => {
    // 비밀번호는 평문으로 localStorage에 남기지 않는다.
    const draft: Record<string, unknown> = { ...formData };
    delete draft.password;
    delete draft.passwordConfirm;
    localStorage.setItem('b2b_signup_draft', JSON.stringify(draft));
    alert('임시저장 되었습니다.');
  };

  const handleFileSelect = async (category: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;

    setUploading(true);
    setFormError('');
    try {
      const uploaded = await Promise.all(files.map((file) => uploadBusinessFile(file, category)));
      setUploadedFiles((prev) => [...prev, ...uploaded]);
    } catch {
      setFormError('서류 업로드에 실패했습니다. 파일 형식(PDF/PNG/JPG)과 크기(10MB 이하)를 확인 후 다시 시도해 주세요.');
      scrollToFormError();
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.passwordConfirm) {
      setFormError('비밀번호가 서로 일치하지 않습니다.');
      scrollToFormError();
      return;
    }
    if (emailStatus === 'duplicate') {
      setFormError('이미 가입된 이메일입니다. 가입하신 계정으로 로그인해 주세요.');
      scrollToFormError();
      return;
    }
    const hasBizLicense = uploadedFiles.some((file) => file.category === '사업자등록증');
    if (!hasBizLicense) {
      setFormError('사업자등록증 서류를 1개 이상 업로드해주세요.');
      scrollToFormError();
      return;
    }
    if (!formData.privacyAgreement) {
      setFormError('개인정보 및 자료 활용 동의는 필수입니다.');
      scrollToFormError();
      return;
    }
    // 실제 서버 전송 또는 파일 업로드 처리
    localStorage.removeItem('b2b_signup_draft');
    setFormError('');
    onSuccess({ ...formData, attachedFiles: uploadedFiles });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-9 space-y-12">
      {/* 1. 기본 정보 */}
      <section className="space-y-5">
        <h2 className="text-xl font-bold text-[#202521] border-b border-[#D1D0C8] pb-3">1. 기본 정보</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="업체명 *"><input required name="companyName" value={formData.companyName} onChange={handleChange} className={fieldClass} /></Field>
          <Field label="대표자명 *"><input required name="ceoName" value={formData.ceoName} onChange={handleChange} className={fieldClass} /></Field>
          <Field label="사업자등록번호 *"><input required name="businessNumber" value={formData.businessNumber} onChange={handleChange} className={fieldClass} placeholder="000-00-00000" /></Field>
          <Field label="업종 *"><input required name="businessType" value={formData.businessType} onChange={handleChange} className={fieldClass} /></Field>
          <Field label="설립연도 *"><input required name="establishedYear" value={formData.establishedYear} onChange={handleChange} className={fieldClass} placeholder="YYYY" /></Field>
          <Field label="담당자명 *"><input required name="managerName" value={formData.managerName} onChange={handleChange} className={fieldClass} /></Field>
          <Field label="연락처 *"><input required name="contact" value={formData.contact} onChange={handleChange} className={fieldClass} placeholder="010-0000-0000" /></Field>
          <Field label="이메일 *"><input required type="email" name="email" value={formData.email} onChange={handleChange} className={fieldClass} placeholder="name@example.com" /></Field>
          <div className="sm:col-span-2 -mt-4"><EmailCheckMessage status={emailStatus} /></div>
          <div className="sm:col-span-2 grid gap-5 sm:grid-cols-2">
            <Field label="홈페이지"><input name="website" value={formData.website} onChange={handleChange} className={fieldClass} placeholder="https://" /></Field>
            <Field label="사업장 주소 *"><input required name="address" value={formData.address} onChange={handleChange} className={fieldClass} placeholder="전체 주소 입력" /></Field>
          </div>
          <Field label="비밀번호 *"><input required minLength={6} type="password" name="password" value={formData.password} onChange={handleChange} className={fieldClass} /></Field>
          <Field label="비밀번호 확인 *"><input required minLength={6} type="password" name="passwordConfirm" value={formData.passwordConfirm} onChange={handleChange} className={fieldClass} /></Field>
        </div>
      </section>

      {/* 2. 업체 소개 */}
      <section className="space-y-5">
        <h2 className="text-xl font-bold text-[#202521] border-b border-[#D1D0C8] pb-3">2. 업체 소개</h2>
        <Field label="업체를 한 문장으로 소개해주세요. *">
          <textarea required name="companyTagline" value={formData.companyTagline} onChange={handleChange} className={textareaClass} />
        </Field>
        <Field label="주요 서비스 및 운영 내용을 알려주세요. *">
          <textarea required name="mainServices" value={formData.mainServices} onChange={handleChange} className={textareaClass} />
        </Field>
        <Field label="백조오브제와 함께하고 싶은 이유를 알려주세요. *">
          <textarea required name="joinReason" value={formData.joinReason} onChange={handleChange} className={textareaClass} />
        </Field>
      </section>

      {/* 3. 인증 자료 */}
      <section className="space-y-5">
        <h2 className="text-xl font-bold text-[#202521] border-b border-[#D1D0C8] pb-3">3. 인증 자료</h2>
        <p className="text-sm text-[#747B75] mb-2">보유하신 인허가·등록증 항목을 모두 선택해주세요.</p>
        <div className="flex flex-wrap gap-4">
          <Checkbox label="사업자등록증 (필수)" name="attachBizLicense" checked={formData.attachBizLicense} onChange={handleChange} required />
          <Checkbox label="의료기관 개설허가증 (동물병원)" name="attachMedicalLicense" checked={formData.attachMedicalLicense} onChange={handleChange} />
          <Checkbox label="동물장묘업 등록증" name="attachFuneralLicense" checked={formData.attachFuneralLicense} onChange={handleChange} />
          <Checkbox label="동물위탁관리업 등록증" name="attachEntrustLicense" checked={formData.attachEntrustLicense} onChange={handleChange} />
          <Checkbox label="동물미용업 등록증" name="attachBeautyLicense" checked={formData.attachBeautyLicense} onChange={handleChange} />
          <Checkbox label="기타 업종별 인허가·등록증" name="attachOtherLicense" checked={formData.attachOtherLicense} onChange={handleChange} />
        </div>
        <div className="mt-4 space-y-3">
          <Field label="사업자등록증 업로드 (필수 · PDF/PNG/JPG, 10MB 이하)">
            <input
              type="file"
              className={fieldClass}
              accept=".pdf,.jpg,.jpeg,.png"
              disabled={uploading}
              onChange={(e) => handleFileSelect('사업자등록증', e)}
            />
          </Field>
          <Field label="기타 인허가·등록증 서류 업로드 (선택 · 여러 개 가능)">
            <input
              type="file"
              multiple
              className={fieldClass}
              accept=".pdf,.jpg,.jpeg,.png"
              disabled={uploading}
              onChange={(e) => handleFileSelect('기타', e)}
            />
          </Field>
          {uploading && <p className="text-xs text-[#8B928C]">업로드 중…</p>}
          {uploadedFiles.length > 0 && (
            <ul className="space-y-1">
              {uploadedFiles.map((file) => (
                <li key={file.path} className="text-xs text-[#2F7A4F]">
                  업로드됨 · [{file.category}] {file.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* 4. 추가 첨부자료 (선택) */}
      <section className="space-y-5">
        <h2 className="text-xl font-bold text-[#202521] border-b border-[#D1D0C8] pb-3">4. 추가 첨부자료 (선택)</h2>
        <div className="flex flex-wrap gap-4">
          <Checkbox label="회사소개서" name="attachCompanyIntro" checked={formData.attachCompanyIntro} onChange={handleChange} />
          <Checkbox label="서비스 소개서" name="attachServiceIntro" checked={formData.attachServiceIntro} onChange={handleChange} />
          <Checkbox label="시설 사진" name="attachFacilityPhoto" checked={formData.attachFacilityPhoto} onChange={handleChange} />
          <Checkbox label="인증서" name="attachCert" checked={formData.attachCert} onChange={handleChange} />
          <Checkbox label="기타 참고자료" name="attachEtc" checked={formData.attachEtc} onChange={handleChange} />
        </div>
        <div className="mt-4 space-y-3">
          <Field label="추가 첨부 서류 업로드 (선택 · 여러 개 가능)">
            <input
              type="file"
              multiple
              className={fieldClass}
              accept=".pdf,.jpg,.jpeg,.png"
              disabled={uploading}
              onChange={(e) => handleFileSelect('기타', e)}
            />
          </Field>
        </div>
      </section>

      {/* 5. 운영 정보 */}
      <section className="space-y-5">
        <h2 className="text-xl font-bold text-[#202521] border-b border-[#D1D0C8] pb-3">5. 운영 정보</h2>
        <Field label="운영 시간 *">
          <textarea required name="operationHours" value={formData.operationHours} onChange={handleChange} className={textareaClass} placeholder="예: 평일 09:00 - 18:00 (주말/공휴일 휴무)" />
        </Field>
        <Field label="제공 서비스 *">
          <textarea required name="providedServices" value={formData.providedServices} onChange={handleChange} className={textareaClass} placeholder="예: 동물 위탁 관리, 행동 교정 등" />
        </Field>
        <Field label="서비스 가능 지역 *">
          <textarea required name="serviceArea" value={formData.serviceArea} onChange={handleChange} className={textareaClass} placeholder="예: 서울 전 지역" />
        </Field>
      </section>

      {/* 6. 개인정보 및 자료 활용 동의 */}
      <section className="space-y-5 border-t border-[#D1D0C8] pt-6">
        <h2 className="text-xl font-bold text-[#202521] mb-2">6. 개인정보 및 자료 활용 동의</h2>
        <div className="bg-white p-4 border border-[#D1D0C8] text-sm text-[#5F6761] mb-3">
          제출한 자료는 백조오브제의 B2B 인증 및 제휴 심사를 위한 용도로만 활용됩니다.<br />
          외부 공개 또는 제3자 제공은 별도 협의 없이 진행되지 않습니다.
        </div>
        <Checkbox label="[필수] 동의합니다." name="privacyAgreement" checked={formData.privacyAgreement} onChange={handleChange} required />
      </section>

      <div className="flex flex-col gap-3 pt-6 border-t border-[#D1D0C8]">
        {formError && (
          <p id="business-form-error" className="rounded-sm border border-[#E3C9C4] bg-[#FBF1EF] p-3 text-sm text-[#A65348]" role="alert">
            {formError}
          </p>
        )}
        <div className="flex gap-3">
          <button type="button" onClick={handleSaveDraft} disabled={pending} className="min-h-14 flex-1 bg-white border border-[#D1D0C8] text-base font-semibold text-[#202521] hover:bg-[#FAF9F5] disabled:cursor-not-allowed disabled:opacity-60">
            임시저장
          </button>
          <button
            type="submit"
            disabled={pending || uploading}
            className="min-h-14 flex-[2] bg-[#2F3B34] text-base font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? '제출 중…' : uploading ? '서류 업로드 중…' : '가입 신청하기'}
          </button>
        </div>
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
