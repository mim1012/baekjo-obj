import Image from 'next/image';
import { Edit2, ExternalLink, FileText, ImageOff } from 'lucide-react';
import { AdminStatusBadge } from '@/components/admin/AdminUi';
import type { Product, Brand } from '@/types';
import { formatPrice } from '@/lib/format';
import { CATALOG_STATUS_META, VISIBILITY_META, getPriceState } from '@/lib/products/constants';

interface ProductTableProps {
  products: Product[];
  brands: Brand[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onEdit: (product: Product) => void;
  onEditDetails: (product: Product) => void;
}

export function ProductTable({
  products,
  brands,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onEdit,
  onEditDetails,
}: ProductTableProps) {
  const allSelected = products.length > 0 && products.every((product) => selectedIds.has(product.id));

  return (
    <div className="overflow-hidden border border-[#E7E0D5] bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] whitespace-nowrap text-left text-sm">
          <thead className="border-b border-[#E7E0D5] bg-[#F4F2EC] text-[11px] font-semibold text-[#6F766F]">
            <tr>
              <th className="w-12 px-4 py-3.5 text-center">
                <input type="checkbox" checked={allSelected} onChange={onToggleSelectAll} aria-label="현재 페이지 상품 전체 선택" className="size-4 border-[#D8C4A3] text-[#17211D] focus:ring-[#A8742E]" />
              </th>
              <th className="min-w-[280px] px-4 py-3.5">상품 정보</th>
              <th className="px-4 py-3.5">브랜드</th>
              <th className="px-4 py-3.5">분류</th>
              <th className="px-4 py-3.5">판매가</th>
              <th className="px-4 py-3.5">운영 상태</th>
              <th className="px-4 py-3.5">재고</th>
              <th className="px-4 py-3.5 text-right">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E7E0D5]">
            {products.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-20 text-center text-sm text-[#6F766F]">조건에 맞는 상품이 없습니다.</td></tr>
            ) : products.map((product) => {
              const brand = brands.find((item) => item.id === product.brandId);
              const isSelected = selectedIds.has(product.id);
              const priceState = getPriceState(product.price);
              const catalogMeta = CATALOG_STATUS_META[product.catalogStatus as keyof typeof CATALOG_STATUS_META] || CATALOG_STATUS_META.draft;
              const visibilityMeta = VISIBILITY_META[String(product.isVisible !== false) as keyof typeof VISIBILITY_META];
              const catalogTone = catalogMeta.tone === 'warning' ? 'warning' : 'neutral';

              return (
                <tr key={product.id} className={`transition-colors hover:bg-[#FBFAF7] ${isSelected ? 'bg-[#F7F2E9]' : ''}`}>
                  <td className="px-4 py-4 text-center">
                    <input type="checkbox" checked={isSelected} onChange={() => onToggleSelect(product.id)} aria-label={`${product.name} 선택`} className="size-4 border-[#D8C4A3] text-[#17211D] focus:ring-[#A8742E]" />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative size-14 shrink-0 overflow-hidden border border-[#E7E0D5] bg-[#FAF8F3]">
                        {product.image ? (
                          <Image src={product.image} alt="" fill className="object-cover" sizes="56px" />
                        ) : (
                          <div className="flex size-full items-center justify-center text-[#AEB3AE]"><ImageOff className="size-4" /></div>
                        )}
                      </div>
                      <div className="max-w-[220px] whitespace-normal">
                        <p className="line-clamp-2 font-semibold leading-5 text-[#17211D]">{product.name}</p>
                        <p className="mt-1 font-editorial text-xs text-[#8B928C]">ID {product.id.split('-')[0]}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4"><span className="border-b border-[#D8C4A3] pb-1 text-xs font-semibold text-[#59615B]">{brand?.name || '브랜드 미지정'}</span></td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-[#17211D]">{product.category}</p>
                    {product.lifestyleCategory && <p className="mt-1 text-xs text-[#8B928C]">{product.lifestyleCategory}</p>}
                  </td>
                  <td className="px-4 py-4">
                    {priceState === 'UNSET' && <AdminStatusBadge tone="danger">가격 미등록</AdminStatusBadge>}
                    {priceState === 'ZERO' && <AdminStatusBadge tone="warning">0원 · 확인 필요</AdminStatusBadge>}
                    {priceState === 'VALID' && (
                      <div>
                        <p className="font-editorial text-base tabular-nums text-[#17211D]">{formatPrice(product.salePrice || product.price!)}원</p>
                        {product.salePrice && <p className="mt-1 text-xs tabular-nums text-[#9AA09A] line-through">{formatPrice(product.price!)}원</p>}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col items-start gap-1.5">
                      <AdminStatusBadge tone={catalogTone}>{catalogMeta.label}</AdminStatusBadge>
                      <AdminStatusBadge tone={visibilityMeta.tone === 'success' ? 'success' : 'neutral'}>{visibilityMeta.label}</AdminStatusBadge>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {product.stock != null ? <span className={`font-editorial text-base tabular-nums ${product.stock === 0 ? 'text-[#9E3939]' : 'text-[#17211D]'}`}>{product.stock.toLocaleString()}<small className="ml-1 font-sans text-[10px] text-[#8B928C]">개</small></span> : <span className="text-[#AEB3AE]">—</span>}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <a href={`/shop/${product.id}`} target="_blank" rel="noreferrer" aria-label={`${product.name} 스토어에서 보기`} className="flex size-9 items-center justify-center text-[#6F766F] transition-colors hover:bg-[#F3EEE6] hover:text-[#17211D]"><ExternalLink className="size-4" /></a>
                      <button type="button" onClick={() => onEditDetails(product)} aria-label={`${product.name} 상세 편집`} className="flex size-9 items-center justify-center text-[#6F766F] transition-colors hover:bg-[#F3EEE6] hover:text-[#A8742E]"><FileText className="size-4" /></button>
                      <button type="button" onClick={() => onEdit(product)} aria-label={`${product.name} 기본 정보 수정`} className="flex size-9 items-center justify-center text-[#6F766F] transition-colors hover:bg-[#F3EEE6] hover:text-[#17211D]"><Edit2 className="size-4" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
