'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSurveyResult } from '@/data/survey';
import { getPublicBrands, getPublicProducts } from '@/lib/storage';
import BrandCard from '@/components/common/BrandCard';
import ProductCard from '@/components/common/ProductCard';
import { ArrowRight, CheckCircle2, ShieldCheck, HeartHandshake } from 'lucide-react';
import type { Brand, Product } from '@/types';

export default function DiagnosisResultPage() {
  const router = useRouter();
  const [result, setResult] = useState<ReturnType<typeof getSurveyResult> | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('baekjo_survey_answers');
    if (!saved) {
      router.push('/diagnosis');
      return;
    }
    const answers = JSON.parse(saved);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResult(getSurveyResult(answers));
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

  if (!result || catalogLoading) return <div className="min-h-dvh flex items-center justify-center bg-[#F4F2EC]">분석 중...</div>;

  const recommendedBrands = brands.filter(b => result.recommendation.brandIds.includes(b.id));
  const recommendedProducts = products.filter(p => result.recommendation.productIds.includes(p.id));

  return (
    <div className="bg-[#FAF9F5] min-h-dvh pb-24">
      {/* Result Hero */}
      <section className="bg-[#2B352E] text-white py-20 text-center px-5">
        <div className="max-w-3xl mx-auto">
          <p className="text-[#8A918B] font-semibold tracking-widest text-sm mb-4 uppercase">Diagnosis Result</p>
          <h1 className="text-3xl md:text-5xl font-editorial mb-6 text-balance leading-tight">
            우리 아이를 위한<br />백조오브제의 큐레이션입니다
          </h1>
          <div className="bg-[#303A32] p-6 inline-block rounded-sm border border-[#4B574E]">
            <p className="text-[#D8DCD9] text-lg font-medium flex items-center gap-2">
              <CheckCircle2 className="size-5 text-[#8A918B]" /> {result.recommendation.direction}
            </p>
          </div>
        </div>
      </section>

      <div className="site-container max-w-5xl mt-12 space-y-16">
        
        {/* Recommended Brands */}
        {recommendedBrands.length > 0 && (
          <section>
            <div className="mb-8 border-b border-[#D8D6CE] pb-4">
              <h2 className="text-2xl font-bold text-[#202521]">도움이 되는 검증 브랜드</h2>
              <p className="text-[#6F756F] mt-2">아이의 상태와 고민에 가장 적합한 브랜드입니다.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {recommendedBrands.map(brand => (
                <BrandCard key={brand.id} brand={brand} />
              ))}
            </div>
          </section>
        )}

        {/* Recommended Products */}
        {recommendedProducts.length > 0 && (
          <section>
            <div className="mb-8 border-b border-[#D8D6CE] pb-4">
              <h2 className="text-2xl font-bold text-[#202521]">필요한 카테고리 상품</h2>
              <p className="text-[#6F756F] mt-2">선정된 브랜드의 제품 중 가장 효과적인 라인업입니다.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {recommendedProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}

        {/* Insurance & Kit */}
        <section className="grid md:grid-cols-2 gap-6">
          {result.recommendation.needInsuranceAnalysis && (
            <div className="bg-[#EAE8E1] p-8 rounded-sm border border-[#D8D6CE]">
              <ShieldCheck className="size-8 text-[#5E6C62] mb-4" />
              <h3 className="text-xl font-bold text-[#202521] mb-2">펫보험 보장 점검 필요</h3>
              <p className="text-[#6F756F] text-sm leading-relaxed mb-6">
                입력해주신 건강 상태를 볼 때, 향후 병원비 부담이 발생할 수 있습니다. 
                현재 가입된 보험의 보장 범위가 충분한지 확인해보세요.
              </p>
              <Link href="/insurance" className="inline-flex items-center gap-2 text-sm font-semibold text-[#2F3B34] hover:underline">
                무료 분석 알아보기 <ArrowRight className="size-4" />
              </Link>
            </div>
          )}

          {result.recommendation.recommendKit && (
            <div className="bg-white p-8 rounded-sm border border-[#D8D6CE]">
              <HeartHandshake className="size-8 text-[#5E6C62] mb-4" />
              <h3 className="text-xl font-bold text-[#202521] mb-2">맞춤 케어 키트 안내</h3>
              <p className="text-[#6F756F] text-sm leading-relaxed mb-6">
                아이의 상태에 꼭 필요한 샘플과 가이드가 담긴 케어 키트가 준비되어 있습니다. 
                가까운 제휴 병원이나 온라인을 통해 만나보세요.
              </p>
              <Link href="/landing/care-kit" className="inline-flex items-center gap-2 text-sm font-semibold text-[#2F3B34] hover:underline">
                케어 키트 살펴보기 <ArrowRight className="size-4" />
              </Link>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
