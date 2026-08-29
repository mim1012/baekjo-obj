'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSurveyResult } from '@/lib/survey/match';
import { getPublicBrands, getPublicProducts, getSurveyConfig } from '@/lib/storage';
import BrandCard from '@/components/common/BrandCard';
import ProductCard from '@/components/common/ProductCard';
import { ArrowRight, CheckCircle2, ShieldCheck, HeartHandshake } from 'lucide-react';
import type { Brand, Product, SurveyResultRule } from '@/types';

export default function DiagnosisResultPage() {
  const router = useRouter();
  const [result, setResult] = useState<SurveyResultRule | null>(null);
  const [surveyLoading, setSurveyLoading] = useState(true);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'brands' | 'products' | 'care'>('brands');

  useEffect(() => {
    const saved = localStorage.getItem('baekjo_survey_answers');
    if (!saved) {
      router.push('/diagnosis');
      return;
    }
    const answers = JSON.parse(saved);
    let cancelled = false;
    // 룰은 정적 데이터가 아니라 DB(GET /api/survey)에서 온 것으로 계산한다. 매칭 로직은 동일.
    getSurveyConfig().then((config) => {
      if (cancelled) return;
      setResult(getSurveyResult(answers, config.rules) ?? null);
      setSurveyLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getPublicBrands(), getPublicProducts()]).then(([brandList, productList]) => {
      if (cancelled) return;
      setBrands(brandList);
      setProducts(productList);
      setCatalogLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (surveyLoading || catalogLoading) {
    return <div className="min-h-dvh flex items-center justify-center bg-[#F4F2EC]">분석 중...</div>;
  }

  // 설문 config는 로드됐지만 매칭되는 룰이 없는 경우(예: 관리자가 룰을 비워 저장한 레거시 데이터).
  // 무한 로딩 대신 안내와 함께 되돌아갈 경로를 보여준다.
  if (!result) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-6 bg-[#F4F2EC] px-5 text-center">
        <p className="text-[#202521] text-lg font-medium">
          진단 결과를 불러오지 못했습니다.<br />잠시 후 다시 시도해주세요.
        </p>
        <div className="flex gap-4">
          <Link href="/diagnosis" className="inline-flex items-center gap-2 text-sm font-semibold text-[#2F3B34] hover:underline">
            진단 다시 하기 <ArrowRight className="size-4" />
          </Link>
          <Link href="/shop" className="inline-flex items-center gap-2 text-sm font-semibold text-[#2F3B34] hover:underline">
            스토어 둘러보기 <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    );
  }

  const recommendedBrands = brands.filter(b => result.recommendation.brandIds.includes(b.id));
  const recommendedProducts = products.filter(p => result.recommendation.productIds.includes(p.id));

  return (
    <div className="bg-[#FAF9F5] min-h-dvh pb-24">
      {/* Result Hero */}
      <section className="bg-[#2B352E] text-white py-10 md:py-20 text-center px-5">
        <div className="max-w-3xl mx-auto">
          <p className="text-[#8A918B] font-semibold tracking-widest text-xs md:text-sm mb-3 md:mb-4 uppercase">Diagnosis Result</p>
          <h1 className="text-[24px] md:text-5xl font-editorial mb-5 md:mb-6 text-balance leading-tight">
            우리 아이를 위한<br />백조오브제의 큐레이션입니다
          </h1>
          <div className="bg-[#303A32] p-4 md:p-6 inline-block rounded-sm border border-[#4B574E]">
            <p className="text-[#D8DCD9] text-[15px] md:text-lg font-medium flex items-center gap-2">
              <CheckCircle2 className="size-4 md:size-5 text-[#8A918B]" /> {result.recommendation.direction}
            </p>
          </div>
        </div>
      </section>

      <div className="site-container max-w-5xl mt-8 md:mt-12 overflow-hidden">
        
        {/* Mobile Tabs */}
        <div className="flex md:hidden border-b border-[#D8D6CE] mb-6">
          {recommendedBrands.length > 0 && (
            <button
              onClick={() => setActiveTab('brands')}
              className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'brands' ? 'border-[#202521] text-[#202521]' : 'border-transparent text-[#8A918B]'}`}
            >
              추천 브랜드
            </button>
          )}
          {recommendedProducts.length > 0 && (
            <button
              onClick={() => setActiveTab('products')}
              className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'products' ? 'border-[#202521] text-[#202521]' : 'border-transparent text-[#8A918B]'}`}
            >
              맞춤 상품
            </button>
          )}
          {(result.recommendation.needInsuranceAnalysis || result.recommendation.recommendKit) && (
            <button
              onClick={() => setActiveTab('care')}
              className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'care' ? 'border-[#202521] text-[#202521]' : 'border-transparent text-[#8A918B]'}`}
            >
              연계 케어
            </button>
          )}
        </div>

        <div className="space-y-0 md:space-y-16">
          {/* Recommended Brands */}
          {recommendedBrands.length > 0 && (
            <section className={`${activeTab === 'brands' ? 'block' : 'hidden'} md:block`}>
              <div className="mb-4 md:mb-8 border-b border-[#D8D6CE] pb-3 md:pb-4">
                <h2 className="text-[18px] md:text-2xl font-bold text-[#202521]">도움이 되는 검증 브랜드</h2>
                <p className="text-[13px] md:text-base text-[#6F756F] mt-1.5 md:mt-2">아이의 상태와 고민에 가장 적합한 브랜드입니다.</p>
              </div>
              <div className="flex md:grid md:grid-cols-2 gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory hide-scrollbar pb-4">
                {recommendedBrands.map(brand => (
                  <div key={brand.id} className="w-[80vw] sm:w-[320px] md:w-auto shrink-0 snap-start">
                    <BrandCard brand={brand} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Recommended Products */}
          {recommendedProducts.length > 0 && (
            <section className={`${activeTab === 'products' ? 'block' : 'hidden'} md:block mt-0 md:mt-16`}>
              <div className="mb-4 md:mb-8 border-b border-[#D8D6CE] pb-3 md:pb-4">
                <h2 className="text-[18px] md:text-2xl font-bold text-[#202521]">필요한 카테고리 상품</h2>
                <p className="text-[13px] md:text-base text-[#6F756F] mt-1.5 md:mt-2">선정된 브랜드의 제품 중 가장 효과적인 라인업입니다.</p>
              </div>
              <div className="flex md:grid md:grid-cols-4 gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory hide-scrollbar pb-4">
                {recommendedProducts.map(product => (
                  <div key={product.id} className="w-[72vw] sm:w-[240px] md:w-auto shrink-0 snap-start">
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Insurance & Kit */}
          {(result.recommendation.needInsuranceAnalysis || result.recommendation.recommendKit) && (
            <section className={`${activeTab === 'care' ? 'flex' : 'hidden'} md:flex md:grid md:grid-cols-2 gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory hide-scrollbar pb-4 mt-0 md:mt-16`}>
              {result.recommendation.needInsuranceAnalysis && (
                <div className="bg-[#EAE8E1] p-6 md:p-8 rounded-sm border border-[#D8D6CE] w-[80vw] sm:w-[320px] md:w-auto shrink-0 snap-start h-auto flex flex-col">
                  <ShieldCheck className="size-8 text-[#5E6C62] mb-4" />
                  <h3 className="text-[18px] md:text-xl font-bold text-[#202521] mb-2">펫보험 보장 점검 필요</h3>
                  <p className="text-[#6F756F] text-[14px] md:text-sm leading-relaxed mb-6 flex-1">
                    입력해주신 건강 상태를 볼 때, 향후 병원비 부담이 발생할 수 있습니다.
                    현재 가입된 보험의 보장 범위가 충분한지 확인해보세요.
                  </p>
                  <Link href="/insurance" className="inline-flex items-center gap-2 text-[14px] md:text-sm font-semibold text-[#2F3B34] hover:underline mt-auto">
                    무료 분석 알아보기 <ArrowRight className="size-4" />
                  </Link>
                </div>
              )}

              {result.recommendation.recommendKit && (
                <div className="bg-white p-6 md:p-8 rounded-sm border border-[#D8D6CE] w-[80vw] sm:w-[320px] md:w-auto shrink-0 snap-start h-auto flex flex-col">
                  <HeartHandshake className="size-8 text-[#5E6C62] mb-4" />
                  <h3 className="text-[18px] md:text-xl font-bold text-[#202521] mb-2">맞춤 케어 키트 안내</h3>
                  <p className="text-[#6F756F] text-[14px] md:text-sm leading-relaxed mb-6 flex-1">
                    아이의 상태에 꼭 필요한 샘플과 가이드가 담긴 케어 키트가 준비되어 있습니다.
                    가까운 제휴 병원이나 온라인을 통해 만나보세요.
                  </p>
                  <Link href="/landing/care-kit" className="inline-flex items-center gap-2 text-[14px] md:text-sm font-semibold text-[#2F3B34] hover:underline mt-auto">
                    케어 키트 살펴보기 <ArrowRight className="size-4" />
                  </Link>
                </div>
              )}
            </section>
          )}
        </div>

      </div>
    </div>
  );
}
