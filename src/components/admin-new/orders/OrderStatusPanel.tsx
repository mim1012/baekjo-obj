'use client';

import React, { useState } from 'react';
import { DELIVERY_STATUSES, isDerivedOrderStatus, ORDER_STATUSES, PAYMENT_STATUSES, type Order, type PaymentStatus } from '@/types';
import { updateOrderStatus } from '@/lib/storage';
import { ALLOWED_MANUAL_PAYMENT_TRANSITIONS } from '@/lib/orders/paymentTransition';
import { orderUpdateErrorMessage } from './orderUpdateErrorMessage';
import { groupItemsByBrand } from './groupItemsByBrand';
import FormSection from '@/components/admin-new/common/FormSection';
import FormField from '@/components/admin-new/common/FormField';
import SaveBar from '@/components/admin-new/common/SaveBar';
import CarrierSelect from './CarrierSelect';

interface OrderStatusPanelProps {
  order: Order;
  onUpdate: () => void | Promise<void>;
}

export default function OrderStatusPanel({ order, onUpdate }: OrderStatusPanelProps) {
  // 업체별 배송(OrderShipmentsPanel)이 그려지는 조건과 동일한 판정을 재사용한다: 모든 아이템에
  // brandId 스냅샷이 있으면 'per-brand'(브랜드 주문) — 이 경우 송장은 업체별 카드에서만 입력받고
  // 하단 패널의 택배사/운송장 입력은 숨겨 이중 입력(및 고객 조회 미노출) 함정을 막는다.
  const isBrandOrder = groupItemsByBrand(order.items, []).mode === 'per-brand';
  // 부분취소/부분취소완료는 아이템 레벨 취소 처리에서 파생되는 상태다(ORDER_STATUSES 관리자
  // 화이트리스트 밖) — select에 이 값을 올리면 옵션 목록에 없는 값이라 표시가 깨지고, 저장 시
  // 서버(admin/orders/[id]/route.ts validate())가 화이트리스트 밖 값이라 통째로 400 거부한다.
  // 현재 상태가 파생값이면 select 대신 읽기 전용 텍스트로 보여주고, 저장 payload에도 절대
  // 싣지 않는다(§10-9 드리프트 방지 — 관리자가 파생 상태를 수기로 세팅하는 경로를 열지 않는다).
  const orderStatusIsDerived = isDerivedOrderStatus(order.orderStatus);
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
      // 변경된 필드만 payload에 싣는다 — admin/orders/[id]/route.ts의 validate()는 orderStatus가
      // 오면 ORDER_STATUSES(파생 상태 제외) 화이트리스트로 검사하므로, 파생 상태(부분취소/
      // 부분취소완료)인 주문을 무변경으로 저장할 때 orderStatus를 그대로 다시 보내면 통째로
      // 400을 받는다(위 isDerivedOrderStatus 코멘트와 같은 함정). 브랜드 주문은 이 패널의
      // 택배사/운송장 입력을 아예 숨기므로 그 두 필드는 원천 제외한다(관리자 이중 입력 함정 방지).
      const payload: Partial<
        Pick<Order, 'orderStatus' | 'paymentStatus' | 'deliveryStatus' | 'trackingNumber' | 'carrier' | 'deliveryMemo'>
      > = {};
      if (!orderStatusIsDerived && formData.orderStatus !== order.orderStatus) {
        payload.orderStatus = formData.orderStatus;
      }
      if (formData.paymentStatus !== order.paymentStatus) {
        payload.paymentStatus = formData.paymentStatus;
      }
      if (formData.deliveryStatus !== order.deliveryStatus) {
        payload.deliveryStatus = formData.deliveryStatus;
      }
      if (formData.deliveryMemo !== (order.deliveryMemo || '')) {
        payload.deliveryMemo = formData.deliveryMemo;
      }
      if (!isBrandOrder) {
        // 서버 검증은 트래킹 번호가 있으면 반드시 carrier도 같은 요청에 있어야 한다고 요구한다
        // (택배사 없이 운송장만 저장되는 걸 막는 가드) — 둘 중 하나만 바뀌어도 항상 함께 보내
        // "변경분만 전송" 규칙과 그 페어링 요구를 동시에 지킨다.
        const trackingChanged = trimmedTracking !== (order.trackingNumber || '');
        const carrierChanged = formData.carrier !== (order.carrier || '');
        if (trackingChanged || carrierChanged) {
          payload.trackingNumber = trimmedTracking;
          payload.carrier = formData.carrier;
        }
      }
      if (Object.keys(payload).length > 0) {
        await updateOrderStatus(order.id, payload);
      }
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
        {order.orderStatus === '취소요청' && (
          <p className="mb-4 rounded-md border border-[#A65348]/30 bg-[#FBFAF7] px-4 py-3 text-[13px] leading-relaxed text-[#A65348]">
            고객이 주문 취소를 요청했습니다. 결제완료 주문은 먼저 환불 처리한 뒤 주문 상태를 취소완료로 저장하세요.
          </p>
        )}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <FormField
            label="주문 상태"
            description={
              orderStatusIsDerived
                ? '아이템별 취소 처리에서 자동 계산되는 상태라 수기로 바꿀 수 없습니다.'
                : '접수와 취소 처리만 관리합니다.'
            }
            className="rounded-lg border border-[#E7E0D3] bg-[#FBFAF6] p-4"
          >
            {orderStatusIsDerived ? (
              <p className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-[#17201B]">
                {order.orderStatus}
              </p>
            ) : (
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
            )}
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
                <CarrierSelect
                  value={formData.carrier}
                  onChange={(value) => handleChange('carrier', value)}
                />
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
