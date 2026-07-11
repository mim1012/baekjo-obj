import { concerns } from '@/data/concerns';
import ConcernCard from '@/components/common/ConcernCard';

export const metadata = {
  title: '고민별 케어',
  description: '우리 아이에게 보이는 변화를 따라 생활 속에서 살펴볼 신호와 관리 기준을 안내합니다.',
};

export default function ConcernsPage() {
  return (
    <main className="care-guide-page min-h-dvh flex flex-col">
      <div className="care-container py-10 md:py-14">
        {/* Hero Section */}
        <div className="mb-10 flex flex-col-reverse gap-8 lg:mb-12 lg:grid lg:grid-cols-12 lg:items-center lg:gap-10">
          <div className="lg:col-span-6">
            <span className="mb-3 inline-block text-[12px] font-bold tracking-widest text-[var(--care-accent)]">CARE GUIDE</span>
            <h1 className="break-keep text-2xl font-bold leading-snug tracking-tight text-[var(--care-text)] md:text-3xl md:leading-tight lg:text-[32px]">
              요즘, 우리 아이에게<br />
              어떤 변화가 보이나요?
            </h1>
            <p className="mt-4 max-w-2xl break-keep text-[14px] leading-relaxed text-[var(--care-text-muted)] md:text-[15px]">
              가장 마음에 걸리는 고민부터 골라보세요.<br className="hidden sm:block" />
              함께 살펴볼 신호와 생활 관리 기준을 차근차근 정리했어요.
            </p>
            <div className="mt-8 lg:mt-10">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold tracking-[0.2em] text-[var(--care-text-muted)]">INDEX</span>
                <span className="mt-1 text-xl font-light tracking-widest text-[var(--care-dark)]">08 CARE</span>
              </div>
            </div>
          </div>
          <div className="lg:col-span-6">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[16px] md:aspect-[21/9] lg:aspect-[21/9]">
              <img 
                src="/images/care_guide_hero.png" 
                alt="반려동물 케어 가이드" 
                className="size-full object-cover transition-transform duration-1000 hover:scale-105"
              />
            </div>
          </div>
        </div>

        {/* Card Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-4 lg:gap-6">
          {concerns.map(concern => (
            <ConcernCard key={concern.slug} concern={concern} />
          ))}
        </div>
        
        {/* Bottom Spacing */}
        <div className="h-[72px] md:h-[80px]"></div>
      </div>
    </main>
  );
}
