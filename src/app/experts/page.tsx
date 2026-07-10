import { Stethoscope, Utensils, Activity } from 'lucide-react';
import Link from 'next/link';
import { listProducts } from '@/lib/products/repo';
import ProductCard from '@/components/common/ProductCard';

export const metadata = {
  title: '전문가추천 | 백조오브제',
  description: '수의학, 영양, 행동 관점의 추천 기준과 검수 예정 상품을 안내합니다.',
};

// DB를 읽는 서버 컴포넌트라 빌드타임 프리렌더 대신 요청 시 렌더한다(관리자 편집 즉시 반영).
export const dynamic = 'force-dynamic';

export default async function ExpertsPage() {
  const products = await listProducts();
  const recommendedProducts = products.filter(p => p.isRecommended).slice(0, 4);

  return (
    <div className="bg-[#F4F2EC] min-h-dvh py-16">
      <div className="site-container">
        <div className="mb-16 text-center">
          <div className="mb-4 inline-flex items-center justify-center rounded-full bg-white px-4 py-1.5 text-sm font-bold text-[#2F3B34] shadow-sm">
            Expert’s Pick
          </div>
          <h1 className="text-3xl font-bold text-[#202521] md:text-5xl">전문가 관점의 추천 기준</h1>
          <p className="mt-6 text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
            현재는 실제 전문가 연결 전 단계의 mock 큐레이션입니다.<br />
            각 분야에서 확인할 기준을 투명하게 먼저 안내합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-20">
          
          {/* 수의사 */}
          <div className="bg-white rounded-sm p-8 shadow-sm border border-gray-100 flex flex-col items-center text-center">
            <div className="h-20 w-20 rounded-full bg-[#E4E8E3] flex items-center justify-center text-[#2F3B34] mb-6">
              <Stethoscope className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-bold text-[#202521] mb-3">수의사 추천</h2>
            <span className="mb-4 border border-[#D8D6CE] px-3 py-1 text-[10px] font-semibold text-[#68776C]">전문가 검수 예정</span>
            <p className="text-gray-600 leading-relaxed text-sm mb-8 flex-1">
              “질환의 예방과 관리를 목적으로 합니다.<br/>
              관절, 피부, 치아 등 건강과 직결되는 제품은<br/>
              임상적 유효성과 안전성을 최우선으로 봅니다.”
            </p>
            <Link href="/shop?sort=recommended" className="w-full rounded-full bg-[#2F3B34] py-3 text-sm font-bold text-white hover:bg-[#2F3B34]/90 transition">
              수의사 추천 제품 보기
            </Link>
          </div>

          {/* 영양사 */}
          <div className="bg-white rounded-sm p-8 shadow-sm border border-gray-100 flex flex-col items-center text-center">
            <div className="h-20 w-20 rounded-full bg-[#E7E4DC] flex items-center justify-center text-[#68776C] mb-6">
              <Utensils className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-bold text-[#202521] mb-3">반려동물 영양사 추천</h2>
            <span className="mb-4 border border-[#D8D6CE] px-3 py-1 text-[10px] font-semibold text-[#68776C]">추천 기준 확인 필요</span>
            <p className="text-gray-600 leading-relaxed text-sm mb-8 flex-1">
              “식이는 생명 유지의 기본입니다.<br/>
              생물학적 적합성, 원료의 투명성, 영양 밸런스를<br/>
              가장 꼼꼼하게 따져보고 선별합니다.”
            </p>
            <Link href="/shop?category=사료" className="w-full rounded-full bg-white border border-[#68776C] py-3 text-sm font-bold text-[#68776C] hover:bg-[#68776C]/10 transition">
              영양사 추천 사료 보기
            </Link>
          </div>

          {/* 훈련사 */}
          <div className="bg-white rounded-sm p-8 shadow-sm border border-gray-100 flex flex-col items-center text-center">
            <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 mb-6">
              <Activity className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-bold text-[#202521] mb-3">행동 전문가 추천</h2>
            <span className="mb-4 border border-[#D8D6CE] px-3 py-1 text-[10px] font-semibold text-[#68776C]">전문가 검수 예정</span>
            <p className="text-gray-600 leading-relaxed text-sm mb-8 flex-1">
              “신체적 건강만큼 정신적 건강도 중요합니다.<br/>
              본능을 해소하고 스트레스를 줄여주는<br/>
              올바른 장난감과 용품을 제안합니다.”
            </p>
            <Link href="/shop?category=장난감" className="w-full rounded-full bg-white border border-gray-300 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 transition">
              훈련사 추천 용품 보기
            </Link>
          </div>

        </div>

        <section className="bg-white rounded-sm p-8 md:p-12 shadow-sm border border-gray-100">
          <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-10">
            <div>
              <h2 className="text-2xl font-bold text-[#202521] mb-2">추천 기준 적용 상품</h2>
              <p className="text-gray-500">공개된 기준으로 선별한 mock 큐레이션이며 실제 전문가 검수 전 단계입니다.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-6">
            {recommendedProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
