import Image from 'next/image';
import {
  BriefcaseBusiness,
  Building2,
  Check,
  Handshake,
  PackageCheck,
  ShoppingCart,
  Store,
} from 'lucide-react';
import { EditorialActionLink, EditorialIconBadge } from '@/components/common/EditorialControls';
import { PageIntro, SectionHeading } from '@/components/common/EditorialHeading';
import { getPublishedPageContent } from '@/lib/cms/content';
import type { CmsLinkItem } from '@/lib/cms/pageDefinitions';

interface CmsB2BCard {
  eyebrow?: string;
  title: string;
  description: string;
  bullets?: string;
  image?: string;
  imageAlt?: string;
  href?: string;
  linkLabel?: string;
  visible: boolean;
}

type B2BContent = Record<string, unknown> & {
  hero: { visible: boolean; eyebrow: string; title: string; description: string; image: string; imageAlt: string; primaryCtaLabel: string; primaryCtaHref: string; secondaryCtaLabel: string; secondaryCtaHref: string; overlayEyebrow: string; overlayText: string };
  partners: { visible: boolean; eyebrow: string; title: string; description: string; items: CmsB2BCard[] };
  programs: { visible: boolean; eyebrow: string; title: string; description: string; notice: string; items: CmsB2BCard[] };
  process: { visible: boolean; eyebrow: string; title: string; description: string; notice: string; items: CmsB2BCard[] };
  closing: { visible: boolean; eyebrow: string; title: string; description: string; links: CmsLinkItem[] };
};

export const metadata = {
  title: 'B2B 파트너십',
  description: '기관과 브랜드의 목적에 맞춘 상품, 콘텐츠, 케어키트, 대량 구매 및 공동 기획 파트너십을 안내합니다.',
};

const partnerIcons = [Building2, BriefcaseBusiness, Store, Handshake];
const programIcons = [PackageCheck, ShoppingCart, Handshake];

