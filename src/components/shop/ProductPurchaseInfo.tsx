import { Clock, MapPin, Phone, RotateCcw, Truck } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import type { BrandShippingPolicy } from '@/types';
import { CARRIER_LABELS } from '@/lib/carriers';

interface ProductPurchaseInfoProps {
  brandShipping?: BrandShippingPolicy;
}

const nonBlank = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

export default function ProductPurchaseInfo({ brandShipping }: ProductPurchaseInfoProps) {
  if (!brandShipping) return null;

  const shippingLabel =
    brandShipping.shippingFeeLabel ??
    (brandShipping.shippingFee === 0
      ? '무료배송'
      : brandShipping.shippingFee !== undefined
        ? formatPrice(brandShipping.shippingFee)
        : undefined);
  const dispatchLabel = nonBlank(brandShipping.dispatchEstimate);
  const freeShippingLabel = brandShipping.freeShippingThreshold !== undefined
    ? `${formatPrice(brandShipping.freeShippingThreshold)} 이상 구매 시`
    : undefined;
  const extraFeeLabel = nonBlank(brandShipping.extraFeeNotice);
  const returnLabel = nonBlank(brandShipping.returnPolicy);
  const returnExclusionsLabel = nonBlank(brandShipping.returnExclusions);
  const returnAddressLabel = nonBlank(brandShipping.returnAddress);
  const asLabel = nonBlank(brandShipping.asNotice);
  const carrierLabel = nonBlank(brandShipping.carrierLabel);
  const defaultCarrierLabel = brandShipping.defaultCarrier
    ? CARRIER_LABELS[brandShipping.defaultCarrier]
    : undefined;
  const supportContactLabel = nonBlank(brandShipping.supportContact);
  const supportHoursLabel = nonBlank(brandShipping.supportHours);
  const hasPolicy = Boolean(
    shippingLabel ||
      carrierLabel ||
      defaultCarrierLabel ||
      dispatchLabel ||
      freeShippingLabel ||
      extraFeeLabel ||
      returnLabel ||
      brandShipping.returnShippingFee !== undefined ||
      brandShipping.exchangeShippingFee !== undefined ||
      returnExclusionsLabel ||
      returnAddressLabel ||
      asLabel ||
      supportContactLabel ||
      supportHoursLabel,
  );
  if (!hasPolicy) return null;

  return (
    <section aria-labelledby="purchase-information-title" className="mt-8 rounded-3xl border border-[#E7E0D5] bg-[#FAF8F3] p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 id="purchase-information-title" className="text-base font-bold text-[#17211D]">
          배송·교환·반품 안내
        </h2>
      </div>
      <dl className="grid gap-5 text-sm text-[#17211D] sm:grid-cols-2">
        {shippingLabel && <InfoRow icon={Truck} title="배송비" description={shippingLabel} />}
        {freeShippingLabel && <InfoRow icon={Truck} title="무료배송 기준" description={freeShippingLabel} />}
        {extraFeeLabel && <InfoRow icon={Truck} title="지역 추가배송비" description={extraFeeLabel} />}
        {dispatchLabel && (
          <InfoRow icon={Truck} title="출고 예정" description={dispatchLabel} />
        )}
        {carrierLabel && <InfoRow icon={Truck} title="배송 운영" description={carrierLabel} />}
        {defaultCarrierLabel && <InfoRow icon={Truck} title="기본 택배사" description={defaultCarrierLabel} />}
        {brandShipping.returnShippingFee !== undefined && (
          <InfoRow icon={RotateCcw} title="반품 배송비" description={formatPrice(brandShipping.returnShippingFee)} />
        )}
        {brandShipping.exchangeShippingFee !== undefined && (
          <InfoRow icon={RotateCcw} title="교환 배송비" description={formatPrice(brandShipping.exchangeShippingFee)} />
        )}
        {returnAddressLabel && (
          <InfoRow icon={MapPin} title="반품/교환 주소" description={returnAddressLabel} />
        )}
        {returnLabel && (
          <InfoRow icon={RotateCcw} title="교환/반품 정책" description={returnLabel} />
        )}
        {returnExclusionsLabel && (
          <InfoRow icon={RotateCcw} title="교환/반품 제한" description={returnExclusionsLabel} />
        )}
        {asLabel && (
          <InfoRow icon={RotateCcw} title="A/S 안내" description={asLabel} />
        )}
        {supportContactLabel && <InfoRow icon={Phone} title="고객지원 연락처" description={supportContactLabel} />}
        {supportHoursLabel && <InfoRow icon={Clock} title="고객지원 시간" description={supportHoursLabel} />}
      </dl>
    </section>
  );
}

interface InfoRowProps {
  icon: typeof Truck;
  title: string;
  description: string;
}

function InfoRow({ icon: Icon, title, description }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3">
      <Icon aria-hidden="true" className="mt-1 size-4 shrink-0 text-[#A8742E]" />
      <div>
        <dt className="text-xs font-semibold text-[#59615B]">{title}</dt>
        <dd className="mt-1 break-keep leading-6">{description}</dd>
      </div>
    </div>
  );
}
