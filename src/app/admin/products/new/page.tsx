import React from 'react';
import ProductForm from '@/components/admin-new/products/ProductForm';
import { getAdminBrands } from '@/lib/storage';

export default async function NewProductPage() {
  const brands = await getAdminBrands();

  return (
    <ProductForm 
      brands={brands}
      initialData={null}
    />
  );
}
