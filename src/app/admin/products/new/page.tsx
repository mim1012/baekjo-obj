import React from 'react';
import ProductForm from '@/components/admin-new/products/ProductForm';
import { listAllBrandsForAdmin } from '@/lib/brands/repo';

// 관리자 화면은 항상 최신 DB를 봐야 한다(홈/상세와 동일 정책).
export const dynamic = 'force-dynamic';

export default async function NewProductPage() {
  const brands = await listAllBrandsForAdmin();

  return (
    <ProductForm 
      brands={brands}
      initialData={null}
    />
  );
}
