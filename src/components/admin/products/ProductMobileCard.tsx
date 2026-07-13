import Image from 'next/image';
import { Edit2, ExternalLink, FileText, ImageOff } from 'lucide-react';
import { AdminStatusBadge } from '@/components/admin/AdminUi';
import type { Product, Brand } from '@/types';
import { formatPrice } from '@/lib/format';
import { CATALOG_STATUS_META, VISIBILITY_META, getPriceState } from '@/lib/products/constants';

interface ProductMobileCardProps {
  product: Product;
  brand?: Brand;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (product: Product) => void;
  onEditDetails: (product: Product) => void;
}

export function ProductMobileCard({
  product,
  brand,
  isSelected,
  onToggleSelect,
  onEdit,
  onEditDetails,
}: ProductMobileCardProps) {
  const priceState = getPriceState(product.price);
  const catalogMeta = CATALOG_STATUS_META[product.catalogStatus as keyof typeof CATALOG_STATUS_META] || CATALOG_STATUS_META.draft;
  const visibilityMeta = VISIBILITY_META[String(product.isVisible !== false) as keyof typeof VISIBILITY_META];

  return (
    <article className={`border bg-white p-4 transition-colors ${isSelected ? 'border-[#A8742E] bg-[#F7F2E9]' : 'border-[#E7E0D5]'}`}>
      <div className="flex items-start gap-3">
        <input type="checkbox" checked={isSelected} onChange={() => onToggleSelect(product.id)} aria-label={`${product.name} 선택`} className="mt-1 size-4 shrink-0 border-[#D8C4A3] text-[#17211D] focus:ring-[#A8742E]" />
        <div className="relative size-20 shrink-0 overflow-hidden border border-[#E7E0D5] bg-[#FAF8F3]">
          {product.image ? <Image src={product.image} alt="" fill className="object-cover" sizes="80px" /> : <div className="flex size-full items-center justify-center text-[#AEB3AE]"><ImageOff className="size-5" /></div>}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold tracking-wide text-[#A8742E]">{brand?.name || '브랜드 미지정'}</p>
          <h2 className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-[#17211D]">{product.name}</h2>
          <p className="mt-2 text-xs text-[#6F766F]">{product.category}{product.lifestyleCategory ? ` · ${product.lifestyleCategory}` : ''}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5 border-t border-[#E7E0D5] pt-3">
        <AdminStatusBadge tone={catalogMeta.tone === 'warning' ? 'warning' : 'neutral'}>{catalogMeta.label}</AdminStatusBadge>
        <AdminStatusBadge tone={visibilityMeta.tone === 'success' ? 'success' : 'neutral'}>{visibilityMeta.label}</AdminStatusBadge>
        {priceState === 'UNSET' && <AdminStatusBadge tone="danger">가격 미등록</AdminStatusBadge>}
        {priceState === 'ZERO' && <AdminStatusBadge tone="warning">0원 · 확인</AdminStatusBadge>}
      </div>

      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <p className="font-editorial text-lg tabular-nums text-[#17211D]">{priceState === 'VALID' ? `${formatPrice(product.salePrice || product.price!)}원` : '가격 확인 필요'}</p>
          {product.stock != null && <p className="mt-1 text-xs text-[#6F766F]">재고 {product.stock.toLocaleString()}개</p>}
        </div>
        <div className="flex items-center gap-1">
          <a href={`/shop/${product.id}`} target="_blank" rel="noreferrer" aria-label={`${product.name} 스토어에서 보기`} className="flex size-10 items-center justify-center border border-[#E7E0D5] text-[#6F766F] hover:bg-[#F3EEE6]"><ExternalLink className="size-4" /></a>
          <button type="button" onClick={() => onEditDetails(product)} aria-label={`${product.name} 상세 편집`} className="flex size-10 items-center justify-center border border-[#E7E0D5] text-[#A8742E] hover:bg-[#F3EEE6]"><FileText className="size-4" /></button>
          <button type="button" onClick={() => onEdit(product)} aria-label={`${product.name} 기본 정보 수정`} className="flex size-10 items-center justify-center border border-[#E7E0D5] text-[#17211D] hover:bg-[#F3EEE6]"><Edit2 className="size-4" /></button>
        </div>
      </div>
    </article>
  );
}
