'use client';

import React from 'react';
import { formatPrice } from '@/lib/format';
import type { AdminOrderBrandSummary, AdminOrderSalesTotals } from '@/lib/orders/adminOrderReporting';

interface OrderSalesSummaryPanelProps {
  readonly overall: AdminOrderSalesTotals;
  readonly brands: readonly AdminOrderBrandSummary[];
}

function TotalCards({ total }: { readonly total: AdminOrderSalesTotals }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-md border border-gray-200 bg-white px-4 py-3">
        <p className="text-[12px] font-medium text-gray-500">조회기간 상품 판매금액</p>
        <p className="mt-1 text-[18px] font-bold text-[#17201B]">{formatPrice(total.productAmount)}</p>
      </div>
      <div className="rounded-md border border-gray-200 bg-white px-4 py-3">
        <p className="text-[12px] font-medium text-gray-500">조회기간 배송비</p>
        <p className="mt-1 text-[18px] font-bold text-[#17201B]">{formatPrice(total.shipping)}</p>
      </div>
      <div className="rounded-md border border-gray-200 bg-white px-4 py-3">
        <p className="text-[12px] font-medium text-gray-500">조회기간 최종 결제금액</p>
        <p className="mt-1 text-[18px] font-bold text-[#17201B]">{formatPrice(total.finalAmount)}</p>
      </div>
    </div>
  );
}

export default function OrderSalesSummaryPanel({ overall, brands }: OrderSalesSummaryPanelProps) {
  return (
    <section className="space-y-4" aria-label="주문 판매 집계">
      <TotalCards total={overall} />
      <div className="rounded-md border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-[15px] font-bold text-[#17201B]">브랜드별 상품 집계</h2>
          <p className="mt-1 text-[12px] text-gray-500">
            상세 행에는 취소·환불 건을 표시하지만, 아래 판매수량과 금액 합계에서는 제외합니다.
          </p>
        </div>
        {brands.length === 0 ? (
          <div className="px-4 py-8 text-center text-[14px] text-gray-500">집계할 판매 데이터가 없습니다.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {brands.map((brand) => (
              <div key={brand.brandId} className="p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-[14px] font-bold text-[#17201B]">{brand.brandName}</h3>
                  <div className="text-[12px] font-semibold text-[#2F3B34]">
                    총 판매수량 {brand.total.quantity.toLocaleString('ko-KR')}개 · 상품 {formatPrice(brand.total.productAmount)} · 배송비{' '}
                    {formatPrice(brand.total.shipping)} · 최종 {formatPrice(brand.total.finalAmount)}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-[760px] w-full text-left text-[13px]">
                    <thead className="bg-[#F9F8F3] text-[12px] text-gray-600">
                      <tr>
                        <th className="px-3 py-2 font-semibold">상품명</th>
                        <th className="px-3 py-2 font-semibold">옵션</th>
                        <th className="px-3 py-2 text-right font-semibold">판매수량</th>
                        <th className="px-3 py-2 text-right font-semibold">상품 판매금액 합계</th>
                        <th className="px-3 py-2 text-right font-semibold">배송비 합계</th>
                        <th className="px-3 py-2 text-right font-semibold">최종 결제금액 합계</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {brand.products.map((product) => (
                        <tr key={`${product.productName}:${product.optionName}`}>
                          <td className="px-3 py-2 text-gray-900">{product.productName}</td>
                          <td className="px-3 py-2 text-gray-600">{product.optionName || '-'}</td>
                          <td className="px-3 py-2 text-right text-gray-900">{product.quantity.toLocaleString('ko-KR')}</td>
                          <td className="px-3 py-2 text-right text-gray-900">{formatPrice(product.productAmount)}</td>
                          <td className="px-3 py-2 text-right text-gray-900">{formatPrice(product.shipping)}</td>
                          <td className="px-3 py-2 text-right font-semibold text-gray-900">{formatPrice(product.finalAmount)}</td>
                        </tr>
                      ))}
                      <tr className="bg-[#F4F2EC] font-bold text-[#17201B]">
                        <td className="px-3 py-2" colSpan={2}>{brand.brandName} 총합계</td>
                        <td className="px-3 py-2 text-right">{brand.total.quantity.toLocaleString('ko-KR')}</td>
                        <td className="px-3 py-2 text-right">{formatPrice(brand.total.productAmount)}</td>
                        <td className="px-3 py-2 text-right">{formatPrice(brand.total.shipping)}</td>
                        <td className="px-3 py-2 text-right">{formatPrice(brand.total.finalAmount)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
