import React from 'react';
import { notFound } from 'next/navigation';
import ProductDetailEditor from '@/components/admin-new/products/ProductDetailEditor';
import { getProductById } from '@/lib/products/repo';

// 관리자 화면은 항상 최신 DB를 봐야 한다(홈/상세와 동일 정책).
export const dynamic = 'force-dynamic';

export default async function ProductDetailEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProductById(id, { includeHidden: true });

  if (!product) {
    notFound();
  }

  return (
    <ProductDetailEditor product={product} />
  );
}
