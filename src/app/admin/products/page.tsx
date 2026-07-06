import { products } from '@/data/products';
import { formatPrice } from '@/lib/format';

export default function AdminProductsPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">상품 관리</h1>
        <button className="bg-[#2F3B34] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#2F3B34]/90">
          상품 등록
        </button>
      </div>

      <div className="bg-white rounded-sm shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex gap-4">
          <input 
            type="text" 
            placeholder="상품명 검색..." 
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#2F3B34]"
          />
          <select className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#2F3B34]">
            <option>전체 카테고리</option>
            <option>식사와 영양</option>
            <option>건강과 케어</option>
            <option>구강과 위생</option>
            <option>그루밍과 브러싱</option>
            <option>생활과 오브제</option>
            <option>놀이와 활동</option>
            <option>기록과 소품</option>
          </select>
        </div>
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-6 py-3 font-medium">상품명</th>
              <th className="px-6 py-3 font-medium">브랜드</th>
              <th className="px-6 py-3 font-medium">카테고리</th>
              <th className="px-6 py-3 font-medium">판매가</th>
              <th className="px-6 py-3 font-medium">상태</th>
              <th className="px-6 py-3 font-medium text-right">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {products.map(product => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900 truncate max-w-xs">{product.name}</td>
                <td className="px-6 py-4 text-gray-500">{product.brandId}</td>
                <td className="px-6 py-4 text-gray-500">{product.category}</td>
                <td className="px-6 py-4 font-medium text-gray-900">
                  {product.price !== null && product.price !== undefined
                    ? formatPrice(product.salePrice || product.price)
                    : <span className="text-[#A65348] text-xs font-bold">가격 미정</span>}
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">판매중</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-[#2F3B34] hover:underline font-medium">수정</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
