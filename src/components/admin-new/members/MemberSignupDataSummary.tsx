'use client';

import React from 'react';
import { FileText, Link as LinkIcon } from 'lucide-react';

const FIELD_LABELS: Record<string, string> = {
  brandName: '브랜드명',
  companyName: '회사명',
  ceoName: '대표자명',
  businessNumber: '사업자등록번호',
  businessType: '사업자 유형',
  establishedYear: '설립연도',
  website: '웹사이트',
  instagram: '인스타그램',
  address: '사업장 주소',
  managerName: '담당자명',
  contact: '담당자 연락처',
  email: '담당자 이메일',
  companyTagline: '회사 소개 한 줄',
  brandTagline: '브랜드 소개 한 줄',
  mainServices: '주요 서비스',
  providedServices: '제공 서비스',
  operationHours: '운영 시간',
  serviceArea: '서비스 지역',
  startMotivation: '브랜드 시작 배경',
  joinReason: '입점/제휴 희망 사유',
  repProductName: '대표 상품명',
  salesCategory: '판매 카테고리',
  launchDate: '출시일',
  manufacturingMethod: '제조 방식',
  repProductDescription: '대표 상품 설명',
  differentiation: '차별점',
  currentSalesChannels: '현재 판매 채널',
  monthlyProductionCapacity: '월 생산 가능량',
  philosophy: '브랜드 철학',
  attachedFiles: '첨부 파일',
} as const;

const DOCUMENT_LABELS: Record<string, string> = {
  attachBizLicense: '사업자등록증',
  attachMedicalLicense: '동물병원 인허가증',
  attachFuneralLicense: '장례식장 인허가증',
  attachEntrustLicense: '위탁/제휴 증빙',
  attachBeautyLicense: '미용/펫샵 관련 인허가증',
  attachOtherLicense: '기타 인허가 서류',
  attachCompanyIntro: '회사 소개서',
  attachServiceIntro: '서비스 소개서',
  attachFacilityPhoto: '시설 사진',
  attachCert: '인증서',
  attachEtc: '기타 첨부',
  safetyTestReport: '안전성 시험성적서',
  safetyCert: '안전 인증',
  safetyPatent: '특허 자료',
  safetyTrademark: '상표 등록 자료',
  safetyDesign: '디자인 등록 자료',
  safetyEtc: '기타 안전 자료',
} as const;

const AGREEMENT_LABELS: Record<string, string> = {
  privacyAgreement: '개인정보 및 자료 활용 동의',
  auditAgreement: '브랜드 Audit 동의',
} as const;

const HIDDEN_KEYS = new Set(['password', 'passwordConfirm']);

interface MemberSignupDataSummaryProps {
  data: Record<string, unknown>;
}

type UploadedFile = {
  readonly category?: string;
  readonly name: string;
  readonly path?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toText(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? '예' : '아니오';
  if (Array.isArray(value)) return value.map(toText).filter(Boolean).join(', ');
  if (isRecord(value)) {
    return Object.entries(value)
      .map(([key, nestedValue]) => `${FIELD_LABELS[key] ?? key}: ${toText(nestedValue)}`)
      .filter((line) => !line.endsWith(': '))
      .join(' / ');
  }
  return '';
}

function toUploadedFile(value: unknown): UploadedFile | null {
  if (!isRecord(value) || typeof value.name !== 'string' || value.name.trim() === '') return null;
  return {
    category: typeof value.category === 'string' ? value.category : undefined,
    name: value.name.trim(),
    path: typeof value.path === 'string' && value.path.trim() !== '' ? value.path : undefined,
  };
}

function humanizeKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}

function isDocumentKey(key: string): boolean {
  return key in DOCUMENT_LABELS;
}

function isAgreementKey(key: string): boolean {
  return key in AGREEMENT_LABELS;
}

function SignupValue({ value }: { value: unknown }) {
  if (Array.isArray(value)) {
    const uploadedFiles = value.map(toUploadedFile).filter((file): file is UploadedFile => file !== null);
    if (uploadedFiles.length > 0) {
      return (
        <ul className="space-y-2">
          {uploadedFiles.map((file) => (
            <li key={`${file.category ?? 'file'}-${file.name}`} className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-[#687069]" />
              <span>{file.category ? `${file.category} · ${file.name}` : file.name}</span>
              {file.path && (
                <a href={file.path} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#2F3B34] underline">
                  보기 <LinkIcon className="h-3 w-3" />
                </a>
              )}
            </li>
          ))}
        </ul>
      );
    }
  }

  return <span className="whitespace-pre-wrap">{toText(value) || '-'}</span>;
}

export default function MemberSignupDataSummary({ data }: MemberSignupDataSummaryProps) {
  const fields = Object.entries(data).filter(
    ([key, value]) => !HIDDEN_KEYS.has(key) && !isDocumentKey(key) && !isAgreementKey(key) && toText(value) !== '',
  );
  const documents = Object.entries(data).filter(([key, value]) => isDocumentKey(key) && value === true);
  const agreements = Object.entries(data).filter(([key, value]) => isAgreementKey(key) && value === true);

  return (
    <div className="space-y-4">
      {documents.length > 0 && (
        <div className="rounded-md border border-gray-200 bg-white p-3">
          <div className="mb-2 text-[12px] font-semibold text-gray-500">제출 서류</div>
          <div className="flex flex-wrap gap-2">
            {documents.map(([key]) => (
              <span key={key} className="rounded-md border border-[#D1D0C8] bg-[#FBFAF7] px-2.5 py-1 text-[12px] font-medium text-[#17201B]">
                {DOCUMENT_LABELS[key]}
              </span>
            ))}
          </div>
        </div>
      )}

      {fields.length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {fields.map(([key, value]) => (
            <div key={key} className="rounded-md border border-gray-200 bg-white p-3">
              <div className="mb-1 text-[12px] font-semibold text-gray-500">{FIELD_LABELS[key] ?? humanizeKey(key)}</div>
              <div className="text-[13px] leading-relaxed text-[#17201B]">
                <SignupValue value={value} />
              </div>
            </div>
          ))}
        </div>
      )}

      {agreements.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {agreements.map(([key]) => (
            <span key={key} className="rounded-md bg-[#F4F2EC] px-2.5 py-1 text-[12px] font-medium text-[#4F5751]">
              {AGREEMENT_LABELS[key]} 완료
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
