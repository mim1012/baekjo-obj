import { Store, Truck } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import type { Product } from '@/types';

interface ProductPurchaseInfoProps {
  product: Pick<Product, 'shippingFee' | 'deliveryEstimate' | 'shippingNotice' | 'returnNotice' | 'sellerName'>;
}

const nonBlank = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

export default function ProductPurchaseInfo({ product }: ProductPurchaseInfoProps) {
  const shippingLabel = product.shippingFee !== undefined ? formatPrice(product.shippingFee) : undefined;
  const dispatchLabel = nonBlank(product.deliveryEstimate);
  const shippingNoticeLabel = nonBlank(product.shippingNotice);
  const returnLabel = nonBlank(product.returnNotice);
  const sellerLabel = nonBlank(product.sellerName);
  const hasPolicy = Boolean(
    shippingLabel ||
      shippingNoticeLabel ||
      sellerLabel ||
      dispatchLabel ||
      returnLabel,
  );
  if (!hasPolicy) return null;

  return (
    <section aria-labelledby="purchase-information-title" className="mt-8 rounded-3xl border border-[#E7E0D5] bg-[#FAF8F3] p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 id="purchase-information-title" className="text-base font-bold text-[#17211D]">
          구매 정보
        </h2>
      </div>
      <dl className="grid gap-5 text-sm text-[#17211D] sm:grid-cols-2">
        {shippingLabel && <InfoRow icon={Truck} title="배송비" description={shippingLabel} />}
        {dispatchLabel && (
          <InfoRow icon={Truck} title="출고 예정" description={dispatchLabel} />
        )}
        {shippingNoticeLabel && <InfoRow icon={Truck} title="배송 유의사항" description={shippingNoticeLabel} />}
        {sellerLabel && <InfoRow icon={Store} title="판매자" description={sellerLabel} />}
        {returnLabel && (
          <InfoRow icon={Truck} title="교환·반품 안내" description={returnLabel} />
        )}
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
