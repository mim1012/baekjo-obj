'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Edit2, Plus, Search, Trash2 } from 'lucide-react';
import type { Seller } from '@/types';
import { deleteSeller, getAdminSellers } from '@/lib/storage';
import PageHeader from '@/components/admin-new/common/PageHeader';
import DataTable from '@/components/admin-new/common/DataTable';
import StatusBadge from '@/components/admin-new/common/StatusBadge';
import SummaryStrip from '@/components/admin-new/common/SummaryStrip';
import SellerForm from '@/components/admin-new/sellers/SellerForm';
import { formatPrice } from '@/lib/format';

export default function SellersPage() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [editing, setEditing] = useState<Seller | null | undefined>(undefined);

  const load = useCallback(async () => {
    setLoading(true);
    setSellers(await getAdminSellers());
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    getAdminSellers().then((items) => {
      if (!active) return;
      setSellers(items);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    if (!needle) return sellers;
    return sellers.filter((seller) => [seller.displayName, seller.legalName, seller.businessRegistrationNumber, seller.representativeName].some((value) => value.toLowerCase().includes(needle)));
  }, [keyword, sellers]);

  const remove = async (seller: Seller) => {
    if (!confirm(`${seller.displayName} 판매자를 삭제하시겠습니까?\n상품에 연결된 판매자는 삭제할 수 없습니다.`)) return;
    try { await deleteSeller(seller.id); await load(); }
    catch (error) { alert(error instanceof Error && error.message === 'seller-in-use' ? '상품에 연결된 판매자는 삭제할 수 없습니다. 판매 중지 상태로 바꿔주세요.' : '삭제하지 못했습니다.'); }
  };

  const columns = [
    { key: 'displayName', header: '판매자', render: (seller: Seller) => <div><strong>{seller.displayName}</strong><p className="mt-1 text-xs text-gray-500">{seller.legalName} · 대표 {seller.representativeName}</p></div> },
    { key: 'registration', header: '사업자 정보', render: (seller: Seller) => <div className="text-xs leading-5"><p>{seller.businessRegistrationNumber}</p><p className="text-gray-500">{seller.mailOrderRegistrationNumber}</p></div> },
    { key: 'contact', header: '고객 연락처', render: (seller: Seller) => <div className="text-xs leading-5"><p>{seller.phone}</p><p className="text-gray-500">{seller.email || '이메일 미입력'}</p></div> },
    { key: 'shipping', header: '배송 정책', render: (seller: Seller) => <div className="text-xs leading-5"><p>기본 {seller.shippingFee === 0 ? '무료' : formatPrice(seller.shippingFee)}</p><p className="text-gray-500">{seller.freeShippingThreshold === undefined ? '무료배송 기준 없음' : `${formatPrice(seller.freeShippingThreshold)} 이상 무료`}</p></div> },
    { key: 'status', header: '상태', width: '110px', render: (seller: Seller) => <StatusBadge status={seller.status === 'verified' ? 'success' : seller.status === 'suspended' ? 'error' : 'neutral'} label={seller.status === 'verified' ? '검증 완료' : seller.status === 'suspended' ? '판매 중지' : '작성 중'} /> },
    { key: 'actions', header: '관리', width: '120px', align: 'right' as const, render: (seller: Seller) => <div className="flex justify-end gap-1"><button onClick={() => setEditing(seller)} className="rounded p-2 hover:bg-gray-100" aria-label={`${seller.displayName} 수정`}><Edit2 size={16} /></button><button onClick={() => void remove(seller)} className="rounded p-2 text-red-600 hover:bg-red-50" aria-label={`${seller.displayName} 삭제`}><Trash2 size={16} /></button></div> },
  ];

  return (
    <div className="space-y-6 pb-24">
      <PageHeader title="판매자 관리" description="브랜드와 별개로 실제 계약·배송·반품을 책임지는 사업자를 관리합니다."><button onClick={() => setEditing(null)} className="flex items-center gap-2 rounded bg-[#17201B] px-4 py-2 text-sm font-semibold text-white"><Plus size={16} />새 판매자 등록</button></PageHeader>
      <SummaryStrip items={[{ label: '전체 판매자', value: sellers.length }, { label: '검증 완료', value: sellers.filter((seller) => seller.status === 'verified').length }, { label: '작성 중', value: sellers.filter((seller) => seller.status === 'draft').length }, { label: '판매 중지', value: sellers.filter((seller) => seller.status === 'suspended').length }]} />
      <div className="relative max-w-sm"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={keyword} onChange={(e) => setKeyword(e.target.value)} className="w-full rounded border border-gray-300 py-2 pl-9 pr-3 text-sm" placeholder="판매자명·사업자번호 검색" /></div>
      <DataTable data={filtered} columns={columns} keyExtractor={(seller) => seller.id} isLoading={loading} />
      {editing !== undefined && <SellerForm seller={editing} onClose={() => setEditing(undefined)} onSaved={async () => { setEditing(undefined); await load(); }} />}
    </div>
  );
}
