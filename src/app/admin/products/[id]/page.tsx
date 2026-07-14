import React from 'react';
import { notFound } from 'next/navigation';
import ProductForm from '@/components/admin-new/products/ProductForm';
import { getAdminBrands, getAdminProducts } from '@/lib/storage';

export default async function EditProductPage({ params }: { params: { id: string } }) {
  // getAdminProducts()로 전체 상품 가져와서 필터링 (별도의 getAdminProductById가 없을 경우)
  const products = await getAdminProducts();
  const product = products.find(p => p.id === params.id);

  if (!product) {
    notFound();
  }

  const brands = await getAdminBrands();

  return (
    <ProductForm 
      brands={brands}
      initialData={product}
    />
  );
}
