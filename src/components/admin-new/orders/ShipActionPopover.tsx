'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Truck } from 'lucide-react';
import type { Brand, Order } from '@/types';
import { CARRIER_CODES, CARRIER_LABELS } from '@/lib/carriers';
import { updateOrderShipment } from '@/lib/storage';
import { groupItemsByBrand } from './groupItemsByBrand';

interface ShipActionPopoverProps {
  order: Order;
  /** id→Brand 맵(상위가 getAdminBrands 로 한 번만 읽어 전달) — 기본 택배사·업체명 프리필용. */
  brandMap: Record<string, Brand>;
  /** 발송 성공 시 상위가 주문을 재조회해 파생 배송상태를 갱신하도록 알린다. */
  onShipped: () => void | Promise<void>;
}

/**
 * 발송대기 행의 [발송처리] 팝오버. 단일 업체 주문이면 택배사·운송장을 바로 입력해 발송(배송중)
 * 처리하고, 여러 업체가 섞였거나 brandId 결손(레거시) 주문이면 업체별 발송이 필요하므로 상세로 보낸다.
 * 세밀한 업체별 배송은 상세(OrderShipmentsPanel)가 정본이라, 목록에선 가장 흔한 단일 업체만 빠르게 처리한다.
 * 데이터는 §4 콘센트(storage.updateOrderShipment)로만 흐른다 — 서버가 주문 단위 배송상태·shippedAt 을 파생한다.
 */
export default function ShipActionPopover({ order, brandMap, onShipped }: ShipActionPopoverProps) {
  const grouping = groupItemsByBrand(order.items, []);
  const singleBrandId =
    grouping.mode === 'per-brand' && grouping.bundles.length === 1
      ? grouping.bundles[0].brandId
      : null;

  const defaultCarrier = singleBrandId ? brandMap[singleBrandId]?.shipping?.defaultCarrier ?? '' : '';

  const [open, setOpen] = useState(false);
  const [carrier, setCarrier] = useState(defaultCarrier);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [saving, setSaving] = useState(false);

  const openPopover = () => {
    // 열 때마다 기본 택배사로 프리필을 초기화한다(브랜드 맵이 늦게 로드된 경우 대비).
    setCarrier(defaultCarrier);
    setTrackingNumber('');
    setOpen(true);
  };

  // 택배사·운송장이 모두 채워졌을 때만 발송을 허용한다. 서버(validateAdminShipmentPatch)는 ''를
  // 값 해제 신호로 받아들여 빈 값 발송이 그대로 통과하는데, 그러면 고객이 배송조회를 못 하는 '배송중'
  // 주문이 생긴다 — 이 팝오버의 존재 이유가 송장 수집이므로 클라이언트에서 먼저 막는다.
  const canShip = carrier !== '' && trackingNumber.trim().length > 0;

  const handleShip = async () => {
    if (!singleBrandId || !canShip) return;
    try {
      setSaving(true);
      await updateOrderShipment(order.id, singleBrandId, {
        carrier,
        trackingNumber: trackingNumber.trim(),
        deliveryStatus: '배송중',
      });
      setOpen(false);
      await onShipped();
    } catch {
      alert('발송 처리에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPopover())}
        className="inline-flex items-center gap-1 text-white bg-[#2F3B34] hover:bg-[#232B25] font-medium text-xs px-3 py-1.5 rounded-md"
      >
        <Truck className="w-3.5 h-3.5" /> 발송처리
      </button>

      {open && (
        <>
          {/* 바깥 클릭으로 닫기 */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 z-20 mt-2 w-72 rounded-md border border-gray-200 bg-white p-4 shadow-lg text-left">
            {singleBrandId ? (
              <div className="space-y-3">
                <p className="text-[13px] font-semibold text-[#17201B]">
                  {brandMap[singleBrandId]?.name || singleBrandId} 발송
                </p>
                <label className="block">
                  <span className="block text-[12px] font-medium text-gray-600 mb-1">택배사</span>
                  <select
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    disabled={saving}
                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:border-[#2F3B34] focus:ring-1 focus:ring-[#2F3B34] disabled:opacity-60"
                  >
                    <option value="">미지정</option>
                    {CARRIER_CODES.map((code) => (
                      <option key={code} value={code}>
                        {CARRIER_LABELS[code]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="block text-[12px] font-medium text-gray-600 mb-1">운송장</span>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    disabled={saving}
                    placeholder="예: 1234567890"
                    maxLength={100}
                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:border-[#2F3B34] focus:ring-1 focus:ring-[#2F3B34] disabled:opacity-60"
                  />
                </label>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    disabled={saving}
                    className="px-3 py-1.5 rounded-md text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleShip}
                    disabled={saving || !canShip}
                    className="px-4 py-1.5 rounded-md text-xs font-medium text-white bg-[#2F3B34] hover:bg-[#1f2823] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? '발송 중...' : '발송'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[13px] text-gray-600 leading-relaxed">
                  여러 업체 상품이 섞였거나 업체 정보가 없는 주문입니다. 업체별 발송은 상세에서
                  진행하세요.
                </p>
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="inline-block text-[#2F3B34] hover:underline font-medium text-xs border border-[#2F3B34] px-3 py-1.5 rounded-md"
                >
                  상세에서 발송하기
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
