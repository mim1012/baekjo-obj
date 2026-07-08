'use client';

import { useState, useMemo } from 'react';
import { getOrders, updateOrderStatus } from '@/lib/storage';
import { formatDate, formatPrice } from '@/lib/format';
import { useMounted } from '@/lib/useMounted';
import { FileText, CreditCard, Truck, RefreshCcw } from 'lucide-react';
import Pagination from '@/components/admin/Pagination';

export default function AdminOrdersPage() {
  const mounted = useMounted();
  const [, refreshOrders] = useState(0);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('전체 상태');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('전체 상태');
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState('전체 상태');

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const handleStatusChange = (id: string, field: 'orderStatus' | 'paymentStatus' | 'deliveryStatus', value: string) => {
    updateOrderStatus(id, { [field]: value });
    refreshOrders((version) => version + 1);
  };

  const rawOrders = getOrders();
  
  const filteredOrders = useMemo(() => {
    let result = [...rawOrders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(order => 
        order.id.toLowerCase().includes(term) ||
        order.customerName.toLowerCase().includes(term) ||
        order.phone.includes(term) ||
        order.items.some(item => item.productName.toLowerCase().includes(term))
      );
    }
    
    if (orderStatusFilter !== '전체 상태') {
      result = result.filter(order => order.orderStatus === orderStatusFilter);
    }
    if (paymentStatusFilter !== '전체 상태') {
      result = result.filter(order => order.paymentStatus === paymentStatusFilter);
    }
    if (deliveryStatusFilter !== '전체 상태') {
      result = result.filter(order => order.deliveryStatus === deliveryStatusFilter);
    }
    
    return result;
  }, [rawOrders, searchTerm, orderStatusFilter, paymentStatusFilter, deliveryStatusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ITEMS_PER_PAGE));
  const paginatedOrders = useMemo(() => {
    return filteredOrders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [filteredOrders, currentPage, ITEMS_PER_PAGE]);

  if (!mounted) return null;

  // 통계 계산
  const totalCount = rawOrders.length;
  const paymentCompletedCount = rawOrders.filter(o => o.paymentStatus === '결제완료').length;
  const shippingCount = rawOrders.filter(o => o.deliveryStatus === '배송중').length;
  const canceledCount = rawOrders.filter(o => o.orderStatus === '취소완료' || o.orderStatus === '환불완료').length;

  return (
    <div>
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-[#202521]">주문 관리</h1>
          <p className="mt-2 text-sm text-[#737A74]">고객 주문 내역과 배송 상태를 관리합니다.</p>
        </div>
        <button type="button" onClick={() => alert('주문 등록 기능은 현재 모의 상태입니다.')} className="bg-[#2F3B34] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#2F3B34]/90 flex items-center gap-2">
          수기 주문 등록
        </button>
      </div>
      
      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-sm shadow-sm border border-gray-200">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-sm font-medium">전체 주문</span>
            <FileText className="w-5 h-5 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{totalCount}</div>
        </div>
        <div className="bg-white p-5 rounded-sm shadow-sm border border-gray-200">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-sm font-medium">결제완료</span>
            <CreditCard className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{paymentCompletedCount}</div>
        </div>
        <div className="bg-white p-5 rounded-sm shadow-sm border border-gray-200">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-sm font-medium">배송중</span>
            <Truck className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{shippingCount}</div>
        </div>
        <div className="bg-white p-5 rounded-sm shadow-sm border border-gray-200">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-sm font-medium">취소/환불</span>
            <RefreshCcw className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{canceledCount}</div>
        </div>
      </div>

      <div className="bg-white rounded-sm shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-wrap gap-4">
          <input 
            type="text" 
            placeholder="주문번호, 주문자명, 연락처, 상품명 검색" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#2F3B34]"
          />
          <div className="flex gap-2">
            <select 
              value={orderStatusFilter}
              onChange={(e) => setOrderStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#2F3B34]"
            >
              <option>전체 상태</option>
              <option>주문접수</option>
              <option>결제완료</option>
              <option>배송준비</option>
              <option>배송중</option>
              <option>배송완료</option>
              <option>취소요청</option>
              <option>취소완료</option>
              <option>환불완료</option>
            </select>
            <select 
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#2F3B34]"
            >
              <option>전체 상태</option>
              <option>결제대기</option>
              <option>결제완료</option>
              <option>결제취소</option>
              <option>환불완료</option>
            </select>
            <select 
              value={deliveryStatusFilter}
              onChange={(e) => setDeliveryStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#2F3B34]"
            >
              <option>전체 상태</option>
              <option>배송전</option>
              <option>배송준비</option>
              <option>배송중</option>
              <option>배송완료</option>
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-6 py-3 font-medium">주문일/주문번호</th>
                <th className="px-6 py-3 font-medium">주문자(연락처)</th>
                <th className="px-6 py-3 font-medium">주문 상품</th>
                <th className="px-6 py-3 font-medium">총 결제금액(결제수단)</th>
                <th className="px-6 py-3 font-medium">주문 상태</th>
                <th className="px-6 py-3 font-medium">결제 상태</th>
                <th className="px-6 py-3 font-medium">배송 상태</th>
                <th className="px-6 py-3 font-medium text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedOrders.map(order => {
                const itemSummary = order.items.length > 1 
                  ? `${order.items[0].productName} 외 ${order.items.length - 1}건` 
                  : order.items[0].productName;

                return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-gray-500 text-xs mb-1">{formatDate(order.createdAt)}</div>
                      <div className="font-medium text-[#2F3B34]">{order.id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{order.customerName}</div>
                      <div className="text-gray-500 text-xs">{order.phone}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-900 truncate max-w-[200px]" title={itemSummary}>
                      {itemSummary}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{formatPrice(order.totalPrice)}</div>
                      <div className="text-gray-500 text-xs">{order.paymentMethod}</div>
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={order.orderStatus} 
                        onChange={(e) => handleStatusChange(order.id, 'orderStatus', e.target.value)}
                        className={`border border-gray-300 rounded-full px-3 py-1 text-xs font-medium focus:outline-none ${
                          order.orderStatus === '주문접수' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                          order.orderStatus === '결제완료' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          order.orderStatus === '배송중' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                          order.orderStatus === '배송완료' ? 'bg-green-50 text-green-700 border-green-200' :
                          order.orderStatus.includes('취소') || order.orderStatus.includes('환불') ? 'bg-red-50 text-red-700 border-red-200' :
                          'bg-gray-50 text-gray-700 border-gray-200'
                        }`}
                      >
                        <option value="주문접수">주문접수</option>
                        <option value="결제완료">결제완료</option>
                        <option value="배송준비">배송준비</option>
                        <option value="배송중">배송중</option>
                        <option value="배송완료">배송완료</option>
                        <option value="취소요청">취소요청</option>
                        <option value="취소완료">취소완료</option>
                        <option value="환불완료">환불완료</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={order.paymentStatus} 
                        onChange={(e) => handleStatusChange(order.id, 'paymentStatus', e.target.value)}
                        className={`border border-gray-300 rounded-full px-3 py-1 text-xs font-medium focus:outline-none ${
                          order.paymentStatus === '결제대기' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                          order.paymentStatus === '결제완료' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-red-50 text-red-700 border-red-200'
                        }`}
                      >
                        <option value="결제대기">결제대기</option>
                        <option value="결제완료">결제완료</option>
                        <option value="결제취소">결제취소</option>
                        <option value="환불완료">환불완료</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={order.deliveryStatus} 
                        onChange={(e) => handleStatusChange(order.id, 'deliveryStatus', e.target.value)}
                        className={`border border-gray-300 rounded-full px-3 py-1 text-xs font-medium focus:outline-none ${
                          order.deliveryStatus === '배송중' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                          order.deliveryStatus === '배송완료' ? 'bg-green-50 text-green-700 border-green-200' :
                          'bg-gray-50 text-gray-700 border-gray-200'
                        }`}
                      >
                        <option value="배송전">배송전</option>
                        <option value="배송준비">배송준비</option>
                        <option value="배송중">배송중</option>
                        <option value="배송완료">배송완료</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <button onClick={() => alert('상세/수정 팝업이 뜰 예정입니다.')} className="text-[#2F3B34] hover:underline font-medium text-xs px-2 py-1.5 rounded-md mr-2">수정</button>
                      <button onClick={() => { if(window.confirm('정말로 삭제하시겠습니까?')) alert('삭제되었습니다.'); }} className="text-red-600 hover:underline font-medium text-xs px-2 py-1.5 rounded-md mr-2">삭제</button>
                      <button className="text-[#2F3B34] hover:underline font-medium text-xs border border-[#2F3B34] px-3 py-1.5 rounded-md">상세보기</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {filteredOrders.length === 0 && (
            <div className="py-24 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p className="text-gray-500">등록된 주문 내역이 없습니다.</p>
            </div>
          )}
          
          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredOrders.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>
    </div>
  );
}
