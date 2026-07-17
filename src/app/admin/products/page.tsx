import React from 'react';
import AdminProductsClient from '@/components/admin-new/products/AdminProductsClient';
import { listAllProductsForAdmin } from '@/lib/products/repo';
import { listAllBrandsForAdmin } from '@/lib/brands/repo';

// 관리자 화면은 항상 최신 DB를 봐야 한다(진열/폼 페이지와 동일 정책).
export const dynamic = 'force-dynamic';

// 서버 wrapper는 storage(클라용 fetch 콘센트)가 아니라 repo를 직접 호출한다(AGENTS.md §3·§10-2 ①).
export default async function AdminProductsPage() {
  const [products, brands] = await Promise.all([
    listAllProductsForAdmin(),
    listAllBrandsForAdmin(),
  ]);

  return (
    <AdminProductsClient
      initialProducts={products}
      initialBrands={brands}
    />
  );
}
