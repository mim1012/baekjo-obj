import React from 'react';
import { notFound } from 'next/navigation';
import ProductDetailEditor from '@/components/admin-new/products/ProductDetailEditor';
import { getAdminProducts } from '@/lib/storage';

export default async function ProductDetailEditorPage({ params }: { params: { id: string } }) {
  const products = await getAdminProducts();
  const product = products.find(p => p.id === params.id);

  if (!product) {
    notFound();
  }

  return (
    <ProductDetailEditor product={product} />
  );
}
