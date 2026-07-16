'use client';

import { useEffect, useState } from 'react';
import AdminResourcePage from '@/components/admin/AdminResourcePage';
import { getPartnersConfig, savePartnersConfig } from '@/lib/storage';
import { defaultPartnersConfig } from '@/lib/partners/config';
import type { Partner } from '@/types';

const partnerTypeOptions: Array<{ value: Partner['type']; label: string }> = [
  { value: 'hospital', label: '동물병원' },
  { value: 'funeral', label: '장례식장' },
  { value: 'brand', label: '브랜드' },
  { value: 'petshop', label: '펫샵' },
  { value: 'hotel', label: '호텔/리조트' },
  { value: 'etc', label: '기타' },
];

const partnerStatuses: Partner['status'][] = [
  '문의',
  '상담중',
  '제안서 발송',
  '계약 검토',
  '계약 완료',
  '납품 준비',
  '운영중',
  '보류',
  '종료',
];

const partnerStatusOptions: Array<{ value: Partner['status']; label: string }> = partnerStatuses.map((status) => ({ value: status, label: status }));

const booleanOptions = [
  { value: 'false', label: '아니오' },
  { value: 'true', label: '예' },
];

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function hasDraftValue(draft: Record<string, string | number>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(draft, key);
}

function draftText(
  draft: Record<string, string | number>,
  key: string,
  previousValue: string | undefined,
  defaultValue: string,
): string {
  return hasDraftValue(draft, key) ? asText(draft[key]) || defaultValue : previousValue || defaultValue;
}

function draftOptionalText(
  draft: Record<string, string | number>,
  key: string,
  previousValue: string | undefined,
): string | undefined {
  if (!hasDraftValue(draft, key)) return previousValue;
  return asText(draft[key]) || undefined;
}

function draftList(
  draft: Record<string, string | number>,
  key: string,
  previousValue: string[] | undefined,
): string[] {
  return hasDraftValue(draft, key) ? splitList(draft[key]) : previousValue ?? [];
}

function createPartnerId(): string {
  return `partner-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
}

function splitList(value: unknown): string[] {
  return asText(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function asPartnerType(value: unknown): Partner['type'] {
  return partnerTypeOptions.some((option) => option.value === value) ? value as Partner['type'] : 'etc';
}

function asPartnerStatus(value: unknown): Partner['status'] {
  return partnerStatusOptions.some((option) => option.value === value) ? value as Partner['status'] : '문의';
}

function asBoolean(value: unknown): boolean {
  return value === true || value === 'true';
}

function draftToPartner(draft: Record<string, string | number>, previous?: Partner): Partner {
  const status = hasDraftValue(draft, 'status') ? asPartnerStatus(draft.status) : previous?.status ?? '문의';
  const contractedFallback = status === '계약 완료' || status === '운영중';

  return {
    id: previous?.id ?? createPartnerId(),
    name: draftText(draft, 'name', previous?.name, '새 제휴처'),
    type: hasDraftValue(draft, 'type') ? asPartnerType(draft.type) : previous?.type ?? 'etc',
    contactPerson: draftText(draft, 'contactPerson', previous?.contactPerson, '-'),
    phone: draftText(draft, 'phone', previous?.phone, '-'),
    address: draftText(draft, 'address', previous?.address, '-'),
    cooperationType: draftText(draft, 'cooperationType', previous?.cooperationType, '-'),
    providedKits: draftList(draft, 'providedKits', previous?.providedKits),
    status,
    memo: draftOptionalText(draft, 'memo', previous?.memo),
    isContracted: hasDraftValue(draft, 'isContracted') ? asBoolean(draft.isContracted) : previous?.isContracted ?? contractedFallback,
    isDelivered: hasDraftValue(draft, 'isDelivered') ? asBoolean(draft.isDelivered) : previous?.isDelivered ?? status === '운영중',
  };
}

function typeLabel(type: Partner['type']): string {
  return partnerTypeOptions.find((option) => option.value === type)?.label ?? '기타';
}

export default function AdminPartnersPage() {
  // draft = 현재 편집 중인 제휴처 목록. 초기값은 기본 config, 마운트 후 콘센트로 실제 config 를 불러온다.
  const [items, setItems] = useState<Partner[]>(defaultPartnersConfig.items);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getPartnersConfig()
      .then((config) => {
        if (cancelled) return;
        setLoadError(false);
        setItems(config.items);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDelete = (id: string | number) => {
    setItems((prev) => prev.filter((partner) => partner.id !== id));
  };

  const handleCreate = (draft: Record<string, string | number>) => {
    setItems((prev) => [...prev, draftToPartner(draft)]);
  };

  const handleUpdate = (id: string | number, draft: Record<string, string | number>) => {
    setItems((prev) => prev.map((partner) => (partner.id === id ? draftToPartner(draft, partner) : partner)));
  };

  const handleSave = () => (loadError ? Promise.resolve({ ok: false }) : savePartnersConfig({ items }));

  return (
    <AdminResourcePage
      title="B2B 제휴 관리"
      description={loadError ? '제휴처 데이터를 불러오지 못했습니다. 저장을 막았습니다.' : '제휴 병원, 호텔 등 B2B 파트너십을 관리하고 키트 제공 현황을 파악합니다.'}
      actionLabel="제휴처 등록"
      searchPlaceholder="제휴처명, 담당자 검색"
      filters={['전체 유형', '동물병원', '호텔/리조트', '활성', '대기중']}
      columns={[
        { key: 'name', label: '제휴처명' },
        { key: 'typeLabel', label: '분류' },
        { key: 'cooperationType', label: '제휴 형태' },
        { key: 'contact', label: '담당자/연락처' },
        { key: 'status', label: '상태' },
      ]}
      rows={items.map((partner) => ({
        id: partner.id,
        name: partner.name,
        type: partner.type,
        typeLabel: typeLabel(partner.type),
        cooperationType: partner.cooperationType,
        contactPerson: partner.contactPerson,
        phone: partner.phone,
        contact: `${partner.contactPerson} (${partner.phone})`,
        address: partner.address,
        providedKits: partner.providedKits.join(', '),
        status: partner.status,
        memo: partner.memo ?? '',
        isContracted: String(partner.isContracted),
        isDelivered: String(partner.isDelivered),
      }))}
      formFields={[
        { key: 'name', label: '제휴처명' },
        { key: 'type', label: '분류', type: 'select', options: partnerTypeOptions },
        { key: 'cooperationType', label: '제휴 형태' },
        { key: 'contactPerson', label: '담당자' },
        { key: 'phone', label: '연락처' },
        { key: 'address', label: '주소' },
        { key: 'providedKits', label: '제공 키트(쉼표 구분)' },
        { key: 'status', label: '상태', type: 'select', options: partnerStatusOptions },
        { key: 'isContracted', label: '계약 완료 여부', type: 'select', options: booleanOptions },
        { key: 'isDelivered', label: '납품 완료 여부', type: 'select', options: booleanOptions },
        { key: 'memo', label: '메모', type: 'textarea' },
      ]}
      onCreateRow={handleCreate}
      onUpdateRow={handleUpdate}
      onDeleteRow={handleDelete}
      onSave={handleSave}
    />
  );
}
