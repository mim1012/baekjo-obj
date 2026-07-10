'use client';

import { useState, useEffect } from 'react';

const fieldClass = 'w-full border border-[#C9C8C0] px-4 py-3.5 text-sm focus:border-[#2F3B34] bg-white';
const textareaClass = 'w-full border border-[#C9C8C0] px-4 py-3.5 text-sm focus:border-[#2F3B34] bg-white resize-y min-h-24';

/** 입점 심사 첨부서류 카테고리 — 관리자 화면에서도 동일한 이름으로 노출된다. */
const ATTACHMENT_CATEGORIES = [
  '사업자등록증',
  '브랜드소개서',
  '로고',
  '제품이미지',
  '상세페이지',
  '시험성적서',
  '인증서',
  '기타',
] as const;

interface UploadedFile {
  category: string;
  name: string;
  path: string;
}

const initialData = {
  // 1. 기본 정보
  brandName: '',
  companyName: '',
  ceoName: '',
  businessNumber: '',
  establishedYear: '',
  website: '',
  instagram: '',
  managerName: '',
  contact: '',
  email: '',
  password: '',
  passwordConfirm: '',

  // 2. 브랜드 소개
  brandTagline: '',
  startMotivation: '',
  joinReason: '',

  // 3. 제품 정보
  repProductName: '',
  salesCategory: '',
  launchDate: '',
  manufacturingMethod: '자체 생산',
  repProductDescription: '',
  differentiation: '',

  // 4. 안전 및 품질 (체크 항목)
  safetyTestReport: false,
  safetyCert: false,
  safetyPatent: false,
  safetyTrademark: false,
  safetyDesign: false,
  safetyEtc: false,

  // 5. 운영 정보
  currentSalesChannels: '',
  monthlyProductionCapacity: '',

  // 7. Audit 동의 여부
  auditAgreement: false,

  // 8. 브랜드 철학
  philosophy: '',

  // 9. 개인정보 동의
  privacyAgreement: false,
};

