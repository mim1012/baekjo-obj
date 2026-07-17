'use client';

import { useEffect, useState } from 'react';
import AdminResourcePage from '@/components/admin/AdminResourcePage';
import { getAdminPartnerInquiries, updatePartnerInquiryStatus } from '@/lib/storage';
import { formatDate } from '@/lib/format';
import {
  PARTNER_INQUIRY_STATUSES,
  type PartnerInquiry,
  type PartnerInquiryStatus,
} from '@/types';

const PARTNER_TYPE_LABELS: Record<PartnerInquiry['partnerType'], string> = {
  hospital: '동물병원',
  funeral: '장례식장',
  brand: '브랜드',
  petshop: '펫샵',
  hotel: '호텔',
  etc: '기타',
};

const SUMMARY_MAX = 40;

function summarize(message: string): string {
  return message.length > SUMMARY_MAX ? `${message.slice(0, SUMMARY_MAX)}…` : message;
}

/**
 * B2B 제휴 문의 접수함. 공개 랜딩 폼(POST /api/partner-inquiries) 제출이 쌓이는 곳이라
 * 신규 등록 버튼은 없다(onCreateRow 미지정). status/memo 는 수정 모달(formFields)로 draft 에
 * 반영한 뒤 상단 저장 버튼(onSave)이 PATCH 콘센트로 일괄 반영한다(partners 관리자 배치 저장 패턴).
 */
export default function AdminPartnerInquiriesPage() {
  const [inquiries, setInquiries] = useState<PartnerInquiry[]>([]);
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());

  // 콘센트 계약상 실패는 빈 배열로 접힌다(getAdminPartnerInquiries) — 별도 오류 상태 불필요.
  useEffect(() => {
    getAdminPartnerInquiries().then(setInquiries);
  }, []);

  const handleUpdate = (id: string | number, draft: Record<string, string | number>) => {
    const status = String(draft.status ?? '') as PartnerInquiryStatus;
    if (!PARTNER_INQUIRY_STATUSES.includes(status)) return;
    const memo = String(draft.memo ?? '');
    setInquiries((current) =>
      current.map((inquiry) =>
        inquiry.id === String(id) ? { ...inquiry, status, memo } : inquiry,
      ),
    );
    setDirtyIds((prev) => new Set(prev).add(String(id)));
  };

  const handleSave = async () => {
    try {
      const targets = inquiries.filter((inquiry) => dirtyIds.has(inquiry.id));
      for (const target of targets) {
        await updatePartnerInquiryStatus(target.id, target.status, target.memo ?? '');
      }
      setDirtyIds(new Set());
      setInquiries(await getAdminPartnerInquiries());
      return { ok: true };
    } catch {
      return { ok: false };
    }
  };

  const rows = inquiries.map((inquiry) => ({
    id: inquiry.id,
    companyName: inquiry.companyName,
    partnerType: PARTNER_TYPE_LABELS[inquiry.partnerType] ?? inquiry.partnerType,
    contact: `${inquiry.contactPerson} · ${inquiry.phone}`,
    summary: summarize(inquiry.message),
    status: inquiry.status,
    date: formatDate(inquiry.createdAt),
    memo: inquiry.memo ?? '',
  }));

  return (
    <div className="p-6">
      <AdminResourcePage
        title="제휴 문의 접수"
        description="케어키트 랜딩에서 접수된 B2B 제휴 문의를 확인하고 상담 상태를 관리합니다."
        searchPlaceholder="업체명·담당자·문의 내용 검색..."
        filters={['전체 상태', ...PARTNER_INQUIRY_STATUSES]}
        columns={[
          { key: 'companyName', label: '업체명' },
          { key: 'partnerType', label: '유형' },
          { key: 'contact', label: '담당자·연락처' },
          { key: 'summary', label: '문의요약' },
          { key: 'status', label: '상태' },
          { key: 'date', label: '접수일' },
        ]}
        rows={rows}
        formFields={[
          {
            key: 'status',
            label: '상태',
            type: 'select',
            options: PARTNER_INQUIRY_STATUSES.map((status) => ({ value: status, label: status })),
          },
          { key: 'memo', label: '메모', type: 'textarea' },
        ]}
        onUpdateRow={handleUpdate}
        onSave={handleSave}
        renderExpandedRow={(row) => {
          const inquiry = inquiries.find((item) => item.id === row.id);
          if (!inquiry) return null;
          return (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-[#697269]">문의 전문</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[#4F5751]">
                  {inquiry.message}
                </p>
              </div>
              <div className="grid gap-2 text-sm text-[#4F5751] sm:grid-cols-2">
                <p>
                  <span className="text-xs font-semibold text-[#697269]">이메일</span>{' '}
                  {inquiry.email}
                </p>
                <p>
                  <span className="text-xs font-semibold text-[#697269]">연락처</span>{' '}
                  {inquiry.phone}
                </p>
              </div>
              {inquiry.memo && (
                <div>
                  <p className="text-xs font-semibold text-[#697269]">관리자 메모</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-[#4F5751]">{inquiry.memo}</p>
                </div>
              )}
            </div>
          );
        }}
      />
    </div>
  );
}
