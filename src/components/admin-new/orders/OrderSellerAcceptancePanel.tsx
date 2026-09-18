'use client';

import { useState } from 'react';
import type { Order, SellerAcceptance } from '@/types';
import { updateOrderSellerAcceptance } from '@/lib/storage';

const LABELS: Record<SellerAcceptance['status'], string> = { pending: '접수 대기', accepted: '판매자 수락', rejected: '판매자 거절', cancelled: '묶음 취소' };

export default function OrderSellerAcceptancePanel({ order, onUpdate }: { order: Order; onUpdate: (order: Order) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  if (!order.sellerGroups?.length) return null;

  const change = async (sellerKey: string, status: SellerAcceptance['status']) => {
    const current = order.sellerAcceptances?.find((item) => item.sellerKey === sellerKey);
    const note = window.prompt('판매자 접수 메모를 입력하세요. (선택)', current?.note ?? '');
    if (note === null) return;
    setBusy(sellerKey);
    try {
      const updated = await updateOrderSellerAcceptance(order.id, sellerKey, status, note);
      onUpdate({ ...order, sellerAcceptances: [...(order.sellerAcceptances ?? []).filter((item) => item.sellerKey !== sellerKey), updated] });
    } catch { window.alert('판매자 접수 상태를 저장하지 못했습니다.'); }
    finally { setBusy(null); }
  };

  return (
    <section className="rounded-md border border-gray-200 bg-white p-5" aria-labelledby="seller-acceptance-title">
      <h2 id="seller-acceptance-title" className="text-[15px] font-semibold text-[#17201B]">판매자별 주문 수락</h2>
      <p className="mt-1 text-xs text-gray-500">결제 상태와 별개입니다. 실제 판매자가 제작·출고 가능한지 묶음별로 기록합니다.</p>
      <div className="mt-4 space-y-3">
        {order.sellerGroups.map((group) => {
          const acceptance = order.sellerAcceptances?.find((item) => item.sellerKey === group.key);
          return <div key={group.key} className="flex flex-wrap items-center justify-between gap-3 rounded border bg-[#F7F8F6] p-3"><div><p className="text-sm font-semibold">{group.seller.displayName}</p><p className="mt-1 text-xs text-gray-500">{LABELS[acceptance?.status ?? 'pending']}{acceptance?.note ? ` · ${acceptance.note}` : ''}</p></div><select disabled={busy === group.key} value={acceptance?.status ?? 'pending'} onChange={(event) => void change(group.key, event.target.value as SellerAcceptance['status'])} className="rounded border bg-white px-3 py-2 text-xs"><option value="pending">접수 대기</option><option value="accepted">판매자 수락</option><option value="rejected">판매자 거절</option><option value="cancelled">묶음 취소</option></select></div>;
        })}
      </div>
    </section>
  );
}
