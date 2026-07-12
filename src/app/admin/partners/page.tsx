'use client';

import { useEffect, useState } from 'react';
import AdminResourcePage from '@/components/admin/AdminResourcePage';
import { getPartnersConfig, savePartnersConfig } from '@/lib/storage';
import { defaultPartnersConfig } from '@/lib/partners/config';
import type { Partner } from '@/types';

export default function AdminPartnersPage() {
  // draft = 현재 편집 중인 제휴처 목록. 초기값은 기본 config, 마운트 후 콘센트로 실제 config 를 불러온다.
  const [items, setItems] = useState<Partner[]>(defaultPartnersConfig.items);

  useEffect(() => {
    let cancelled = false;
    getPartnersConfig().then((config) => {
      if (cancelled) return;
      setItems(config.items);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDelete = (id: string | number) => {
    setItems((prev) => prev.filter((partner) => partner.id !== id));
  };

  const handleSave = () => savePartnersConfig({ items });

  return (
    <AdminResourcePage
      title="B2B 제휴 관리"
      description="제휴 병원, 호텔 등 B2B 파트너십을 관리하고 키트 제공 현황을 파악합니다."
      actionLabel="제휴처 등록"
      searchPlaceholder="제휴처명, 담당자 검색"
      filters={['전체 유형', '동물병원', '호텔/리조트', '활성', '대기중']}
      columns={[
        { key: 'name', label: '제휴처명' },
        { key: 'type', label: '분류' },
        { key: 'cooperationType', label: '제휴 형태' },
        { key: 'contact', label: '담당자/연락처' },
        { key: 'status', label: '상태' },
      ]}
      rows={items.map((partner) => ({
        id: partner.id,
        name: partner.name,
        type: partner.type === 'hospital' ? '동물병원' : '호텔',
        cooperationType: partner.cooperationType,
        contact: `${partner.contactPerson} (${partner.phone})`,
        status: partner.status,
      }))}
      createFields={['제휴처명', '분류', '제휴 형태', '담당자', '연락처', '주소', '제공 키트', '상태']}
      onDeleteRow={handleDelete}
      onSave={handleSave}
    />
  );
}
