import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, FileText, ArrowRight, HeartPulse } from 'lucide-react';
import { getPublishedPageContent } from '@/lib/cms/content';
import type { SiteShellContent } from '@/components/providers/PublicSiteContentProvider';
import { redirect } from 'next/navigation';

type InsuranceLandingContent = Record<string, unknown> & {
  hero: { visible: boolean; eyebrow: string; title: string; description: string; image: string; imageAlt: string; primaryCtaLabel: string; primaryCtaHref: string; secondaryCtaLabel: string; secondaryCtaHref: string };
  body: {
    visible: boolean;
    title: string;
    description: string;
    benefitItems: Array<{ title: string; description: string; visible: boolean }>;
    processVisible: boolean;
    processTitle: string;
    processItems: Array<{ title: string; description: string; visible: boolean }>;
    ctaVisible: boolean;
    ctaTitle: string;
    ctaDescription: string;
    ctaLabel: string;
    ctaHref: string;
  };
};

const benefitIcons = [ShieldCheck, FileText, HeartPulse];

export const metadata = {
  title: '펫보험 무료 분석 | 백조오브제',
  description: '수많은 펫보험, 우리 아이에게 맞는 정답은 따로 있습니다. 백조오브제의 객관적인 무료 분석을 받아보세요.',
};

export default async function InsuranceLandingPage() {
  const [content, shell] = await Promise.all([
    getPublishedPageContent<InsuranceLandingContent>('insurance-landing'),
    getPublishedPageContent<SiteShellContent & Record<string, unknown>>('site-shell'),
  ]);
  if (!shell.features.insurance) redirect('/');
  return (
    <div className="bg-[#FAF9F5] min-h-dvh">
      {/* Hero Section */}
      {content.hero.visible && <section className="bg-[#2F3B34] text-white py-24 lg:py-32 overflow-hidden relative">
        <div className={`site-container relative z-10 ${content.hero.image ? 'grid items-center gap-10 text-left lg:grid-cols-[1.15fr_0.85fr]' : 'text-center'}`}>
          <div>
          <p className="text-[#B5BDB6] font-semibold tracking-widest text-sm mb-4 uppercase">{content.hero.eyebrow}</p>
          <h1 className="text-4xl md:text-6xl font-editorial mb-6 text-balance leading-tight">
            <MultilineText text={content.hero.title} />
          </h1>
          <p className="text-[#D8DCD9] max-w-2xl mx-auto leading-relaxed text-lg">
            {content.hero.description}
          </p>
          <div className={`mt-10 flex flex-wrap gap-3 ${content.hero.image ? '' : 'justify-center'}`}>
            {content.hero.primaryCtaLabel && <Link href={content.hero.primaryCtaHref} className="inline-flex items-center gap-2 bg-[#F3F1EB] px-8 py-4 text-sm font-semibold text-[#2B352E] transition hover:bg-white rounded-sm">
              {content.hero.primaryCtaLabel} <ArrowRight className="size-4" />
            </Link>}
            {content.hero.secondaryCtaLabel && <Link href={content.hero.secondaryCtaHref} className="inline-flex items-center gap-2 border border-white/40 px-8 py-4 text-sm font-semibold text-white transition hover:bg-white/10 rounded-sm">{content.hero.secondaryCtaLabel}</Link>}
          </div>
          </div>
          {content.hero.image && <div className="relative h-[300px] overflow-hidden rounded-sm lg:h-[420px]">
            <Image src={content.hero.image} alt={content.hero.imageAlt} fill priority sizes="(max-width: 1023px) 100vw, 40vw" className="object-cover" />
          </div>}
        </div>
      </section>}

      {/* Why Section */}
      {content.body.visible && <><section className="py-24">
        <div className="site-container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#202521] mb-4">{content.body.title}</h2>
            <p className="text-[#6F756F]">{content.body.description}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {content.body.benefitItems.filter((item) => item.visible).map((item, index) => {
              const Icon = benefitIcons[index % benefitIcons.length];
              return <div key={item.title} className="bg-white p-8 border border-[#D8D6CE] text-center">
                <Icon className="size-12 text-[#5E6C62] mx-auto mb-5" strokeWidth={1.5} />
                <h3 className="text-xl font-bold text-[#2F3B34] mb-3">{item.title}</h3>
                <p className="text-[#6F756F] text-sm leading-relaxed">{item.description}</p>
              </div>;
            })}
          </div>
        </div>
      </section>

      {/* Steps */}
      {content.body.processVisible && <section className="bg-[#EAE8E1] py-24">
        <div className="site-container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#202521] mb-4">{content.body.processTitle}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {content.body.processItems.filter((item) => item.visible).map((item, index) => (
              <div key={item.title} className="bg-[#F8F7F2] p-6 text-center rounded-sm">
                <span className="font-editorial text-3xl text-[#8A918B] block mb-4">{String(index + 1).padStart(2, '0')}</span>
                <h3 className="font-bold text-[#2F3B34] mb-2">{item.title}</h3>
                <p className="text-sm text-[#6F756F]">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>}

      {/* CTA Section */}
      {content.body.ctaVisible && <section className="py-24 text-center">
        <div className="site-container">
          <h2 className="text-3xl font-bold text-[#202521] mb-6">{content.body.ctaTitle}</h2>
          <p className="text-[#6F756F] mb-10 max-w-xl mx-auto whitespace-pre-line">{content.body.ctaDescription}</p>
          <Link href={content.body.ctaHref} className="inline-flex items-center gap-2 bg-[#2F3B34] px-8 py-4 text-sm font-semibold text-white transition hover:bg-[#3D4A42] rounded-sm">
            {content.body.ctaLabel} <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>}
      </>}
    </div>
  );
}

function MultilineText({ text }: { text: string }) {
  return <>{text.split('\n').map((line, index) => <span key={`${line}-${index}`}>{index > 0 && <br />}{line}</span>)}</>;
}
