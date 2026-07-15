'use client';

import { useEffect, useState } from 'react';
import AdminResourcePage from '@/components/admin/AdminResourcePage';
import { getKitsConfig, saveKitsConfig } from '@/lib/storage';
import { defaultKitsConfig } from '@/lib/kits/config';
import type { CareKit } from '@/types';

export default function AdminKitsPage() {
  // draft = 현재 편집 중인 키트 목록. 초기값은 기본 config, 마운트 후 콘센트로 실제 config 를 불러온다.
  const [items, setItems] = useState<CareKit[]>(defaultKitsConfig.items);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getKitsConfig()
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
    setItems((prev) => prev.filter((kit) => kit.id !== id));
  };

  const handleSave = () => (loadError ? Promise.resolve({ ok: false }) : saveKitsConfig({ items }));

  return (
    <AdminResourcePage
      title="케어 키트 관리"
      description={loadError ? '케어 키트 데이터를 불러오지 못했습니다. 저장을 막았습니다.' : '상황별 맞춤형 케어 키트 구성과 재고를 관리합니다.'}
      searchPlaceholder="키트명, 구성품 검색"
      filters={['전체 유형', '병원 비치용', '이벤트 증정용', '노출 숨김']}
      columns={[
        { key: 'name', label: '키트명' },
        { key: 'type', label: '키트 유형' },
        { key: 'target', label: '제공 대상' },
        { key: 'purpose', label: '제공 목적' },
        { key: 'items', label: '주요 구성품' },
        { key: 'stock', label: '재고 상태' },
        { key: 'status', label: '노출 상태' },
      ]}
      rows={items.map((kit) => ({
        id: kit.id,
        name: kit.name,
        type: kit.type === 'hospital' ? '병원 비치용' : '이벤트 증정용',
        target: kit.target,
        purpose: kit.purpose,
        items: kit.items.join(', '),
        stock: `${kit.stock}개`,
        status: kit.isVisible ? '노출중' : '숨김',
      }))}
      onDeleteRow={handleDelete}
      onSave={handleSave}
      disableEdit
    />
  );
}
