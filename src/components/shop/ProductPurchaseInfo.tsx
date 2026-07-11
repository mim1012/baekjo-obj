import { RotateCcw, Store, Truck } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import type { Product } from '@/types';

interface ProductPurchaseInfoProps {
  product: Product;
}

export default function ProductPurchaseInfo({ product }: ProductPurchaseInfoProps) {
  const deliveryLabel = product.deliveryEstimate ?? product.shippingNotice ?? '판매 일정과 함께 안내할게요.';
  const returnLabel = product.returnNotice ?? '판매가 시작되면 교환과 반품 기준도 함께 안내할게요.';
  const shippingLabel =
    product.shippingFee === 0
      ? '무료 배송'
      : product.shippingFee !== undefined
        ? formatPrice(product.shippingFee)
        : '판매 일정과 함께 안내할게요.';

  return (
    <section aria-labelledby="purchase-information-title" className="mt-8 rounded-3xl border border-[#E7E0D5] bg-[#FAF8F3] p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 id="purchase-information-title" className="text-base font-bold text-[#17211D]">
          배송과 구매 안내
        </h2>
        <span className="text-xs text-[#6F766F]">주문 전 확인해 주세요</span>
      </div>
      <dl className="grid gap-5 text-sm text-[#17211D] sm:grid-cols-2">
        <InfoRow icon={Truck} title="배송비" description={shippingLabel} />
        <InfoRow icon={Truck} title="출고 일정" description={deliveryLabel} />
        <InfoRow icon={RotateCcw} title="교환·반품" description={returnLabel} />
        <InfoRow icon={Store} title="판매 주체" description={product.sellerName ?? '백조오브제 셀렉션'} />
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
        <dt className="text-xs font-semibold text-[#6F766F]">{title}</dt>
        <dd className="mt-1 break-keep leading-6">{description}</dd>
      </div>
    </div>
  );
}
