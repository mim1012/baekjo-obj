'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  FileSearch,
  FileText,
  HeartHandshake,
  ShieldCheck,
  UploadCloud,
  ChevronDown,
  MessageCircle,
  Check,
  X
} from 'lucide-react';
import { getInsuranceContentConfig } from '@/lib/storage';
import { defaultInsuranceContentConfig, type ConsentDoc } from '@/lib/insuranceContent/config';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

const firstChecks = ['현재 보장 범위', '자기부담금과 한도', '보장하지 않는 조건', '갱신 및 유지 조건'];

const reviewPrinciples = [
  {
    icon: FileSearch,
    title: '놓치기 쉬운 조건까지',
    text: '약관 속 어려운 내용을 이해하기 쉽게 정리해 드려요.',
  },
  {
    icon: ShieldCheck,
    title: '안내한 이유를 투명하게',
    text: '왜 이런 분석이 필요한지, 꼭 필요한 보장인지 함께 확인해요.',
  },
  {
    icon: HeartHandshake,
    title: '지금 보험이 괜찮다면 그대로',
    text: '좋은 보장은 유지하고 더 잘 맞는 구성으로 비교안 도와드려요.',
  },
];

const reviewSteps = [
  {
    title: '아이 정보 남기기',
    description: '아이와 보호자 정보를 입력해 주세요.',
  },
  {
    title: '확인할 내용 정리',
    description: '보유 보험의 핵심 항목을 정리해 분석에 반영해요.',
  },
  {
    title: '보장 조건 살펴보기',
    description: '전문가가 보장 범위와 조건을 꼼꼼히 분석해 드려요.',
  },
  {
    title: '결과 안내받기',
    description: '분석 리포트와 함께 맞춤 제안을 안내해 드려요.',
  },
];

const coverageOptions = [
  '수술/입원비 집중 보장',
  '통원비 중심',
  '슬개골/피부/구강 특약 희망',
  '가성비 중심',
];

