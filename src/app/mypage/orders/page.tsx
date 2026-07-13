'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, ChevronRight } from 'lucide-react';
import { getMyOrders } from '@/lib/storage';
import { formatPrice, formatDate } from '@/lib/format';
import type { Order } from '@/types';
import EmptyState from '@/components/common/EmptyState';

export default function MypageOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getMyOrders().then((list) => {
      if (cancelled) return;
      const sorted = [...list].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setOrders(sorted);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="bg-[#FFFEFB] p-6 md:p-8 rounded-sm shadow-sm border border-[#E2DACD]">
      <h2 className="text-lg font-bold text-[#17251F] flex items-center mb-6">
        <Package className="mr-2 h-5 w-5 text-[#16382D]" /> 주문 및 배송 내역
      </h2>
      
      {loading ? (
        <div className="py-10 text-center text-[#6F756F] bg-[#F8F6F0] rounded-sm">주문 내역을 불러오는 중…</div>
      ) : orders.length === 0 ? (
        <EmptyState 
          title="주문 내역이 없습니다."
          description="백조오브제의 프리미엄 상품을 둘러보고 첫 주문을 시작해 보세요."
          actionLabel="상품 보러 가기"
          actionHref="/shop"
          compact
        />
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="border border-[#E2DACD] rounded-sm p-5">
              <div className="flex justify-between items-center border-b border-[#E2DACD] pb-3 mb-3 text-sm">
                <span className="font-bold text-[#17251F]">{formatDate(order.createdAt)}</span>
                <Link href="#" className="text-[#6F756F] hover:text-[#16382D] flex items-center">
                  상세보기 <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </div>
              {order.items.map((item, idx) => (
                <div key={idx} className="flex gap-4 py-2">
                  <div className="h-16 w-16 bg-[#F2EEE6] rounded-lg flex items-center justify-center text-xs text-[#A19D93]">이미지</div>
                  <div className="flex-1">
                    <div className="font-medium text-[#17251F]">{item.productName}</div>
                    <div className="text-sm text-[#6F756F] mt-1">{item.optionName ? `${item.optionName} / ` : ''}{item.quantity}개</div>
                    <div className="font-bold text-[#16382D] mt-1">{formatPrice(item.price * item.quantity)}</div>
                  </div>
                  <div className="flex items-center justify-center">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#E4E8E3] text-[#2F3B34]">
                      {order.orderStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
