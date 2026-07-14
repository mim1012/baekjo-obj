import React from 'react';
import ProductDisplayManager from '@/components/admin-new/products/ProductDisplayManager';
import { getAdminProducts, getAdminBrands } from '@/lib/storage';

export default async function ProductDisplayPage() {
  const [products, brands] = await Promise.all([
    getAdminProducts(),
    getAdminBrands()
  ]);

  return (
    <ProductDisplayManager 
      initialProducts={products}
      brands={brands}
    />
  );
}
