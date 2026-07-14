import React from 'react';
import ProductDisplayManager from '@/components/admin-new/products/ProductDisplayManager';
import { listAllProductsForAdmin } from '@/lib/products/repo';
import { listAllBrandsForAdmin } from '@/lib/brands/repo';

// 관리자 화면은 항상 최신 DB를 봐야 한다(진열 토글 직후 재진입 포함).
export const dynamic = 'force-dynamic';

/**
 * 서버 wrapper는 storage(클라용 fetch 콘센트)가 아니라 repo를 직접 호출한다(AGENTS.md §3).
 * storage의 getAdminProducts/getAdminBrands는 상대경로 fetch라 서버 런타임에서 origin이 없어
 * throw하고 catch가 이를 삼켜 빈 배열을 반환한다 → 진열 관리가 조용히 빈 화면이 됐다.
 */
export default async function ProductDisplayPage() {
  const [products, brands] = await Promise.all([
    listAllProductsForAdmin(),
    listAllBrandsForAdmin()
  ]);

  return (
    <ProductDisplayManager 
      initialProducts={products}
      brands={brands}
    />
  );
}
