'use client';

import { useEffect, useRef, useState } from 'react';
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
 * 신규 등록 버튼은 없다(onCreateRow 미지정). status/memo 는 수정 모달에서 저장하는 즉시
 * PATCH 콘센트로 반영한다 — 상단 일괄 저장(onSave) 단계는 "반영했는데 새로고침하면
 * 되돌아온다" 오인을 낳아 제거했다(2026-07-18 즉시저장 전환, notices·partners 패턴 미러).
 */
export default function AdminPartnerInquiriesPage() {
  const [inquiries, setInquiries] = useState<PartnerInquiry[]>([]);
  // PATCH 상호배제 — 연타·동시 수정이 서로를 덮어쓰는 레이스 방지(즉시저장 공통 패턴).
  const busyRef = useRef(false);

  // 콘센트 계약상 실패는 빈 배열로 접힌다(getAdminPartnerInquiries) — 별도 오류 상태 불필요.
  useEffect(() => {
    getAdminPartnerInquiries().then(setInquiries);
  }, []);

  const handleUpdate = async (id: string | number, draft: Record<string, string | number>) => {
    if (busyRef.current) return;
    const status = String(draft.status ?? '') as PartnerInquiryStatus;
    if (!PARTNER_INQUIRY_STATUSES.includes(status)) return;
    const memo = String(draft.memo ?? '');
    busyRef.current = true;
    try {
      // 콘센트 계약: 실패는 throw — 성공했을 때만 로컬 목록을 갱신한다.
      await updatePartnerInquiryStatus(String(id), status, memo);
      setInquiries((current) =>
        current.map((inquiry) =>
          inquiry.id === String(id) ? { ...inquiry, status, memo } : inquiry,
        ),
      );
    } catch {
      window.alert('상태 저장에 실패했습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.');
    } finally {
      busyRef.current = false;
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
        description="케어키트 랜딩에서 접수된 B2B 제휴 문의를 확인하고 상담 상태를 관리합니다. 수정 내용은 저장 즉시 반영됩니다."
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
