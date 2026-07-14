import React from 'react';
import { notFound } from 'next/navigation';
import ProductForm from '@/components/admin-new/products/ProductForm';
import { getProductById } from '@/lib/products/repo';
import { listAllBrandsForAdmin } from '@/lib/brands/repo';

// 관리자 화면은 항상 최신 DB를 봐야 한다(홈/상세와 동일 정책).
export const dynamic = 'force-dynamic';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, brands] = await Promise.all([
    getProductById(id, { includeHidden: true }),
    listAllBrandsForAdmin(),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <ProductForm
      brands={brands}
      initialData={product}
    />
  );
}
