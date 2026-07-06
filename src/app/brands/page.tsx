import { brands } from '@/data/brands';
import BrandCard from '@/components/common/BrandCard';
import Link from 'next/link';

export const metadata = {
  title: '브랜드관 | 백조오브제',
  description: '백조오브제가 깐깐한 기준으로 검증한 프리미엄 브랜드들을 만나보세요.',
};

export default async function BrandsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const resolvedParams = await searchParams;
  const filter = resolvedParams.filter || 'all';

  const filteredBrands = brands.filter(b => {
    if (filter === 'audit') return b.auditGrade.includes('A');
    if (filter === 'recommended') return b.isRecommended;
    if (filter === 'new') return b.isNew;
    return true;
  });

  return (
    <div className="bg-[#FBFAF7] min-h-dvh">
      {/* Hero Section */}
      <section className="bg-[#17211D] py-24 sm:py-32 text-center text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-10"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#17211D] via-[#17211D]/80 to-transparent"></div>
        <div className="site-container relative z-10">
          <p className="text-sm font-semibold tracking-widest text-slate-400 mb-6 uppercase">Baekjo Audit Brand</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-editorial tracking-tight text-white mb-8 leading-tight">백조오브제가 고른<br/>검증 브랜드</h1>
          <p className="text-slate-300 leading-8 max-w-2xl mx-auto text-sm sm:text-base">
            자극적인 마케팅보다 실제 기준을 먼저 봅니다.<br />
            성분, 제조, 철학, 사용성, 후기, 반려가족의 생활 흐름을 기준으로<br />
            믿고 선택할 수 있는 브랜드만 소개합니다.
          </p>
        </div>
      </section>

      {/* The Audit Checkpoints Section */}
      <section className="py-24 bg-white border-b border-[rgba(15,23,42,0.06)]">
        <div className="site-container">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-editorial font-bold text-[#17211D] mb-4 tracking-tight">The Audit Checkpoints</h2>
            <p className="text-[#64748B]">백조오브제는 판매 가능성보다 반려가족이 믿고 선택할 수 있는 기준을 먼저 확인합니다.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-6 gap-6 max-w-5xl mx-auto">
            <div className="bg-[#FBFAF7] border border-[rgba(15,23,42,0.06)] p-8 rounded-[18px] md:col-span-2 shadow-sm transition-transform hover:-translate-y-1">
              <span className="font-editorial text-slate-300 text-3xl mb-4 block">01</span>
              <h3 className="text-[#17211D] font-bold text-xl mb-3 tracking-tight">Expert Formulation<br/><span className="text-base font-medium text-slate-500 mt-1 block">전문 설계</span></h3>
              <p className="text-[#64748B] text-sm leading-relaxed mt-4">연구개발 또는 전문가 기준으로 설계된 제품인지 확인합니다.</p>
            </div>
            <div className="bg-[#FBFAF7] border border-[rgba(15,23,42,0.06)] p-8 rounded-[18px] md:col-span-2 shadow-sm transition-transform hover:-translate-y-1">
              <span className="font-editorial text-slate-300 text-3xl mb-4 block">02</span>
              <h3 className="text-[#17211D] font-bold text-xl mb-3 tracking-tight">Reliable Production<br/><span className="text-base font-medium text-slate-500 mt-1 block">신뢰 가능한 생산</span></h3>
              <p className="text-[#64748B] text-sm leading-relaxed mt-4">제조, 유통, 품질 관리 과정이 신뢰 가능한지 확인합니다.</p>
            </div>
            <div className="bg-[#FBFAF7] border border-[rgba(15,23,42,0.06)] p-8 rounded-[18px] md:col-span-2 shadow-sm transition-transform hover:-translate-y-1">
              <span className="font-editorial text-slate-300 text-3xl mb-4 block">03</span>
              <h3 className="text-[#17211D] font-bold text-xl mb-3 tracking-tight">Balanced Gourmet<br/><span className="text-base font-medium text-slate-500 mt-1 block">균형 잡힌 기호성</span></h3>
              <p className="text-[#64748B] text-sm leading-relaxed mt-4">아이의 기호성과 건강한 사용 흐름이 함께 고려되었는지 확인합니다.</p>
            </div>
            <div className="bg-[#FBFAF7] border border-[rgba(15,23,42,0.06)] p-8 rounded-[18px] md:col-span-3 md:col-start-1 lg:col-span-2 lg:col-start-2 shadow-sm transition-transform hover:-translate-y-1">
              <span className="font-editorial text-slate-300 text-3xl mb-4 block">04</span>
              <h3 className="text-[#17211D] font-bold text-xl mb-3 tracking-tight">Sustained Vitality<br/><span className="text-base font-medium text-slate-500 mt-1 block">지속 가능한 건강</span></h3>
              <p className="text-[#64748B] text-sm leading-relaxed mt-4">단기적인 소비보다 아이의 생애주기에 도움이 되는지 확인합니다.</p>
            </div>
            <div className="bg-[#FBFAF7] border border-[rgba(15,23,42,0.06)] p-8 rounded-[18px] md:col-span-3 lg:col-span-2 shadow-sm transition-transform hover:-translate-y-1">
              <span className="font-editorial text-slate-300 text-3xl mb-4 block">05</span>
              <h3 className="text-[#17211D] font-bold text-xl mb-3 tracking-tight">Mindful Record<br/><span className="text-base font-medium text-slate-500 mt-1 block">기록과 관리</span></h3>
              <p className="text-[#64748B] text-sm leading-relaxed mt-4">보호자가 아이의 반응과 변화를 기록하고 관리하기 쉬운 제품인지 확인합니다.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Brand List Section */}
      <section className="py-24">
        <div className="site-container">
          {/* 필터 탭 */}
          <div className="mb-16 flex flex-wrap justify-center gap-3">
            {[
              { id: 'all', label: '전체 브랜드' },
              { id: 'audit', label: '백조 인증 (A등급 이상)' },
              { id: 'recommended', label: '전문가 추천' },
              { id: 'new', label: '신규 입점' }
            ].map(tab => (
              <Link
                key={tab.id}
                href={`/brands?filter=${tab.id}`}
                className={`rounded-full px-6 py-3 text-sm font-semibold transition-all ${
                  filter === tab.id
                    ? 'bg-[#17211D] text-white shadow-md'
                    : 'bg-white text-slate-500 border border-[rgba(15,23,42,0.08)] hover:bg-slate-50 hover:text-[#17211D]'
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filteredBrands.map(brand => (
              <BrandCard key={brand.id} brand={brand} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
