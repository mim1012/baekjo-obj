'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Truck } from 'lucide-react';
import { getAdminOrderShipments, getAdminBrands } from '@/lib/storage';
import type { Brand, Order, Shipment } from '@/types';
import FormSection from '@/components/admin-new/common/FormSection';
import { groupItemsByBrand } from './groupItemsByBrand';
import BrandShipmentCard from './BrandShipmentCard';

interface OrderShipmentsPanelProps {
  order: Order;
  /** 주문 단위 파생 상태(서버가 자동 갱신)를 다시 읽도록 상위에 알린다. */
  onUpdate: () => void;
}

/**
 * 업체별 묶음배송 관리 패널. 한 주문에 여러 브랜드 상품이 섞여 있으면 브랜드마다 독립된
 * 택배사/운송장/배송상태 카드를 그린다. 모든 아이템에 brandId 스냅샷이 있어야 하며,
 * 레거시 주문(brandId 결손)은 주문 단위 단일배송(OrderStatusPanel)으로 폴백한다.
 * 데이터는 §4 콘센트(storage.ts)로만 흐른다 — 컴포넌트에서 직접 fetch 하지 않는다.
 */
export default function OrderShipmentsPanel({ order, onUpdate }: OrderShipmentsPanelProps) {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [brandMap, setBrandMap] = useState<Record<string, Brand>>({});
  const [loading, setLoading] = useState(true);

  // 저장 성공 시 송장을 재조회해 카드를 갱신하고, 주문 단위 파생 상태도 다시 읽는다.
  const refresh = useCallback(async () => {
    const rows = await getAdminOrderShipments(order.id);
    setShipments(rows);
    onUpdate();
  }, [order.id, onUpdate]);

  useEffect(() => {
    let active = true;
    (async () => {
      const [rows, brands] = await Promise.all([
        getAdminOrderShipments(order.id),
        getAdminBrands(),
      ]);
      if (!active) return;
      setShipments(rows);
      setBrandMap(Object.fromEntries(brands.map((b) => [b.id, b])));
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [order.id]);

  const grouping = groupItemsByBrand(order.items, shipments);

  return (
    <FormSection
      title={
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5" /> 업체별 배송 관리
        </div>
      }
      description="한 주문에 여러 업체 상품이 섞여 있으면 업체마다 택배사·운송장을 따로 등록합니다."
    >
      {loading ? (
        <p className="text-[13px] text-gray-400">배송 정보를 불러오는 중입니다...</p>
      ) : grouping.mode === 'legacy' ? (
        <p className="text-[13px] text-gray-500 leading-relaxed">
          이 주문은 업체 정보가 없는 레거시 단일배송 주문입니다. 아래{' '}
          <span className="font-medium text-[#17201B]">&lsquo;상태 변경 및 관리&rsquo;</span> 패널의
          택배사·운송장 필드를 사용하세요.
        </p>
      ) : (
        <div className="space-y-4">
          {grouping.bundles.map((bundle) => (
            <BrandShipmentCard
              key={bundle.brandId}
              orderId={order.id}
              brandName={brandMap[bundle.brandId]?.name || bundle.brandId}
              bundle={bundle}
              defaultCarrier={brandMap[bundle.brandId]?.shipping?.defaultCarrier}
              onSaved={refresh}
            />
          ))}
        </div>
      )}
    </FormSection>
  );
}