export default function InsurancePage() {
  const router = useRouter();

  // 동의 전문·FAQ 는 관리자(/admin/insurance-content)가 편집하는 DB 콘텐츠 — 콘센트로 읽는다(§4).
  // getInsuranceContentConfig 는 실패·미저장 시 defaultInsuranceContentConfig 로 폴백하므로 절대 깨지지 않는다.
  const [content, setContent] = useState(defaultInsuranceContentConfig);
  const [consentChecks, setConsentChecks] = useState<Record<string, boolean>>({});
  const [openConsent, setOpenConsent] = useState<ConsentDoc | null>(null);
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);
  const consentCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const consentDialogRef = useRef<HTMLDivElement | null>(null);

  // 전문 모달 접근성 — Escape 로 닫고, 열릴 때 닫기 버튼으로 포커스를 옮기며, Tab 은 모달 안에서만
  // 순환(focus trap)하고, 닫힐 때 열기 전 포커스(전문 보기 버튼)로 복원한다.
  useEffect(() => {
    if (!openConsent) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    consentCloseButtonRef.current?.focus();
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenConsent(null);
        return;
      }
      if (event.key !== 'Tab') return;
      const dialog = consentDialogRef.current;
      if (!dialog) return;
      const focusables = Array.from(
        dialog.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => {
      window.removeEventListener('keydown', handleKeydown);
      previouslyFocused?.focus();
    };
  }, [openConsent]);

  useEffect(() => {
    let cancelled = false;
    getInsuranceContentConfig().then((config) => {
      if (!cancelled) setContent(config);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Upload State
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState('');

  const selectFile = useCallback((nextFile?: File) => {
    setUploadError('');
    if (!nextFile) return;

    if (!ALLOWED_FILE_TYPES.includes(nextFile.type)) {
      setFile(null);
      setUploadError('PDF, JPG, PNG 파일만 선택할 수 있어요.');
      return;
    }

    if (nextFile.size > MAX_FILE_SIZE) {
      setFile(null);
      setUploadError('파일 크기는 10MB 이하로 선택해 주세요.');
      return;
    }

    setFile(nextFile);
  }, []);

  const handleDrag = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(event.type === 'dragenter' || event.type === 'dragover');
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);
      selectFile(event.dataTransfer.files?.[0]);
    },
    [selectFile],
  );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    selectFile(event.target.files?.[0]);
    event.target.value = '';
  };

  const clearFile = () => {
    setFile(null);
    setUploadError('');
  };

  // Form State
  const [formData, setFormData] = useState({
    companyName: '',
    productName: '',
    message: '',
  });

  // 필수 동의 문서가 전부 체크됐는지 — 동의 목록은 관리자가 바꿀 수 있으므로 id 기반으로 판정한다.
  const allRequiredChecked = content.consents.filter((c) => c.required).every((c) => consentChecks[c.id]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = event.target;
    const checked = event.target instanceof HTMLInputElement ? event.target.checked : false;
    setFormData((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  // 랜딩은 접수를 완결하지 않는다 — 여기서 모은 값(보험사·상품명·궁금한 점)은 실제 신청서
  // (/insurance/apply, 이름·연락처·반려동물 정보까지 받는 진짜 폼)로 프리필해 넘기고, 실제
  // 저장은 그 페이지의 saveInsuranceApplication 호출 한 곳에서만 일어난다. 예전엔 이 랜딩이
  // 직접 saveInsuranceApplication을 호출했는데, 이 폼엔 이름/연락처/반려동물 입력란이 아예
  // 없어 그 값들을 전부 고정 문자열('사용자' 등)로 채워 보냈다 — 관리자가 연락할 수 없는
  // 유령 신청 레코드가 쌓였다. 증권 업로드도 이 페이지엔 저장 경로가 없어(파일이 그대로
  // 버려짐) 실제 첨부·접수는 다음 단계(신청서)에서 진행한다.
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!allRequiredChecked) return;

    const params = new URLSearchParams();
    const insuranceName = `${formData.companyName} ${formData.productName}`.trim();
    if (insuranceName) {
      params.set('hasCurrentInsurance', 'yes');
      params.set('currentInsuranceName', insuranceName);
    }
    if (formData.message) {
      params.set('message', formData.message);
    }

    const query = params.toString();
    router.push(`/insurance/apply${query ? `?${query}` : ''}`);
  };

  const fieldClass = 'w-full rounded-xl border border-[#D8D6CE] bg-[#FAF9F5] px-4 py-3 text-sm transition-colors focus:border-[#2F3B34] focus:outline-none focus:ring-1 focus:ring-[#2F3B34]';

  return (
    <div className="bg-[#FAF9F5] pb-24 text-[#1A1D1B]" style={{ wordBreak: 'keep-all' }}>
      {/* 1. 히어로 영역 */}
      <section className="pt-10">
        <div className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-12">
          <div className="bg-noise relative flex flex-col overflow-hidden rounded-[22px] border border-[#E2DACD] bg-[#F1EDE5] px-8 py-12 shadow-[0_20px_50px_-35px_rgba(23,33,29,0.18)] md:h-[410px] md:flex-row md:items-center md:px-12 lg:px-14">
            {/* 좌측 콘텐츠 (55%) */}
            <div className="relative z-10 md:w-[55%]">
              <p className="text-sm font-semibold text-[#A8742E]">보험 분석 서비스</p>
              <h1 className="mt-4 text-[34px] font-bold leading-[1.2] tracking-[-0.035em] text-[#17211D] sm:text-[42px] md:text-[48px]">
                우리 아이에게<br />
                필요한 보장,<br />
                함께 차근차근 살펴봐요.
              </h1>
              <p className="mt-5 text-sm leading-[1.7] text-[#5F6761] sm:text-[15px]">
                나이와 건강, 견종, 지금 가입 보험을 함께 살펴<br className="hidden sm:block" />
                놓치기 쉬운 조건을 이해하기 쉽게 정리해 드려요.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a href="#insurance-form" className="inline-flex h-[52px] items-center justify-center rounded-full bg-[#17211D] px-8 text-[15px] font-bold text-[#FBFAF7] transition-all duration-500 ease-out hover:bg-[#202521] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A8742E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F1EDE5]">
                  보험 분석 신청하기
                  <ArrowRight className="ml-2 size-4" aria-hidden="true" />
                </a>
                <a href="#insurance-form" className="inline-flex h-[52px] items-center justify-center rounded-full border border-[#D8C4A3] bg-[#FFFEFB] px-8 text-[15px] font-bold text-[#17211D] transition-all duration-500 ease-out hover:bg-[#F8F4EC] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A8742E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F1EDE5]">
                  분석이란 무엇인가요?
                </a>
              </div>
            </div>

            {/* 우측 패널 (45%) */}
            <div className="relative z-10 mt-10 md:mt-0 md:w-[45%] md:pl-8">
              <div className="rounded-[20px] border border-[#E2DACD] bg-[#FFFEFB]/95 p-8 shadow-[0_18px_45px_-30px_rgba(23,33,29,0.25)] backdrop-blur-md">
                <p className="text-[13px] font-semibold text-[#6F766F]">분석에서 확인하는 항목</p>
                <ul className="mt-6 space-y-4">
                  {firstChecks.map((item, index) => (
                    <li key={item} className="flex items-center border-b border-[#E7E0D5] pb-4 last:border-0 last:pb-0">
                      <span className="mr-4 flex size-8 items-center justify-center rounded-md bg-[#F3EEE6] text-xs font-bold text-[#A8742E]">
                        0{index + 1}
                      </span>
                      <span className="text-[15px] font-medium text-[#17211D]">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {/* Background Decoration */}
            <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 opacity-20 blur-3xl">
              <ShieldCheck className="size-96 text-[#D8C4A3]" />
            </div>
          </div>
        </div>
      </section>

      {/* 2. 보험 분석 원칙 3개 통합 패널 */}
      <section className="mt-8">
        <div className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-12">
          <div className="flex flex-row overflow-x-auto snap-x snap-mandatory hide-scrollbar gap-4 md:gap-0 pb-4 md:pb-0 md:rounded-[22px] md:border md:border-[#EBE8E1] md:bg-white md:h-[140px] md:overflow-hidden">
            {reviewPrinciples.map(({ icon: Icon, title, text }, idx) => (
              <article key={title} className={`flex flex-col justify-center p-6 lg:p-8 w-[80vw] sm:w-[320px] md:w-auto shrink-0 snap-center rounded-[22px] border border-[#EBE8E1] bg-white md:rounded-none md:border-0 md:flex-1 ${idx !== 0 ? 'md:border-l md:border-[#EBE8E1]' : ''}`}>
                <div className="flex items-start gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#FAF9F5] text-[#1A221E]">
                    <Icon className="size-6" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#1A1D1B]">{title}</h3>
                    <p className="mt-1 text-[13px] leading-[1.65] text-[#5F6761]">{text}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 3. 증권 준비 안내 + 실제 업로드·신청 폼 */}
      <section id="insurance-form" className="mt-12 scroll-mt-24">
        <div className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-12">
          <div className="flex flex-col gap-10 lg:flex-row lg:gap-16">
            {/* 좌측 준비 안내 (32%) */}
            <div className="lg:w-[32%] lg:pt-2">
              <p className="text-[13px] font-bold text-[#A8742E]">증권을 준비해 주세요</p>
              <h2 className="mt-3 text-[32px] font-bold leading-[1.2] tracking-[-0.035em] text-[#1A1D1B] lg:text-[38px]">
                증권을 보며<br />
                궁금한 점부터<br />
                정리해 보세요.
              </h2>
              <p className="mt-4 text-[15px] leading-[1.65] text-[#5F6761]">
                보유 중인 보험을 정확히 이해하면<br className="hidden lg:block" />
                불필요한 중복은 줄이고 필요한 보장은<br className="hidden lg:block" />
                꼼꼼히 챙길 수 있어요.
              </p>

              <ul className="mt-10 space-y-6">
                <li className="flex items-center gap-3">
                  <FileText className="size-5 text-[#1A221E]" strokeWidth={1.5} />
                  <span className="text-[15px] font-medium text-[#1A1D1B]">보험 증권 PDF 또는 이미지</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="size-5 text-[#1A221E]" strokeWidth={1.5} />
                  <span className="text-[15px] font-medium text-[#1A1D1B]">가입한 보험사와 상품명</span>
                </li>
                <li className="flex items-center gap-3">
                  <MessageCircle className="size-5 text-[#1A221E]" strokeWidth={1.5} />
                  <span className="text-[15px] font-medium text-[#1A1D1B]">현재 궁금한 보장 조건</span>
                </li>
              </ul>
              
              <div className="mt-12 flex items-start gap-3 rounded-xl bg-[#F4F2EC] p-4">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#1A221E]" strokeWidth={1.5} />
                <p className="text-[13px] leading-[1.65] text-[#5F6761]">
                  업로드된 파일은 안전하게 보호되며<br />
                  분석 목적 외에 사용하지 않습니다.
                </p>
              </div>
            </div>

            {/* 우측 실제 신청 폼 (68%) */}
            <div className="rounded-[24px] border border-[#EBE8E1] bg-white p-8 lg:w-[68%] lg:p-10">
              <h3 className="text-xl font-bold text-[#1A1D1B]">가지고 있는 증권을 미리 확인해 보세요.</h3>
              <p className="mt-2 text-[14px] text-[#5F6761]">실제 증권 첨부와 접수는 다음 단계(신청서 작성)에서 진행돼요. 아래 정보를 남겨주시면 신청서에 그대로 이어드립니다.</p>

              {/* 업로드 영역 */}
              <div className="mt-8">
                {!file ? (
                  <div
                    className={`relative flex h-[200px] flex-col items-center justify-center rounded-[16px] border border-dashed transition-all duration-300 ${
                      isDragging
                        ? 'border-[#1A221E] bg-[#F4F2EC]'
                        : 'border-[#D8D6CE] bg-[#FAF9F5] hover:border-[#1A221E]'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      className="absolute inset-0 size-full cursor-pointer opacity-0"
                      onChange={handleFileChange}
                      accept=".pdf,.jpg,.jpeg,.png"
                      aria-label="보험 증권 파일 선택"
                    />
                    <div className="flex size-10 items-center justify-center rounded-full bg-white shadow-sm">
                      <UploadCloud className="size-5 text-[#1A221E]" strokeWidth={2} aria-hidden="true" />
                    </div>
                    <p className="mt-4 text-[14px] font-bold text-[#1A1D1B]">파일을 드래그하거나 버튼을 눌러 선택해주세요.</p>
                    <p className="mt-1 text-[12px] text-[#5F6761]">PDF, JPG, PNG | 최대 10MB</p>
                    <button type="button" className="mt-4 rounded-lg bg-[#1A221E] px-5 py-2 text-[13px] font-bold text-white transition-colors hover:bg-black">
                      파일 선택하기
                    </button>
                  </div>
                ) : (
                  <div className="flex h-[200px] flex-col items-center justify-center rounded-[16px] border border-[#EBE8E1] bg-[#FAF9F5] p-6">
                    <FileText className="size-10 text-[#A8742E] mb-4" strokeWidth={1.5} />
                    <p className="max-w-xs break-all text-[15px] font-bold leading-[1.5] text-[#1A1D1B]">{file.name}</p>
                    <p className="mt-1 text-[13px] text-[#5F6761]">{(file.size / (1024 * 1024)).toFixed(1)}MB</p>
                    <button type="button" onClick={clearFile} className="mt-5 flex items-center gap-1 text-[13px] font-semibold text-[#1A221E] hover:underline">
                      <X className="size-3" /> 삭제 후 다시 선택
                    </button>
                  </div>
                )}
                {uploadError && (
                  <p className="mt-3 text-[13px] text-red-500 font-medium">{uploadError}</p>
                )}
              </div>

              {/* 신청 폼 영역 */}
              <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-[13px] font-bold text-[#1A1D1B]">보험사 <span className="text-red-500">*</span></span>
                    <div className="relative">
                      <select required name="companyName" value={formData.companyName} onChange={handleChange} className={`${fieldClass} appearance-none`}>
                        <option value="">선택해주세요</option>
                        <option value="삼성화재">삼성화재</option>
                        <option value="메리츠화재">메리츠화재</option>
                        <option value="현대해상">현대해상</option>
                        <option value="DB손해보험">DB손해보험</option>
                        <option value="기타">기타</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-[#5F6761] pointer-events-none" />
                    </div>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-[13px] font-bold text-[#1A1D1B]">보험 상품명 <span className="text-red-500">*</span></span>
                    <input required name="productName" value={formData.productName} onChange={handleChange} className={fieldClass} placeholder="입력해주세요" />
                  </label>
                </div>

                <label className="block">
                  <span className="mb-2 block text-[13px] font-bold text-[#1A1D1B]">현재 궁금한 보장 조건 (선택)</span>
                  <input name="message" value={formData.message} onChange={handleChange} className={fieldClass} placeholder="예) 슬개골 탈구 보장 조건, 피부 질환 보장 범위 등" />
                </label>

                <div className="space-y-3 pt-4 border-t border-[#EBE8E1]">
                  {content.consents.map((consent) => (
                    <label key={consent.id} className="flex items-center justify-between cursor-pointer rounded-xl border border-[#EBE8E1] bg-[#FAF9F5] p-4 transition-colors hover:border-[#D8D6CE]">
                      <div className="flex items-center gap-3">
                        <div className="relative flex size-[18px] shrink-0 items-center justify-center rounded border border-[#C9C8C0] transition-colors has-[:checked]:border-[#1A221E] has-[:checked]:bg-[#1A221E]">
                          <input
                            required={consent.required}
                            type="checkbox"
                            checked={!!consentChecks[consent.id]}
                            onChange={() => setConsentChecks((prev) => ({ ...prev, [consent.id]: !prev[consent.id] }))}
                            className="peer sr-only"
                          />
                          <Check className="size-3 text-white opacity-0 peer-checked:opacity-100" strokeWidth={3} aria-hidden="true" />
                        </div>
                        <span className="text-[14px] text-[#1A1D1B]">{consent.title}{consent.required ? ' (필수)' : ' (선택)'}</span>
                      </div>
                      {/* label 내부라 preventDefault 필수 — 클릭이 체크박스 토글로 번지지 않게 막는다. */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenConsent(consent);
                        }}
                        className="text-[13px] text-[#5F6761] underline underline-offset-2 hover:text-[#1A1D1B]"
                      >
                        전문 보기
                      </button>
                    </label>
                  ))}
                </div>

                <button type="submit" disabled={!allRequiredChecked} className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#1A221E] py-[18px] text-[15px] font-bold text-white transition-colors hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed">
                  다음 단계로 (신청서 작성)
                  <ArrowRight className="size-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* 개인정보 보호 안내 바 */}
      <section className="mt-12">
         <div className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-12">
           <div className="flex flex-col md:flex-row md:items-center justify-between rounded-[20px] bg-white p-6 md:px-8 border border-[#EBE8E1]">
              <div className="flex items-center gap-4">
                <ShieldCheck className="size-8 text-[#1A221E]" strokeWidth={1.5} />
                <div>
                  <p className="text-[15px] font-bold text-[#1A1D1B]">백조오브제는 소중한 정보를 안전하게 보호합니다.</p>
                  <p className="mt-1 text-[13px] text-[#5F6761]">증권과 개인정보는 다음 단계(신청서 제출) 시 안전하게 처리되며, 분석 목적 외에는 사용되지 않습니다.</p>
                </div>
              </div>
              <a href="#" className="mt-4 md:mt-0 text-[13px] font-bold text-[#1A1D1B] flex items-center gap-1">
                개인정보 처리 방침 보기 <ArrowRight className="size-3" />
              </a>
           </div>
         </div>
      </section>

      {/* 4. 진행 과정 4단계 */}
      <section className="mt-20">
        <div className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-12">
          <div className="mb-8">
            <h2 className="text-[24px] font-bold tracking-tight text-[#1A1D1B]">신청 후에는 이렇게 이어져요.</h2>
            <p className="mt-2 text-[15px] text-[#5F6761]">신청부터 결과 확인까지, 차근차근 안내해 드립니다.</p>
          </div>

          <div className="flex flex-row overflow-x-auto snap-x snap-mandatory hide-scrollbar gap-4 pb-4">
            {reviewSteps.map((step, index) => (
              <div key={step.title} className="flex-1 w-[70vw] sm:w-[280px] md:w-auto shrink-0 snap-center rounded-[20px] bg-white p-8 border border-[#EBE8E1] flex flex-col items-center text-center relative group">
                <span className="flex size-14 items-center justify-center rounded-full bg-[#FAF9F5] text-[#1A221E] font-editorial text-xl italic mb-6">
                  0{index + 1}
                </span>
                <h3 className="text-[16px] font-bold text-[#1A1D1B]">{step.title}</h3>
                <p className="mt-2 text-[14px] leading-[1.65] text-[#5F6761]">{step.description}</p>
                
                {index < reviewSteps.length - 1 && (
                   <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-[#D8D6CE]">
                      <ArrowRight className="size-5" />
                   </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. 현재 보험 유지 안내 CTA */}
      <section className="mt-20">
        <div className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-12">
           <div className="relative overflow-hidden rounded-[24px] bg-[#F4F2EC] px-8 py-12 md:px-12 lg:py-16 flex flex-col md:flex-row items-center justify-between border border-[#EBE8E1]">
              <div className="relative z-10 md:w-2/3">
                 <p className="text-[13px] font-bold text-[#A8742E]">현재 가입한 보험이 만족스러우신가요?</p>
                 <h2 className="mt-3 text-[28px] font-bold tracking-tight text-[#1A1D1B]">지금 보험이 괜찮다면, 그대로.</h2>
                 <p className="mt-3 text-[15px] leading-[1.65] text-[#5F6761] max-w-xl">
                   보장을 새로 고르는 것보다 중요한 건 지금 보장이 우리 아이에게 잘 맞는지 아는 것이에요. 
                   부담 없이 현재 보험을 유지하는 편이 낫다고 안내해 드립니다.
                 </p>
              </div>
              <div className="relative z-10 mt-8 md:mt-0 shrink-0">
                 <a href="/insurance" className="flex h-[52px] items-center justify-center rounded-full bg-[#1A221E] px-8 text-[15px] font-bold text-white transition-colors hover:bg-black">
                    우리 아이 보험 살펴보기 <ArrowRight className="ml-2 size-4" />
                 </a>
              </div>
           </div>
        </div>
      </section>

      {/* 6. FAQ + 1:1 문의 */}
      <section className="mt-12">
        <div className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-12 flex flex-col lg:flex-row gap-6">
          {/* FAQ (70%) */}
          <div className="lg:w-[70%] rounded-[24px] bg-white border border-[#EBE8E1] p-8 md:p-10">
            <h2 className="text-[20px] font-bold text-[#1A1D1B] mb-8">자주 묻는 질문</h2>
            <div className="flex flex-col gap-4">
              {content.faqs.map((faq) => {
                const isOpen = openFaqId === faq.id;
                return (
                  <div
                    key={faq.id}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaqId((current) => (current === faq.id ? null : faq.id))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setOpenFaqId((current) => (current === faq.id ? null : faq.id));
                      }
                    }}
                    className="rounded-xl bg-[#FAF9F5] cursor-pointer hover:bg-[#F4F2EC] transition-colors border border-transparent hover:border-[#EBE8E1] overflow-hidden"
                  >
                     <div className="flex items-center justify-between p-5">
                       <p className="text-[14px] font-bold text-[#1A1D1B]">{faq.q}</p>
                       <ChevronDown className={`size-4 text-[#5F6761] shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                     </div>
                     {isOpen && (
                       <div className="px-5 pb-5 pt-0">
                         <p className="text-[14px] text-[#5F6761] leading-[1.65]">{faq.a}</p>
                       </div>
                     )}
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* 1:1 문의 (30%) */}
          <div className="lg:w-[30%] rounded-[24px] bg-[#FAF9F5] border border-[#EBE8E1] p-8 md:p-10 flex flex-col justify-center">
             <h2 className="text-[18px] font-bold text-[#1A1D1B]">더 궁금한 점이 있으신가요?</h2>
             <p className="mt-2 text-[14px] text-[#5F6761]">언제든지 1:1 문의로 편하게 남겨주세요.</p>
             <a href="#" className="mt-8 inline-flex w-fit items-center rounded-full bg-white px-6 py-3 text-[14px] font-bold text-[#1A1D1B] border border-[#EBE8E1] transition-colors hover:bg-[#F4F2EC]">
               1:1 문의하기 <ArrowRight className="ml-1 size-3" />
             </a>
          </div>
        </div>
      </section>

      {/* 동의 문서 전문 모달 — '전문 보기' 클릭 시 관리자가 저장한 약관 전문을 그대로 보여준다. */}
      {openConsent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpenConsent(null)}>
          <div ref={consentDialogRef} role="dialog" aria-modal="true" aria-label={openConsent.title} className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-[20px] bg-[#FAF9F5]" onClick={(e) => e.stopPropagation()}>
            <div className="flex shrink-0 items-center justify-between border-b border-[#EBE8E1] px-6 py-5">
              <h2 className="text-[16px] font-bold text-[#1A1D1B]">{openConsent.title}</h2>
              <button ref={consentCloseButtonRef} type="button" aria-label="닫기" onClick={() => setOpenConsent(null)} className="rounded p-1 text-[#5F6761] transition-colors hover:bg-[#F4F2EC]">
                <X className="size-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-5">
              <p className="whitespace-pre-line text-[14px] leading-[1.7] text-[#4F5751]">{openConsent.body}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[#202521]">
        {label} {required && <span className="text-[#A8742E]">*</span>}
      </span>
      {children}
    </label>
  );
}
