'use client';

import React, { useState } from 'react';
import { DELIVERY_STATUSES, ORDER_STATUSES, PAYMENT_STATUSES, type Order, type PaymentStatus } from '@/types';
import { updateOrderStatus } from '@/lib/storage';
import { CARRIER_CODES, CARRIER_LABELS } from '@/lib/carriers';
import { ALLOWED_MANUAL_PAYMENT_TRANSITIONS } from '@/lib/orders/paymentTransition';
import { orderUpdateErrorMessage } from './orderUpdateErrorMessage';
import { groupItemsByBrand } from './groupItemsByBrand';
import FormSection from '@/components/admin-new/common/FormSection';
import FormField from '@/components/admin-new/common/FormField';
import SaveBar from '@/components/admin-new/common/SaveBar';

interface OrderStatusPanelProps {
  order: Order;
  onUpdate: () => void | Promise<void>;
}

export default function OrderStatusPanel({ order, onUpdate }: OrderStatusPanelProps) {
  // 업체별 배송(OrderShipmentsPanel)이 그려지는 조건과 동일한 판정을 재사용한다: 모든 아이템에
  // brandId 스냅샷이 있으면 'per-brand'(브랜드 주문) — 이 경우 송장은 업체별 카드에서만 입력받고
  // 하단 패널의 택배사/운송장 입력은 숨겨 이중 입력(및 고객 조회 미노출) 함정을 막는다.
  const isBrandOrder = groupItemsByBrand(order.items, []).mode === 'per-brand';
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

  // 결제 상태 select 는 화이트리스트(paymentTransition.ts) 밖의 값을 골라도 저장 시점에야
  // 409로 걸러졌다 — 여기서 미리 옵션 자체를 잠가 관리자가 애초에 불가능한 전이를 고를 수 없게 한다.
  // 현재 값은 항상 선택 가능(무변경 저장), '승인중'·'환불완료'는 기존 정책대로 항상 잠금(자동 상태·
  // 전용 환불 처리로 유도).
  const allowedNextPaymentStatuses: readonly PaymentStatus[] =
    ALLOWED_MANUAL_PAYMENT_TRANSITIONS[order.paymentStatus as PaymentStatus] ?? [];

  const handleSave = async () => {
    // 운송장은 공백을 트림해 저장하고, 택배사 없이 운송장만 저장되는 걸 막는다(브랜드 주문은 이
    // 패널에서 택배사/운송장을 아예 숨기므로 이 검사 대상이 아니다).
    const trimmedTracking = formData.trackingNumber.trim();
    if (!isBrandOrder && trimmedTracking && !formData.carrier) {
      alert('운송장 번호를 입력하려면 택배사를 먼저 선택해주세요.');
      return;
    }

    // 주문 취소완료는 재고 복원을 동반하는 되돌리기 어려운 처리라 저장 전에 한 번 더 확인한다
    // (DepositConfirmButton 확인창과 같은 톤).
    if (formData.orderStatus === '취소완료' && order.orderStatus !== '취소완료') {
      const confirmed = window.confirm(
        `${order.id} 주문을 취소완료 처리하시겠습니까?\n\n` +
          `· 재고가 복원되고, 결제 상태에 따라 취소 기록이 함께 남을 수 있습니다.\n\n` +
          `이 처리는 되돌릴 수 없으니 신중히 진행해주세요.`,
      );
      if (!confirmed) return;
    }

    try {
      setIsSaving(true);
      // 브랜드 주문은 이 패널의 택배사/운송장 입력을 숨기지만, formData에는 초기값이 여전히
      // 실려 있을 수 있다 — 저장 payload에서 명시적으로 제외해 shipments 테이블과 무관한
      // orders 테이블 필드로 조용히 새어나가는 걸 막는다(관리자 이중 입력 함정 방지).
      const payload = isBrandOrder
        ? {
            orderStatus: formData.orderStatus,
            paymentStatus: formData.paymentStatus,
            deliveryStatus: formData.deliveryStatus,
            deliveryMemo: formData.deliveryMemo,
          }
        : { ...formData, trackingNumber: trimmedTracking };
      await updateOrderStatus(order.id, payload);
      await onUpdate();
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <FormField
            label="주문 상태"
            description="접수와 취소 처리만 관리합니다."
            className="rounded-lg border border-[#E7E0D3] bg-[#FBFAF6] p-4"
          >
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

          <FormField
            label="결제 상태"
            description="입금확인 또는 PG 승인 결과가 반영됩니다. 환불은 전용 환불 처리에서 진행합니다."
            className="rounded-lg border border-[#E7E0D3] bg-[#FBFAF6] p-4"
          >
            <select
              value={formData.paymentStatus}
              onChange={(e) => handleChange('paymentStatus', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-[#2F3B34] focus:ring-1 focus:ring-[#2F3B34]"
            >
              {PAYMENT_STATUSES.map((status) => {
                // '승인중'·'환불완료'는 기존 정책대로 항상 잠금. 그 외는 현재 값이거나
                // paymentTransition.ts 화이트리스트가 허용하는 다음 상태일 때만 선택 가능하다.
                const isLocked = status === '승인중' || status === '환불완료';
                const isCurrent = status === order.paymentStatus;
                const disabled =
                  isLocked || (!isCurrent && !allowedNextPaymentStatuses.includes(status));
                return (
                  <option key={status} value={status} disabled={disabled}>
                    {status === '승인중'
                      ? '승인중(자동)'
                      : status === '환불완료'
                        ? '환불완료(전용 환불 처리)'
                        : status}
                  </option>
                );
              })}
            </select>
          </FormField>

          <FormField
            label="배송 상태"
            description="배송 준비부터 배송완료까지만 관리합니다."
            className="rounded-lg border border-[#E7E0D3] bg-[#FBFAF6] p-4"
          >
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

          {isBrandOrder ? (
            <FormField label="택배사 · 운송장 번호" className="md:col-span-3">
              <p className="rounded-md border border-[#E7E0D3] bg-[#FBFAF6] px-3 py-2 text-[13px] leading-relaxed text-gray-600">
                브랜드 주문은 아래 &lsquo;업체별 배송 관리&rsquo;에서 송장을 입력하세요.
              </p>
            </FormField>
          ) : (
            <>
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
            </>
          )}

          <FormField label="배송 메모" description="주문 시 고객이 남긴 배송 요청사항입니다." className="md:col-span-3">
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
