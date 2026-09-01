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
import { usePublicSiteContent } from '@/components/providers/PublicSiteContentProvider';
import {
  defaultSurveyResultContent,
  type SurveyResultContent,
} from '@/lib/survey/config';

export default function DiagnosisResultPage() {
  const siteContent = usePublicSiteContent();
  const router = useRouter();
  const [result, setResult] = useState<SurveyResultRule | null>(null);
  const [resultContent, setResultContent] = useState<SurveyResultContent>(defaultSurveyResultContent);
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
      setResultContent(config.resultContent ?? defaultSurveyResultContent);
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
          <span className="whitespace-pre-line">{resultContent.noResultMessage}</span>
        </p>
        <div className="flex gap-4">
          <Link href="/diagnosis" className="inline-flex items-center gap-2 text-sm font-semibold text-[#2F3B34] hover:underline">
            {resultContent.retryLabel} <ArrowRight className="size-4" />
          </Link>
          <Link href="/shop" className="inline-flex items-center gap-2 text-sm font-semibold text-[#2F3B34] hover:underline">
            {resultContent.shopLabel} <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    );
  }

  const recommendedBrands = brands.filter(b => result.recommendation.brandIds.includes(b.id));
  const recommendedProducts = products.filter(p => result.recommendation.productIds.includes(p.id));
  const showInsuranceRecommendation = siteContent.features.insurance && result.recommendation.needInsuranceAnalysis;
  const showCareRecommendations = showInsuranceRecommendation || result.recommendation.recommendKit;

  return (
    <div className="bg-[#FAF9F5] min-h-dvh pb-24">
      {/* Result Hero */}
      <section className="bg-[#2B352E] text-white py-10 md:py-20 text-center px-5">
        <div className="max-w-3xl mx-auto">
          <p className="text-[#8A918B] font-semibold tracking-widest text-xs md:text-sm mb-3 md:mb-4 uppercase">{resultContent.heroEyebrow}</p>
          <h1 className="whitespace-pre-line text-[24px] md:text-5xl font-editorial mb-5 md:mb-6 text-balance leading-tight">
            {resultContent.heroTitle}
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
              {resultContent.brandTabLabel}
            </button>
          )}
          {recommendedProducts.length > 0 && (
            <button
              onClick={() => setActiveTab('products')}
              className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'products' ? 'border-[#202521] text-[#202521]' : 'border-transparent text-[#8A918B]'}`}
            >
              {resultContent.productTabLabel}
            </button>
          )}
          {showCareRecommendations && (
            <button
              onClick={() => setActiveTab('care')}
              className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'care' ? 'border-[#202521] text-[#202521]' : 'border-transparent text-[#8A918B]'}`}
            >
              {resultContent.careTabLabel}
            </button>
          )}
        </div>

        <div className="space-y-0 md:space-y-16">
          {/* Recommended Brands */}
          {recommendedBrands.length > 0 && (
            <section className={`${activeTab === 'brands' ? 'block' : 'hidden'} md:block`}>
              <div className="mb-4 md:mb-8 border-b border-[#D8D6CE] pb-3 md:pb-4">
                <h2 className="text-[18px] md:text-2xl font-bold text-[#202521]">{resultContent.brandSectionTitle}</h2>
                <p className="text-[13px] md:text-base text-[#6F756F] mt-1.5 md:mt-2">{resultContent.brandSectionDescription}</p>
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
                <h2 className="text-[18px] md:text-2xl font-bold text-[#202521]">{resultContent.productSectionTitle}</h2>
                <p className="text-[13px] md:text-base text-[#6F756F] mt-1.5 md:mt-2">{resultContent.productSectionDescription}</p>
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
          {showCareRecommendations && (
            <section className={`${activeTab === 'care' ? 'flex' : 'hidden'} md:flex md:grid md:grid-cols-2 gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory hide-scrollbar pb-4 mt-0 md:mt-16`}>
              {showInsuranceRecommendation && (
                <div className="bg-[#EAE8E1] p-6 md:p-8 rounded-sm border border-[#D8D6CE] w-[80vw] sm:w-[320px] md:w-auto shrink-0 snap-start h-auto flex flex-col">
                  <ShieldCheck className="size-8 text-[#5E6C62] mb-4" />
                  <h3 className="text-[18px] md:text-xl font-bold text-[#202521] mb-2">{resultContent.insuranceTitle}</h3>
                  <p className="whitespace-pre-line text-[#6F756F] text-[14px] md:text-sm leading-relaxed mb-6 flex-1">
                    {resultContent.insuranceDescription}
                  </p>
                  <Link href="/insurance" className="inline-flex items-center gap-2 text-[14px] md:text-sm font-semibold text-[#2F3B34] hover:underline mt-auto">
                    {resultContent.insuranceLinkLabel} <ArrowRight className="size-4" />
                  </Link>
                </div>
              )}

              {result.recommendation.recommendKit && (
                <div className="bg-white p-6 md:p-8 rounded-sm border border-[#D8D6CE] w-[80vw] sm:w-[320px] md:w-auto shrink-0 snap-start h-auto flex flex-col">
                  <HeartHandshake className="size-8 text-[#5E6C62] mb-4" />
                  <h3 className="text-[18px] md:text-xl font-bold text-[#202521] mb-2">{resultContent.kitTitle}</h3>
                  <p className="whitespace-pre-line text-[#6F756F] text-[14px] md:text-sm leading-relaxed mb-6 flex-1">
                    {resultContent.kitDescription}
                  </p>
                  <Link href="/landing/care-kit" className="inline-flex items-center gap-2 text-[14px] md:text-sm font-semibold text-[#2F3B34] hover:underline mt-auto">
                    {resultContent.kitLinkLabel} <ArrowRight className="size-4" />
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
