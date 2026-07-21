'use client';

import React, { useState } from 'react';
import { DELIVERY_STATUSES, ORDER_STATUSES, PAYMENT_STATUSES, type Order } from '@/types';
import { updateOrderStatus } from '@/lib/storage';
import { CARRIER_CODES, CARRIER_LABELS } from '@/lib/carriers';
import { orderUpdateErrorMessage } from './orderUpdateErrorMessage';
import FormSection from '@/components/admin-new/common/FormSection';
import FormField from '@/components/admin-new/common/FormField';
import SaveBar from '@/components/admin-new/common/SaveBar';

interface OrderStatusPanelProps {
  order: Order;
  onUpdate: () => void;
}

export default function OrderStatusPanel({ order, onUpdate }: OrderStatusPanelProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    deliveryStatus: order.deliveryStatus,
    trackingNumber: order.trackingNumber || '',
    carrier: order.carrier || '',
    deliveryMemo: order.deliveryMemo || '',
  });

  const isDirty =
    formData.orderStatus !== order.orderStatus ||
    formData.paymentStatus !== order.paymentStatus ||
    formData.deliveryStatus !== order.deliveryStatus ||
    formData.trackingNumber !== (order.trackingNumber || '') ||
    formData.carrier !== (order.carrier || '') ||
    formData.deliveryMemo !== (order.deliveryMemo || '');

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateOrderStatus(order.id, formData);
      onUpdate(); // refresh data
    } catch (error) {
      alert(orderUpdateErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <FormSection
        title="상태 변경 및 관리"
        description="값을 변경하면 화면 하단에 저장바가 나타납니다. 저장하기를 눌러야 실제 DB에 반영됩니다."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField label="주문 상태">
            <select
              value={formData.orderStatus}
              onChange={(e) => handleChange('orderStatus', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-[#2F3B34] focus:ring-1 focus:ring-[#2F3B34]"
            >
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="결제 상태">
            <select
              value={formData.paymentStatus}
              onChange={(e) => handleChange('paymentStatus', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-[#2F3B34] focus:ring-1 focus:ring-[#2F3B34]"
            >
              {PAYMENT_STATUSES.map((status) => (
                <option key={status} value={status} disabled={status === '승인중'}>
                  {status === '승인중' ? '승인중(자동)' : status}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="배송 상태">
            <select
              value={formData.deliveryStatus}
              onChange={(e) => handleChange('deliveryStatus', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-[#2F3B34] focus:ring-1 focus:ring-[#2F3B34]"
            >
              {DELIVERY_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="택배사" className="md:col-span-1">
            <select
              value={formData.carrier}
              onChange={(e) => handleChange('carrier', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-[#2F3B34] focus:ring-1 focus:ring-[#2F3B34]"
            >
              <option value="">선택 안 함</option>
              {CARRIER_CODES.map((code) => (
                <option key={code} value={code}>
                  {CARRIER_LABELS[code]}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="운송장 번호" className="md:col-span-2">
            <input
              type="text"
              value={formData.trackingNumber}
              onChange={(e) => handleChange('trackingNumber', e.target.value)}
              placeholder="예: 1234567890"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-[#2F3B34] focus:ring-1 focus:ring-[#2F3B34]"
            />
          </FormField>

          <FormField label="관리자 메모" className="md:col-span-3">
            <textarea
              value={formData.deliveryMemo}
              onChange={(e) => handleChange('deliveryMemo', e.target.value)}
              placeholder="고객 요청사항이나 배송 관련 특이사항을 기록합니다."
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-[#2F3B34] focus:ring-1 focus:ring-[#2F3B34]"
            />
          </FormField>
        </div>
      </FormSection>

      <SaveBar
        isDirty={isDirty}
        isSaving={isSaving}
        message="주문 상태 변경사항이 있습니다. 하단의 저장하기를 눌러 DB에 반영하세요."
        saveLabel="상태 저장하기"
        onSave={handleSave}
        onCancel={() => {
          setFormData({
            orderStatus: order.orderStatus,
            paymentStatus: order.paymentStatus,
            deliveryStatus: order.deliveryStatus,
            trackingNumber: order.trackingNumber || '',
            carrier: order.carrier || '',
            deliveryMemo: order.deliveryMemo || '',
          });
        }}
      />
    </>
  );
}
