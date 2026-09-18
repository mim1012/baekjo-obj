import { ChevronDown } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import type { Seller } from '@/types';

interface SellerDisclosureProps {
  seller: Seller;
  className?: string;
}

export default function SellerDisclosure({ seller, className = '' }: SellerDisclosureProps) {
  const sellerName = seller.legalName || seller.displayName;
  const contact = [seller.phone, seller.email].filter(Boolean).join(' · ');
  const shippingFee = seller.shippingFee ?? 0;
  const shippingLabel = shippingFee > 0 ? formatPrice(shippingFee) : '무료 배송';
  const shippingDescription = seller.freeShippingThreshold
    ? `${shippingLabel} · ${formatPrice(seller.freeShippingThreshold)} 이상 무료`
    : shippingLabel;

  return (
    <details
      data-seller-disclosure
      className={`group rounded-2xl border border-[#DDD5C8] bg-[#FFFEFB] ${className}`}
    >
      <summary
        aria-label={`${sellerName} 실제 판매자 정보 열기`}
        className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-4 py-3 text-left transition-colors hover:bg-[#F7F3EC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A8742E] focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden"
      >
        <span className="min-w-0 text-sm text-[#59615B]">
          실제 판매자 · <strong className="break-words font-bold text-[#17211D]">{sellerName}</strong>
        </span>
        <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-[#8A6433]">
          <span className="group-open:hidden">정보 열기</span>
          <span className="hidden group-open:inline">정보 닫기</span>
          <ChevronDown aria-hidden="true" className="size-4 transition-transform group-open:rotate-180" />
        </span>
      </summary>

      <div className="border-t border-[#E7E0D5] px-4 py-4">
        <p className="text-xs leading-5 text-[#59615B]">
          관리자 판매자 관리에 등록된 실제 계약 판매자의 사업자·배송·반품 정보입니다.
        </p>
        <dl className="mt-4 grid gap-x-8 gap-y-3 text-xs leading-5 text-[#59615B] sm:grid-cols-2">
          <SellerRow label="상호" value={seller.legalName} />
          <SellerRow label="대표자" value={seller.representativeName} />
          <SellerRow label="사업자등록번호" value={seller.businessRegistrationNumber} />
          <SellerRow label="통신판매업 신고번호" value={seller.mailOrderRegistrationNumber} />
          <SellerRow label="사업장 주소" value={seller.businessAddress} />
          <SellerRow label="고객센터" value={contact} />
          <SellerRow label="배송비" value={shippingDescription} />
          <SellerRow label="출고 예정" value={seller.dispatchEstimate} />
          <SellerRow label="반품지" value={seller.returnAddress || seller.businessAddress} />
          <SellerRow label="교환·반품 안내" value={seller.returnPolicy} />
        </dl>
      </div>
    </details>
  );
}

function SellerRow({ label, value }: { label: string; value?: string }) {
  if (!value || !value.trim()) return null;
  return (
    <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-3">
      <dt>{label}</dt>
      <dd className="break-words font-semibold text-[#17211D]">{value}</dd>
    </div>
  );
}
