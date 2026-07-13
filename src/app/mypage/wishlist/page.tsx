'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { getWishlist, getPublicProducts } from '@/lib/storage';
import { formatPrice } from '@/lib/format';
import type { Product } from '@/types';
import EmptyState from '@/components/common/EmptyState';

export default function MypageWishlistPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getPublicProducts().then((list) => {
      if (cancelled) return;
      setProducts(list);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const wishlistedIds = getWishlist();
  const wishlist = loading ? [] : products.filter((product) => wishlistedIds.includes(product.id));

  return (
    <div className="bg-[#FFFEFB] p-6 md:p-8 rounded-sm shadow-sm border border-[#E2DACD]">
      <h2 className="text-lg font-bold text-[#17251F] flex items-center mb-6">
        <Heart className="mr-2 h-5 w-5 text-[#16382D]" /> 관심 상품
      </h2>
      
      {loading ? (
        <div className="py-10 text-center text-[#6F756F] bg-[#F8F6F0] rounded-sm">불러오는 중…</div>
      ) : wishlist.length === 0 ? (
        <EmptyState 
          title="관심 상품이 없습니다."
          description="마음에 드는 상품의 하트 아이콘을 눌러보세요."
          actionLabel="상품 둘러보기"
          actionHref="/shop"
          compact
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {wishlist.map(product => (
            <div key={product.id} className="border border-[#E2DACD] rounded-sm p-3 flex flex-col">
              <div className="aspect-square bg-[#F2EEE6] rounded-lg mb-3"></div>
              <Link href={`/shop/${product.id}`} className="font-medium text-sm text-[#17251F] hover:text-[#16382D] line-clamp-2">
                {product.name}
              </Link>
              <div className="font-bold text-[#16382D] mt-2">
                {product.price !== null && product.price !== undefined 
                  ? formatPrice(product.salePrice || product.price!)
                  : <span className="text-[#B44A44] text-xs">가격 확인 필요</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