export default function PartnerSignupForm({ onSuccess }: { onSuccess: (data: Record<string, unknown>) => void }) {
  const [formData, setFormData] = useState(initialData);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null);
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});

  // 임시저장 데이터 불러오기
  useEffect(() => {
    const saved = localStorage.getItem('partner_signup_draft');
    if (saved) {
      try {
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
    // 비밀번호와 업로드된 파일 목록은 평문/재사용 위험이 있어 localStorage에 남기지 않는다.
    const draft: Record<string, unknown> = { ...formData };
    delete draft.password;
    delete draft.passwordConfirm;
    localStorage.setItem('partner_signup_draft', JSON.stringify(draft));
    alert('임시저장 되었습니다.');
  };

  const handleFileSelect = async (category: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCategory(category);
    setUploadErrors((prev) => {
      const next = { ...prev };
      delete next[category];
      return next;
    });

    try {
      const body = new FormData();
      body.append('file', file);
      body.append('category', category);
      const response = await fetch('/api/members/business/upload', { method: 'POST', body });
      if (!response.ok) {
        setUploadErrors((prev) => ({ ...prev, [category]: '업로드에 실패했습니다. 다시 시도해주세요.' }));
        return;
      }
      const uploaded = (await response.json()) as UploadedFile;
      setUploadedFiles((prev) => [...prev.filter((f) => f.category !== category), uploaded]);
    } catch {
      setUploadErrors((prev) => ({ ...prev, [category]: '업로드에 실패했습니다. 다시 시도해주세요.' }));
    } finally {
      setUploadingCategory(null);
      e.target.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.passwordConfirm) {
      alert('비밀번호가 서로 일치하지 않습니다.');
      return;
    }
    if (!formData.privacyAgreement) {
      alert('개인정보 및 자료 활용 동의는 필수입니다.');
      return;
    }
    localStorage.removeItem('partner_signup_draft');
    onSuccess({ ...formData, attachedFiles: uploadedFiles });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-9 space-y-12">
      {/* 1. 기본 정보 */}
      <section className="space-y-5">
        <h2 className="text-xl font-bold text-[#202521] border-b border-[#D1D0C8] pb-3">1. 기본 정보</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="브랜드명 *"><input required name="brandName" value={formData.brandName} onChange={handleChange} className={fieldClass} /></Field>
          <Field label="법인명(개인사업자 포함) *"><input required name="companyName" value={formData.companyName} onChange={handleChange} className={fieldClass} /></Field>
          <Field label="대표자명 *"><input required name="ceoName" value={formData.ceoName} onChange={handleChange} className={fieldClass} /></Field>
          <Field label="사업자등록번호 *"><input required name="businessNumber" value={formData.businessNumber} onChange={handleChange} className={fieldClass} placeholder="000-00-00000" /></Field>
          <Field label="설립연도 *"><input required name="establishedYear" value={formData.establishedYear} onChange={handleChange} className={fieldClass} placeholder="YYYY" /></Field>
          <Field label="홈페이지"><input name="website" value={formData.website} onChange={handleChange} className={fieldClass} placeholder="https://" /></Field>
          <Field label="인스타그램"><input name="instagram" value={formData.instagram} onChange={handleChange} className={fieldClass} placeholder="@username" /></Field>
          <Field label="담당자명 *"><input required name="managerName" value={formData.managerName} onChange={handleChange} className={fieldClass} /></Field>
          <Field label="연락처 *"><input required name="contact" value={formData.contact} onChange={handleChange} className={fieldClass} placeholder="010-0000-0000" /></Field>
          <Field label="이메일 *"><input required type="email" name="email" value={formData.email} onChange={handleChange} className={fieldClass} placeholder="name@example.com" /></Field>
          <Field label="비밀번호 *"><input required minLength={6} type="password" name="password" value={formData.password} onChange={handleChange} className={fieldClass} /></Field>
          <Field label="비밀번호 확인 *"><input required minLength={6} type="password" name="passwordConfirm" value={formData.passwordConfirm} onChange={handleChange} className={fieldClass} /></Field>
        </div>
      </section>

      {/* 2. 브랜드 소개 */}
      <section className="space-y-5">
        <h2 className="text-xl font-bold text-[#202521] border-b border-[#D1D0C8] pb-3">2. 브랜드 소개</h2>
        <Field label="브랜드를 한 문장으로 소개해주세요. *">
          <textarea required name="brandTagline" value={formData.brandTagline} onChange={handleChange} className={textareaClass} />
        </Field>
        <Field label="브랜드를 시작하게 된 계기가 무엇인가요? *">
          <textarea required name="startMotivation" value={formData.startMotivation} onChange={handleChange} className={textareaClass} />
        </Field>
        <Field label="백조 오브제와 함께하고 싶은 이유를 알려주세요. *">
          <textarea required name="joinReason" value={formData.joinReason} onChange={handleChange} className={textareaClass} />
        </Field>
      </section>

      {/* 3. 제품 정보 */}
      <section className="space-y-5">
        <h2 className="text-xl font-bold text-[#202521] border-b border-[#D1D0C8] pb-3">3. 제품 정보</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="대표 상품명 *"><input required name="repProductName" value={formData.repProductName} onChange={handleChange} className={fieldClass} /></Field>
          <Field label="판매 카테고리 *"><input required name="salesCategory" value={formData.salesCategory} onChange={handleChange} className={fieldClass} /></Field>
          <Field label="출시일"><input type="date" name="launchDate" value={formData.launchDate} onChange={handleChange} className={fieldClass} /></Field>
          <Field label="제조 방식 *">
            <select required name="manufacturingMethod" value={formData.manufacturingMethod} onChange={handleChange} className={fieldClass}>
              <option value="자체 생산">자체 생산</option>
              <option value="OEM">OEM</option>
              <option value="ODM">ODM</option>
              <option value="기타">기타</option>
            </select>
          </Field>
        </div>
        <Field label="대표 상품 소개 *">
          <textarea required name="repProductDescription" value={formData.repProductDescription} onChange={handleChange} className={textareaClass} />
        </Field>
        <Field label="제품의 가장 큰 차별점은 무엇인가요? *">
          <textarea required name="differentiation" value={formData.differentiation} onChange={handleChange} className={textareaClass} />
        </Field>
      </section>

      {/* 4. 안전 및 품질 */}
      <section className="space-y-5">
        <h2 className="text-xl font-bold text-[#202521] border-b border-[#D1D0C8] pb-3">4. 안전 및 품질</h2>
        <p className="text-sm text-[#747B75] mb-2">보유하고 계신 항목을 모두 선택해주세요.</p>
        <div className="flex flex-wrap gap-4">
          <Checkbox label="시험성적서" name="safetyTestReport" checked={formData.safetyTestReport} onChange={handleChange} />
          <Checkbox label="인증서" name="safetyCert" checked={formData.safetyCert} onChange={handleChange} />
          <Checkbox label="특허" name="safetyPatent" checked={formData.safetyPatent} onChange={handleChange} />
          <Checkbox label="상표권" name="safetyTrademark" checked={formData.safetyTrademark} onChange={handleChange} />
          <Checkbox label="디자인권" name="safetyDesign" checked={formData.safetyDesign} onChange={handleChange} />
          <Checkbox label="기타" name="safetyEtc" checked={formData.safetyEtc} onChange={handleChange} />
        </div>
        <div className="mt-4">
          <Field label="관련 첨부 자료 (선택)">
            <input type="file" multiple className={fieldClass} accept=".pdf,.jpg,.jpeg,.png,.zip" />
          </Field>
        </div>
      </section>

      {/* 5. 운영 정보 */}
      <section className="space-y-5">
        <h2 className="text-xl font-bold text-[#202521] border-b border-[#D1D0C8] pb-3">5. 운영 정보</h2>
        <Field label="현재 판매 채널 *">
          <textarea required name="currentSalesChannels" value={formData.currentSalesChannels} onChange={handleChange} className={textareaClass} placeholder="예: 자사몰, 네이버 스마트스토어 등" />
        </Field>
        <Field label="월 평균 생산 가능 수량 (선택)">
          <input name="monthlyProductionCapacity" value={formData.monthlyProductionCapacity} onChange={handleChange} className={fieldClass} placeholder="예: 1,000개" />
        </Field>
      </section>

      {/* 6. 첨부 자료 */}
      <section className="space-y-5">
        <h2 className="text-xl font-bold text-[#202521] border-b border-[#D1D0C8] pb-3">6. 첨부 자료</h2>
        <p className="text-sm text-[#747B75] mb-2">항목별로 파일을 선택하면 즉시 업로드됩니다. (PDF/PNG/JPG/ZIP, 최대 10MB)</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {ATTACHMENT_CATEGORIES.map((category) => {
            const uploaded = uploadedFiles.find((f) => f.category === category);
            const isUploading = uploadingCategory === category;
            return (
              <Field key={category} label={category}>
                <input
                  type="file"
                  className={fieldClass}
                  accept=".pdf,.jpg,.jpeg,.png,.zip"
                  disabled={isUploading}
                  onChange={(e) => handleFileSelect(category, e)}
                />
                {isUploading && <p className="text-xs text-[#8B928C] mt-1">업로드 중…</p>}
                {uploaded && !isUploading && (
                  <p className="text-xs text-[#2F7A4F] mt-1">업로드됨 · {uploaded.name}</p>
                )}
                {uploadErrors[category] && (
                  <p className="text-xs text-[#A65348] mt-1">{uploadErrors[category]}</p>
                )}
              </Field>
            );
          })}
        </div>
      </section>

      {/* 7. Audit 동의 여부 */}
      <section className="space-y-5 border-t border-[#D1D0C8] pt-6">
        <h2 className="text-xl font-bold text-[#202521] mb-2">7. Audit 동의 여부</h2>
        <Checkbox label="Audit 진행을 동의합니다." name="auditAgreement" checked={formData.auditAgreement} onChange={handleChange} required />
      </section>

      {/* 8. 브랜드 철학 */}
      <section className="space-y-5 border-t border-[#D1D0C8] pt-6">
        <h2 className="text-xl font-bold text-[#202521] mb-2">8. 브랜드 철학</h2>
        <Field label="브랜드를 운영하면서 가장 끝까지 포기하지 않은 기준은 무엇인가요? *">
          <textarea required name="philosophy" value={formData.philosophy} onChange={handleChange} className={textareaClass} />
        </Field>
      </section>

      {/* 9. 개인정보 및 자료 활용 동의 */}
      <section className="space-y-5 border-t border-[#D1D0C8] pt-6">
        <h2 className="text-xl font-bold text-[#202521] mb-2">9. 개인정보 및 자료 활용 동의</h2>
        <div className="bg-white p-4 border border-[#D1D0C8] text-sm text-[#5F6761] mb-3">
          제출한 자료는 백조 오브제의 입점 심사 및 Audit 검토를 위한 용도로만 활용됩니다.<br />
          외부 공개 또는 제3자 제공은 별도 협의 없이 진행되지 않습니다.
        </div>
        <Checkbox label="[필수] 동의합니다." name="privacyAgreement" checked={formData.privacyAgreement} onChange={handleChange} required />
      </section>

      <div className="flex gap-3 pt-6 border-t border-[#D1D0C8]">
        <button type="button" onClick={handleSaveDraft} className="min-h-14 flex-1 bg-white border border-[#D1D0C8] text-base font-semibold text-[#202521] hover:bg-[#FAF9F5]">
          임시저장
        </button>
        <button
          type="submit"
          disabled={uploadingCategory !== null}
          className="min-h-14 flex-[2] bg-[#2F3B34] text-base font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          가입 신청하기
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
