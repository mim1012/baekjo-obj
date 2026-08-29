'use client';

import React, { useState } from 'react';
import { DELIVERY_STATUSES } from '@/types';
import { CARRIER_CODES, CARRIER_LABELS } from '@/lib/carriers';
import { updateOrderShipment } from '@/lib/storage';
import { formatDate } from '@/lib/format';
import { shipmentUpdateErrorMessage } from './orderUpdateErrorMessage';
import type { BrandBundle } from './groupItemsByBrand';

interface BrandShipmentCardProps {
  orderId: string;
  brandName: string;
  bundle: BrandBundle;
  defaultCarrier?: string;
  /** 저장 성공 시 상위가 송장/주문을 재조회하도록 알린다. */
  onSaved: () => void | Promise<void>;
}

/** 배송 상태별 배지 스타일 — 어스톤/모노톤만(§6, 쨍한 원색 금지). */
function statusBadgeClass(status: string): string {
  switch (status) {
    case '배송준비':
      return 'bg-[#EFEBE1] text-[#7A6A48]';
    case '배송중':
      return 'bg-[#E4EAE4] text-[#3B5140]';
    case '배송완료':
      return 'bg-[#2F3B34] text-white';
    case '구매확정':
      return 'bg-[#2F3B34]/10 text-[#2F3B34]';
    default: // 배송전
      return 'bg-gray-100 text-gray-600';
  }
}

export default function BrandShipmentCard({
  orderId,
  brandName,
  bundle,
  defaultCarrier = '',
  onSaved,
}: BrandShipmentCardProps) {
  // 서버 현재값(props 파생) — 저장 후 상위 재조회로 props 가 갱신되면 isDirty 가 자연히 false 가 된다.
  const serverCarrier = bundle.shipment?.carrier ?? defaultCarrier;
  const serverTracking = bundle.shipment?.trackingNumber ?? '';
  const serverStatus = bundle.shipment?.deliveryStatus ?? '배송전';

  const [carrier, setCarrier] = useState(serverCarrier);
  const [trackingNumber, setTrackingNumber] = useState(serverTracking);
  const [deliveryStatus, setDeliveryStatus] = useState(serverStatus);
  const [isSaving, setIsSaving] = useState(false);

  // '구매확정'은 고객 버튼/자동확정 크론만 만드는 종결 상태 — 관리자는 편집할 수 없다(읽기 전용).
  const isConfirmed = serverStatus === '구매확정';

  const isDirty =
    !isConfirmed &&
    (carrier !== serverCarrier ||
      trackingNumber !== serverTracking ||
      deliveryStatus !== serverStatus);

  const itemSummary = bundle.items
    .map((item) => `${item.productName} x${item.quantity}`)
    .join(', ');

  const handleSave = async () => {
    // 운송장은 공백을 트림해 저장하고, 택배사 없이 운송장만 저장되는 걸 막는다 — 택배사가 없으면
    // 고객 조회 화면의 추적 링크를 만들 수 없어 조회가 깨진다('' = 택배사 해제는 그대로 허용).
    const trimmedTracking = trackingNumber.trim();
    if (trimmedTracking && !carrier) {
      alert('운송장 번호를 입력하려면 택배사를 먼저 선택해주세요.');
      return;
    }
    try {
      setIsSaving(true);
      await updateOrderShipment(orderId, bundle.brandId, {
        carrier,
        trackingNumber: trimmedTracking,
        deliveryStatus,
      });
      await onSaved(); // 성공 시 송장/주문 재조회로 카드·주문 단위 상태 갱신
    } catch (error) {
      // 실패 시 낙관적 갱신을 하지 않았으므로 안내만 — 서버 코드별로 구체 문구를 구분한다.
      alert(shipmentUpdateErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-md p-4 space-y-4 bg-white">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[15px] text-[#17201B] truncate">{brandName}</span>
            <span className={`px-2 py-0.5 rounded-full text-[12px] font-medium shrink-0 ${statusBadgeClass(serverStatus)}`}>
              {serverStatus}
            </span>
          </div>
          <p className="mt-1 text-[13px] text-gray-500 break-words">{itemSummary}</p>
          {(bundle.shipment?.shippedAt || bundle.shipment?.deliveredAt) && (
            <p className="mt-1 text-[12px] text-gray-400">
              {bundle.shipment?.shippedAt && `발송 ${formatDate(bundle.shipment.shippedAt)}`}
              {bundle.shipment?.shippedAt && bundle.shipment?.deliveredAt && ' · '}
              {bundle.shipment?.deliveredAt && `배송완료 ${formatDate(bundle.shipment.deliveredAt)}`}
            </p>
          )}
        </div>
      </div>

      {isConfirmed ? (
        <p className="text-[13px] text-gray-500">
          고객이 구매확정한 배송입니다. 관리자 배송 정보는 더 이상 수정할 수 없습니다.
        </p>
      ) : (
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <label className="flex-1 block">
            <span className="block text-[13px] font-medium text-[#17201B] mb-1">택배사</span>
            <select
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              disabled={isSaving}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-[#2F3B34] focus:ring-1 focus:ring-[#2F3B34] disabled:opacity-60"
            >
              <option value="">미지정</option>
              {CARRIER_CODES.map((code) => (
                <option key={code} value={code}>
                  {CARRIER_LABELS[code]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex-1 block">
            <span className="block text-[13px] font-medium text-[#17201B] mb-1">운송장</span>
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              disabled={isSaving}
              placeholder="예: 1234567890"
              maxLength={100}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-[#2F3B34] focus:ring-1 focus:ring-[#2F3B34] disabled:opacity-60"
            />
          </label>

          <label className="flex-1 block">
            <span className="block text-[13px] font-medium text-[#17201B] mb-1">배송상태</span>
            <select
              value={deliveryStatus}
              onChange={(e) => setDeliveryStatus(e.target.value)}
              disabled={isSaving}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-[#2F3B34] focus:ring-1 focus:ring-[#2F3B34] disabled:opacity-60"
            >
              {DELIVERY_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="px-5 py-2 rounded-md text-sm font-medium text-white bg-[#2F3B34] hover:bg-[#1f2823] disabled:opacity-50 shrink-0 min-w-[80px]"
          >
            {isSaving ? '저장 중...' : '저장'}
          </button>
        </div>
      )}
    </div>
  );
}
