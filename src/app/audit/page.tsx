import Image from 'next/image';
import {
  Building2,
  Check,
  ClipboardCheck,
  Heart,
  Leaf,
  RefreshCw,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { EditorialActionLink, EditorialIconBadge } from '@/components/common/EditorialControls';
import { PageIntro, SectionHeading } from '@/components/common/EditorialHeading';
import { getPublishedPageContent } from '@/lib/cms/content';
import type { CmsLinkItem } from '@/lib/cms/pageDefinitions';

interface CmsCardItem {
  number?: string;
  title: string;
  description: string;
  bullets?: string;
  visible: boolean;
}

type AuditContent = Record<string, unknown> & {
  hero: { visible: boolean; eyebrow: string; title: string; description: string; image: string; imageAlt: string; primaryCtaLabel: string; primaryCtaHref: string; secondaryCtaLabel: string; secondaryCtaHref: string; overlayText: string };
  checkpoints: { visible: boolean; eyebrow: string; title: string; description: string; items: CmsCardItem[] };
  process: { visible: boolean; eyebrow: string; title: string; description: string; items: CmsCardItem[] };
  status: { visible: boolean; eyebrow: string; title: string; description: string; items: CmsCardItem[]; notice: string; disclaimer: string; legalDisclaimer: string };
  closing: { visible: boolean; eyebrow: string; title: string; links: CmsLinkItem[] };
};

export const metadata = {
  title: '백조오브제 Audit의 검토 기준',
  description: '브랜드 철학과 제품의 특성, 실제 운영과 확인 기록까지 백조오브제가 살펴보는 기준을 안내합니다.',
};

const pillarIcons = [Building2, Leaf, Truck, Heart];
const statusIcons = [ShieldCheck, ClipboardCheck, RefreshCw];

export default async function AuditPage() {
  const content = await getPublishedPageContent<AuditContent>('audit');
  return (
    <div className="page-canvas">
      {content.hero.visible && <section className="bg-noise border-b border-[#E7E0D5] bg-[#F7F4ED] py-12 md:py-14 lg:py-16">
        <div className="site-container-wide grid items-center gap-8 md:gap-10 lg:grid-cols-12 lg:gap-16">
          <PageIntro
            className="lg:col-span-6"
            eyebrow={content.hero.eyebrow}
            title={<MultilineText text={content.hero.title} />}
            description={
              <p>
                {content.hero.description}
              </p>
            }
            action={
              <div className="grid w-full gap-3 sm:flex">
                {content.hero.primaryCtaLabel && <EditorialActionLink href={content.hero.primaryCtaHref} variant="secondary">{content.hero.primaryCtaLabel}</EditorialActionLink>}
                {content.hero.secondaryCtaLabel && <EditorialActionLink href={content.hero.secondaryCtaHref} variant="secondary">{content.hero.secondaryCtaLabel}</EditorialActionLink>}
              </div>
            }
          />

          <div className="relative h-[300px] overflow-hidden rounded-[24px] border border-[#E7E0D5] bg-white sm:h-[360px] lg:col-span-6 lg:h-[410px]">
            {content.hero.image && <Image
              src={content.hero.image}
              alt={content.hero.imageAlt}
              fill
              priority
              sizes="(max-width: 1023px) 100vw, 50vw"
              className="object-cover"
            />}
            <div className="absolute inset-0 bg-gradient-to-t from-[#17211D]/80 via-[#17211D]/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 text-[#FBFAF7] sm:p-8">
              <p className="mt-2 max-w-md text-[20px] font-bold leading-[1.35] text-[#FBFAF7] sm:text-[24px]">
                {content.hero.overlayText}
              </p>
            </div>
          </div>
        </div>
      </section>}

      {content.checkpoints.visible && <section id="pillars" className="page-section scroll-mt-24 !pt-8 md:!pt-10 xl:!pt-12">
        <div className="site-container-wide">
          <div className="max-w-3xl">
            <p className="font-editorial text-sm italic tracking-wide text-[#A8742E]">{content.checkpoints.eyebrow}</p>
            <h2 className="mt-3 text-[24px] font-bold tracking-tight text-[#17211D] sm:text-[30px]">{content.checkpoints.title}</h2>
            <p className="mt-3 break-keep text-[15px] leading-[1.8] text-[#6F766F]">
              {content.checkpoints.description}
            </p>
          </div>

          <div
            className="hide-scrollbar -mx-5 mt-8 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-4 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0 xl:grid-cols-4 xl:gap-5"
            role="region"
            aria-label="백조오브제 Audit 네 가지 기준"
          >
            {content.checkpoints.items.filter((item) => item.visible).map((pillar, index) => {
              const Icon = pillarIcons[index % pillarIcons.length];
              return (
                <article key={`${pillar.number}-${pillar.title}`} className="group flex min-h-[360px] w-[82vw] max-w-[352px] shrink-0 snap-start flex-col rounded-[20px] border border-[#E7E0D5] bg-white p-5 transition-all duration-700 ease-out hover:-translate-y-1 hover:border-[#D8C4A3] hover:shadow-[0_20px_40px_-15px_rgba(23,33,29,0.08)] md:min-h-0 md:w-auto md:max-w-none md:p-6">
                  <div className="flex items-start justify-between">
                    <EditorialIconBadge icon={Icon} />
                    <span className="font-editorial text-lg italic text-[#A8742E]">{pillar.number || String(index + 1).padStart(2, '0')}</span>
                  </div>
                  <h2 className="mt-5 text-[18px] font-bold tracking-tight text-[#17211D]">{pillar.title}</h2>
                  <p className="mt-3 break-keep text-[15px] leading-[1.8] text-[#6F766F] md:text-[14px] md:leading-[1.7]">{pillar.description}</p>
                  <ul className="mt-5 space-y-2.5 border-t border-[#E7E0D5] pt-4">
                    {(pillar.bullets ?? '').split('\n').map((entry) => entry.trim()).filter(Boolean).map((check) => (
                      <li key={check} className="flex items-start gap-2.5 text-[14px] leading-[1.7] text-[#6F766F] md:text-[13px] md:leading-[1.6]">
                        <Check className="mt-0.5 size-4 shrink-0 text-[#A8742E]" strokeWidth={1.5} aria-hidden="true" />
                        {check}
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </div>
      </section>}

      {content.process.visible && <section className="page-section-muted border-y border-[#E7E0D5]">
        <div className="site-container-wide grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <SectionHeading
            eyebrow={content.process.eyebrow}
            title={content.process.title}
            description={<p>{content.process.description}</p>}
          />

          <ol
            className="hide-scrollbar -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-4 md:mx-0 md:block md:border-t md:border-[#D8C4A3] md:px-0 md:pb-0"
            aria-label="백조오브제 Audit 검토 과정"
          >
            {content.process.items.filter((item) => item.visible).map((step, index) => (
              <li key={step.title} className="flex min-h-[220px] w-[82vw] max-w-[352px] shrink-0 snap-start flex-col gap-4 rounded-[20px] border border-[#E7E0D5] bg-white p-5 md:grid md:min-h-0 md:w-auto md:max-w-none md:grid-cols-[64px_1fr] md:gap-3 md:rounded-none md:border-x-0 md:border-t-0 md:bg-transparent md:px-0 md:py-6">
                <span className="font-editorial text-xl italic text-[#A8742E]">0{index + 1}</span>
                <div>
                  <h3 className="text-[18px] font-bold text-[#17211D]">{step.title}</h3>
                  <p className="mt-2 break-keep text-[15px] leading-[1.8] text-[#6F766F] md:text-[14px] md:leading-[1.7]">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>}

      {content.status.visible && <section className="page-section">
        <div className="site-container-wide">
          <SectionHeading
            eyebrow={content.status.eyebrow}
            title={content.status.title}
            description={<p>{content.status.description}</p>}
          />

          <div className="mt-8 grid gap-4 md:grid-cols-3 md:gap-5">
            {content.status.items.filter((item) => item.visible).map((item, index) => {
              const Icon = statusIcons[index % statusIcons.length];
              return (
                <article key={item.title} className="rounded-[20px] border border-[#E7E0D5] bg-[#FAF8F3] p-5 md:p-6">
                  <EditorialIconBadge icon={Icon} />
                  <h3 className="mt-5 text-[18px] font-bold text-[#17211D]">{item.title}</h3>
                  <p className="mt-3 break-keep text-[15px] leading-[1.8] text-[#6F766F] md:text-[14px] md:leading-[1.7]">{item.description}</p>
                </article>
              );
            })}
          </div>

          {content.status.notice && <p className="mt-5 break-keep text-[14px] leading-[1.8] text-[#59615B]">{content.status.notice}</p>}

          <aside className="mt-6 rounded-[20px] border border-[#E7E0D5] bg-white p-5 sm:p-6" aria-label="백조오브제 Audit 안내">
            <p className="break-keep text-[15px] leading-[1.8] text-[#6F766F] md:text-[14px] md:leading-[1.7]">{content.status.disclaimer}</p>
          </aside>

          {content.status.legalDisclaimer && <p className="mt-5 break-keep text-[15px] leading-[1.8] text-[#59615B] md:text-[14px] md:leading-[1.7]">{content.status.legalDisclaimer}</p>}
        </div>
      </section>}

      {content.closing.visible && <section className="bg-[#202521] py-14 text-[#FBFAF7] lg:py-16">
        <div className="site-container-wide flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="font-editorial text-sm italic tracking-wide text-[#D8C4A3]">{content.closing.eyebrow}</p>
            <h2 className="mt-3 text-[26px] font-bold leading-[1.25] text-[#FBFAF7] sm:text-[32px]">{content.closing.title}</h2>
          </div>
          <div className="grid w-full gap-3 sm:flex sm:w-auto">
            {content.closing.links.filter((link) => link.visible).map((link, index) => (
              <EditorialActionLink key={`${link.href}-${link.label}`} href={link.href} variant={index === 0 ? 'inverse' : 'inverse-outline'}>{link.label}</EditorialActionLink>
            ))}
          </div>
        </div>
      </section>}
    </div>
  );
}

function MultilineText({ text }: { text: string }) {
  return <>{text.split('\n').map((line, index) => <span key={`${line}-${index}`}>{index > 0 && <br />}{line}</span>)}</>;
}
