'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { CustomerServiceRequest } from '@/types';
import { getAdminCustomerServiceRequests, updateAdminCustomerServiceRequest } from '@/lib/storage';
import { formatDate } from '@/lib/format';
import PageHeader from '@/components/admin-new/common/PageHeader';
import DataTable from '@/components/admin-new/common/DataTable';
import SummaryStrip from '@/components/admin-new/common/SummaryStrip';
import StatusBadge from '@/components/admin-new/common/StatusBadge';
import { nextCustomerServiceRequestStatuses } from '@/lib/orders/customerServiceState';

const STATUS_LABELS: Record<CustomerServiceRequest['status'], string> = {
  received: '접수', reviewing: '검토 중', approved: '승인', rejected: '반려', completed: '완료',
};

export default function OrderRequestsAdminPage() {
  const [requests, setRequests] = useState<CustomerServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | CustomerServiceRequest['status']>('all');
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    getAdminCustomerServiceRequests().then((items) => {
      if (!active) return;
      setRequests(items);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);
  const filtered = useMemo(() => filter === 'all' ? requests : requests.filter((request) => request.status === filter), [filter, requests]);

  const change = async (request: CustomerServiceRequest, status: CustomerServiceRequest['status']) => {
    const note = prompt('고객에게 표시할 처리 메모를 입력하세요. (선택)', request.adminNote ?? '');
    if (note === null) return;
    setBusy(request.id);
    try {
      const updated = await updateAdminCustomerServiceRequest(request.id, status, note);
      setRequests((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch { alert('처리 상태를 저장하지 못했습니다.'); }
    finally { setBusy(null); }
  };

  const columns = [
    { key: 'createdAt', header: '접수일', width: '110px', render: (request: CustomerServiceRequest) => formatDate(request.createdAt) },
    { key: 'orderId', header: '주문/판매자', render: (request: CustomerServiceRequest) => <div><Link href={`/admin/orders/${request.orderId}`} className="font-medium underline underline-offset-2">{request.orderId}</Link><p className="mt-1 text-xs text-gray-500">{request.sellerName || request.sellerKey}</p></div> },
    { key: 'type', header: '요청', width: '90px', render: (request: CustomerServiceRequest) => request.type === 'exchange' ? '교환' : '반품' },
    { key: 'reason', header: '사유', render: (request: CustomerServiceRequest) => <div className="max-w-md whitespace-normal"><p>{request.reason}</p>{request.adminNote && <p className="mt-1 text-xs text-[#A8742E]">처리 메모: {request.adminNote}</p>}</div> },
    { key: 'status', header: '상태', width: '100px', render: (request: CustomerServiceRequest) => <StatusBadge status={request.status === 'completed' || request.status === 'approved' ? 'success' : request.status === 'rejected' ? 'error' : request.status === 'reviewing' ? 'warning' : 'neutral'} label={STATUS_LABELS[request.status]} /> },
    { key: 'action', header: '처리', width: '140px', render: (request: CustomerServiceRequest) => {
      const nextStatuses = nextCustomerServiceRequestStatuses(request.status);
      return <select aria-label={`${request.orderId} 처리 상태`} disabled={busy === request.id || nextStatuses.length === 0} value={request.status} onChange={(event) => void change(request, event.target.value as CustomerServiceRequest['status'])} className="rounded border px-2 py-1.5 text-xs disabled:bg-gray-50"><option value={request.status}>{STATUS_LABELS[request.status]}</option>{nextStatuses.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select>;
    } },
  ];

  return <div className="space-y-6 pb-24"><PageHeader title="교환·반품 요청" description="고객이 판매자별로 접수한 요청을 확인하고 처리 상태와 안내 메모를 남깁니다." /><SummaryStrip items={[{ label: '전체', value: requests.length }, { label: '접수', value: requests.filter((item) => item.status === 'received').length }, { label: '검토 중', value: requests.filter((item) => item.status === 'reviewing').length }, { label: '처리 완료', value: requests.filter((item) => item.status === 'completed').length }]} /><div className="flex flex-wrap gap-2">{(['all', 'received', 'reviewing', 'approved', 'rejected', 'completed'] as const).map((status) => <button key={status} onClick={() => setFilter(status)} className={`rounded border px-3 py-2 text-xs ${filter === status ? 'border-[#17201B] bg-[#17201B] text-white' : 'bg-white'}`}>{status === 'all' ? '전체' : STATUS_LABELS[status]}</button>)}</div><DataTable data={filtered} columns={columns} keyExtractor={(request) => request.id} isLoading={loading} /></div>;
}