export default async function B2BPage() {
  const content = await getPublishedPageContent<B2BContent>('b2b');
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
                {content.hero.primaryCtaLabel && <EditorialActionLink href={content.hero.primaryCtaHref}>{content.hero.primaryCtaLabel}</EditorialActionLink>}
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
            <div className="absolute inset-0 bg-gradient-to-t from-[#17211D]/85 via-[#17211D]/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
              <p className="font-editorial text-sm italic tracking-wide text-[#D8C4A3]">{content.hero.overlayEyebrow}</p>
              <p className="mt-2 max-w-lg text-[20px] font-bold leading-[1.3] text-[#FBFAF7] sm:text-[24px]">{content.hero.overlayText}</p>
            </div>
          </div>
        </div>
      </section>}

      {content.partners.visible && <section className="page-section">
        <div className="site-container-wide">
          <SectionHeading
            eyebrow={content.partners.eyebrow}
            title={content.partners.title}
            description={<p>{content.partners.description}</p>}
          />

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:gap-5 xl:grid-cols-4">
            {content.partners.items.filter((item) => item.visible).map((partner, index) => {
              const Icon = partnerIcons[index % partnerIcons.length];
              return (
                <article key={partner.title} className="rounded-[20px] border border-[#E7E0D5] bg-white p-5 transition-all duration-700 ease-out hover:-translate-y-1 hover:border-[#D8C4A3] hover:shadow-[0_20px_40px_-15px_rgba(23,33,29,0.08)] md:p-6">
                  <EditorialIconBadge icon={Icon} />
                  <h2 className="mt-5 text-[18px] font-bold text-[#17211D]">{partner.title}</h2>
                  <p className="mt-3 break-keep text-[15px] leading-[1.8] text-[#6F766F] md:text-[14px] md:leading-[1.7]">{partner.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>}

      {content.programs.visible && <section id="programs" className="page-section-muted scroll-mt-24 border-y border-[#E7E0D5]">
        <div className="site-container-wide">
          <SectionHeading
            eyebrow={content.programs.eyebrow}
            title={content.programs.title}
            description={<p>{content.programs.description}</p>}
          />

          {content.programs.notice && <p className="mt-5 max-w-4xl break-keep text-[14px] leading-[1.8] text-[#6F766F]">{content.programs.notice}</p>}

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {content.programs.items.filter((item) => item.visible).map((program, index) => {
              const Icon = programIcons[index % programIcons.length];
              return (
                <article key={program.title} className="group flex h-full flex-col rounded-[20px] border border-[#E7E0D5] bg-white p-5 transition-all duration-700 ease-out hover:-translate-y-1 hover:border-[#D8C4A3] hover:shadow-[0_20px_40px_-15px_rgba(23,33,29,0.08)] md:p-6">
                  {program.image && <div className="relative -mx-5 -mt-5 mb-5 h-44 overflow-hidden border-b border-[#E7E0D5] md:-mx-6 md:-mt-6">
                    <Image src={program.image} alt={program.imageAlt ?? ''} fill sizes="(max-width: 1023px) 100vw, 33vw" className="object-cover" />
                  </div>}
                  <div className="flex items-start justify-between">
                    <EditorialIconBadge icon={Icon} />
                    <span className="font-editorial text-sm italic text-[#A8742E]">{program.eyebrow}</span>
                  </div>
                  <h2 className="mt-5 text-[20px] font-bold tracking-tight text-[#17211D]">{program.title}</h2>
                  <p className="mt-3 break-keep text-[15px] leading-[1.8] text-[#6F766F] md:text-[14px] md:leading-[1.7]">{program.description}</p>
                  <ul className="mt-5 space-y-2.5 border-t border-[#E7E0D5] pt-4">
                    {(program.bullets ?? '').split('\n').map((entry) => entry.trim()).filter(Boolean).map((feature) => (
                      <li key={feature} className="flex items-center gap-2.5 text-[14px] leading-[1.7] text-[#6F766F] md:text-[13px]">
                        <Check className="size-4 shrink-0 text-[#A8742E]" strokeWidth={1.5} aria-hidden="true" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto pt-6">
                    {program.href && program.linkLabel && <EditorialActionLink href={program.href} variant="secondary" className="sm:min-w-[280px]">{program.linkLabel}</EditorialActionLink>}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>}

      {content.process.visible && <section className="page-section">
        <div className="site-container-wide grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <SectionHeading
            eyebrow={content.process.eyebrow}
            title={content.process.title}
            description={<p>{content.process.description}</p>}
          />

          <div>
            <ol className="border-t border-[#D8C4A3]">
              {content.process.items.filter((item) => item.visible).map((step, index) => (
                <li key={step.title} className="grid gap-3 border-b border-[#E7E0D5] py-5 sm:grid-cols-[64px_1fr] sm:py-6">
                  <span className="font-editorial text-xl italic text-[#A8742E]">0{index + 1}</span>
                  <div>
                    <h3 className="text-[18px] font-bold text-[#17211D]">{step.title}</h3>
                    <p className="mt-2 break-keep text-[15px] leading-[1.8] text-[#6F766F] md:text-[14px] md:leading-[1.7]">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
            {content.process.notice && <p className="mt-5 break-keep text-[14px] leading-[1.8] text-[#6F766F]">{content.process.notice}</p>}
          </div>
        </div>
      </section>}

      {content.closing.visible && <section className="bg-[#202521] py-14 text-[#FBFAF7] lg:py-16">
        <div className="site-container-wide flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="font-editorial text-sm italic tracking-wide text-[#D8C4A3]">{content.closing.eyebrow}</p>
            <h2 className="mt-3 text-[26px] font-bold leading-[1.25] text-[#FBFAF7] sm:text-[32px]">{content.closing.title}</h2>
            <p className="mt-4 max-w-3xl break-keep text-[16px] leading-[1.8] text-[#FBFAF7]/75 sm:text-[15px] sm:leading-[1.7]">{content.closing.description}</p>
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
