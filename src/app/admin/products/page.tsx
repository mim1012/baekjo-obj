import AdminResourcePage from '@/components/admin/AdminResourcePage';
import { products } from '@/data/products';
import { formatPrice } from '@/lib/format';

export default function AdminProductsPage() {
  return (
    <AdminResourcePage
      title="상품 관리"
      description="입점된 전체 상품의 정보를 확인하고 상태를 관리합니다."
      actionLabel="상품 등록"
      searchPlaceholder="상품명, 카테고리 검색"
      filters={['전체 카테고리', '식사와 영양', '건강과 케어', '구강과 위생']}
      columns={[
        { key: 'name', label: '상품명' },
        { key: 'brand', label: '브랜드' },
        { key: 'category', label: '카테고리' },
        { key: 'price', label: '판매가' },
        { key: 'status', label: '상태' },
      ]}
      rows={products.map((product) => ({
        id: product.id,
        name: product.name,
        brand: product.brandId,
        category: product.category,
        price: product.price !== null && product.price !== undefined
          ? formatPrice(product.salePrice || product.price)
          : '가격 미정',
        status: '판매중',
      }))}
      createFields={['상품명', '브랜드', '카테고리', '판매가', '재고 수량', '상태']}
    />
  );
}
