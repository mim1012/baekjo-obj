'use client';

import { useEffect, useState } from 'react';
import { getAllOrders, getInsuranceApplications, getAdminProducts } from '@/lib/storage';
import { formatPrice } from '@/lib/format';
import { Package, FileText, DollarSign, TrendingUp } from 'lucide-react';
import { useMounted } from '@/lib/useMounted';
import type { Order, Product } from '@/types';

export default function AdminDashboard() {
  const mounted = useMounted();
  // 주문은 서버(관리자)에서 비동기로. 보험 신청은 이번 범위 밖이라 그대로 둔다.
  // 로딩 중과 실제 0건/0원을 구분해야 첫 프레임에 빈 통계가 잠깐 노출되지 않는다.
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getAllOrders(), getAdminProducts()]).then(([orderList, productList]) => {
      if (cancelled) return;
      setOrders(orderList);
      setProducts(productList);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!mounted || loading) {
    return <p className="p-12 text-center text-sm text-[#7B827C]">대시보드 불러오는 중…</p>;
  }

  const insuranceApps = getInsuranceApplications();
  const totalSales = orders.reduce((sum, order) => sum + order.totalPrice, 0);
  const pendingOrders = orders.filter((order) => order.orderStatus === '주문접수').length;
  const pendingInsurance = insuranceApps.filter(a => a.status === '신청완료').length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">대시보드</h1>
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-sm shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">누적 매출</h3>
            <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center"><DollarSign className="h-5 w-5" /></div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatPrice(totalSales)}</div>
        </div>
        
        <div className="bg-white p-6 rounded-sm shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">신규 주문</h3>
            <div className="h-10 w-10 bg-green-50 text-green-600 rounded-lg flex items-center justify-center"><Package className="h-5 w-5" /></div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{pendingOrders}건</div>
        </div>

        <div className="bg-white p-6 rounded-sm shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">보험 분석 대기</h3>
            <div className="h-10 w-10 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center"><FileText className="h-5 w-5" /></div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{pendingInsurance}건</div>
        </div>

        <div className="bg-white p-6 rounded-sm shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">등록 상품 수</h3>
            <div className="h-10 w-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center"><TrendingUp className="h-5 w-5" /></div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{products.length}개</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Orders */}
        <div className="bg-white rounded-sm shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900">최근 주문</h3>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-6 py-3 font-medium">주문자</th>
                  <th className="px-6 py-3 font-medium">결제금액</th>
                  <th className="px-6 py-3 font-medium">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.slice(0, 5).map(order => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">{order.customerName}</td>
                    <td className="px-6 py-4">{formatPrice(order.totalPrice)}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">{order.orderStatus}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Insurance */}
        <div className="bg-white rounded-sm shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900">최근 보험 분석 신청</h3>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-6 py-3 font-medium">반려동물</th>
                  <th className="px-6 py-3 font-medium">보호자</th>
                  <th className="px-6 py-3 font-medium">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {insuranceApps.slice(0, 5).map(app => (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">{app.petName} ({app.petBreed})</td>
                    <td className="px-6 py-4">{app.ownerName}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">{app.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
