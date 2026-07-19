import { Clock, MapPin, Phone, RotateCcw, Truck } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import { CARRIER_LABELS } from '@/lib/carriers';
import type { Brand } from '@/types';

interface BrandShippingInfoProps {
  brand: Brand;
}

interface ShippingRow {
  icon: typeof Truck;
  title: string;
  description: string;
}

/** brand.shipping 은 필드가 전부 optional이라, 값이 하나도 없으면 섹션 자체를 렌더하지 않는다. */
export default function BrandShippingInfo({ brand }: BrandShippingInfoProps) {
  const shipping = brand.shipping;
  if (!shipping) return null;

  const rows: ShippingRow[] = [];

  if (shipping.shippingFee !== undefined) {
    rows.push({
      icon: Truck,
      title: '배송비',
      description: shipping.shippingFee === 0 ? '무료배송' : formatPrice(shipping.shippingFee),
    });
  }
  if (shipping.freeShippingThreshold !== undefined) {
    rows.push({
      icon: Truck,
      title: '무료배송 기준',
      description: `${formatPrice(shipping.freeShippingThreshold)} 이상 구매 시`,
    });
  }
  if (shipping.dispatchEstimate) {
    rows.push({ icon: Clock, title: '출고 예정', description: shipping.dispatchEstimate });
  }
  if (shipping.defaultCarrier) {
    rows.push({ icon: Truck, title: '기본 택배사', description: CARRIER_LABELS[shipping.defaultCarrier] });
  }
  if (shipping.returnShippingFee !== undefined) {
    rows.push({ icon: RotateCcw, title: '반품 배송비', description: formatPrice(shipping.returnShippingFee) });
  }
  if (shipping.exchangeShippingFee !== undefined) {
    rows.push({ icon: RotateCcw, title: '교환 배송비', description: formatPrice(shipping.exchangeShippingFee) });
  }
  if (shipping.returnAddress) {
    rows.push({ icon: MapPin, title: '반품/교환 주소', description: shipping.returnAddress });
  }
  if (shipping.asNotice) {
    rows.push({ icon: Phone, title: 'A/S 안내', description: shipping.asNotice });
  }
  if (shipping.supportContact) {
    rows.push({ icon: Phone, title: '고객지원 연락처', description: shipping.supportContact });
  }
  if (shipping.supportHours) {
    rows.push({ icon: Clock, title: '고객지원 시간', description: shipping.supportHours });
  }

  if (rows.length === 0) return null;

  return (
    <section className="mb-10 md:mb-12">
      <div className="mx-auto w-full max-w-[1120px] px-5 md:px-6 lg:px-8">
        <div className="rounded-[18px] border border-[#E2DACD] bg-[#FFFEFB] p-5 shadow-[0_4px_24px_rgba(23,37,31,0.03)] md:p-6">
          <h2 className="mb-4 text-[15px] font-bold text-[#17251F] md:text-[16px]">배송·교환·반품 안내</h2>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            {rows.map((row) => (
              <div key={row.title} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F8F6F0] text-[#B58A4C]">
                  <row.icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <div>
                  <dt className="text-[12px] font-semibold text-[#6F756F]">{row.title}</dt>
                  <dd className="mt-1 break-keep text-[13px] leading-[1.6] text-[#17251F] md:text-[14px]">{row.description}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
