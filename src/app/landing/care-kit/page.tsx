import Image from 'next/image';
import { Activity, FileText, Gift, ShieldCheck, type LucideIcon } from 'lucide-react';
import { EditorialActionLink, EditorialIconBadge } from '@/components/common/EditorialControls';
import { PageIntro, SectionHeading } from '@/components/common/EditorialHeading';
import PartnerInquiryForm from '@/components/care-kit/PartnerInquiryForm';
import { resolvePublicKitsConfig } from '@/lib/kits/config';
import { getKitsConfig } from '@/lib/kits/repo';
import type { CareKit } from '@/types';
import { getPublishedPageContent } from '@/lib/cms/content';

type CareKitContent = Record<string, unknown> & {
  hero: { visible: boolean; eyebrow: string; title: string; description: string; image: string; imageAlt: string; primaryCtaLabel: string; primaryCtaHref: string; secondaryCtaLabel: string; secondaryCtaHref: string; overlayEyebrow: string; overlayText: string };
  body: {
    visible: boolean;
    eyebrow: string;
    title: string;
    description: string;
    partnerVisible: boolean;
    partnerEyebrow: string;
    partnerLogo: string;
    partnerLogoAlt: string;
    partnerTitle: string;
    partnerDescription: string;
    disclosure: string;
    inquiryVisible: boolean;
    inquiryEyebrow: string;
    inquiryTitle: string;
    inquiryDescription: string;
    kitItemsLabel: string;
    kitTargetLabel: string;
  };
};

export const metadata = {
  title: '케어 키트 | 백조오브제',
  description: '파트너의 목적과 상황에 맞춰 함께 기획하는 백조오브제 케어 키트를 소개합니다.',
};

export const dynamic = 'force-dynamic';

const kitIcons = {
  hospital: ShieldCheck,
  vitality: Activity,
  funeral: FileText,
  welcome: Gift,
  sample: Gift,
} satisfies Record<CareKit['type'], LucideIcon>;

async function listVisibleCareKits(): Promise<CareKit[]> {
  const saved = await getKitsConfig();
  return resolvePublicKitsConfig(saved).items.filter((kit) => kit.isVisible);
}

export default async function CareKitLandingPage() {
  const [careKits, content] = await Promise.all([
    listVisibleCareKits(),
    getPublishedPageContent<CareKitContent>('care-kit'),
  ]);

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
            action={<div className="grid w-full gap-3 sm:flex">
              {content.hero.primaryCtaLabel && <EditorialActionLink href={content.hero.primaryCtaHref}>{content.hero.primaryCtaLabel}</EditorialActionLink>}
              {content.hero.secondaryCtaLabel && <EditorialActionLink href={content.hero.secondaryCtaHref} variant="secondary">{content.hero.secondaryCtaLabel}</EditorialActionLink>}
            </div>}
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
            <div className="absolute inset-x-0 bottom-0 p-6 text-[#FBFAF7] sm:p-8">
              <p className="font-editorial text-sm italic tracking-wide text-[#D8C4A3]">{content.hero.overlayEyebrow}</p>
              <p className="mt-2 max-w-lg break-keep text-[20px] font-bold leading-[1.35] text-[#FBFAF7] sm:text-[24px]">{content.hero.overlayText}</p>
            </div>
          </div>
        </div>
      </section>}

      {content.body.visible && <section className="page-section">
        <div className="site-container-wide">
          <SectionHeading
            eyebrow={content.body.eyebrow}
            title={content.body.title}
            description={<p>{content.body.description}</p>}
          />

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5">
            {careKits.map((kit, index) => {
              const Icon = kitIcons[kit.type];
              return (
                <article
                  key={kit.id}
                  className="group flex h-full flex-col rounded-[20px] border border-[#E7E0D5] bg-white p-5 transition-all duration-700 ease-out hover:-translate-y-1 hover:border-[#D8C4A3] hover:shadow-[0_20px_40px_-15px_rgba(23,33,29,0.08)] md:p-6"
                >
                  <div className="flex items-start justify-between">
                    <EditorialIconBadge icon={Icon} />
                    <span className="font-editorial text-lg italic text-[#A8742E]">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <h2 className="mt-5 text-[18px] font-bold tracking-tight text-[#17211D]">{kit.name}</h2>
                  <p className="mt-3 break-keep text-[15px] leading-[1.8] text-[#6F766F] md:text-[14px] md:leading-[1.7]">
                    {kit.description || kit.purpose}
                  </p>
                  {kit.items.length > 0 && (
                    <p className="mt-3 break-keep text-[13px] leading-[1.7] text-[#59615B]">
                      {content.body.kitItemsLabel}: {kit.items.join(', ')}
                    </p>
                  )}
                  <div className="mt-auto border-t border-[#E7E0D5] pt-4">
                    <p className="text-[11px] font-bold tracking-wide text-[#A8742E]">{content.body.kitTargetLabel}</p>
                    <p className="mt-2 break-keep text-[14px] leading-[1.7] text-[#59615B] md:text-[13px]">
                      {kit.target}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>

          {content.body.partnerVisible && <div className="mt-8 grid gap-6 rounded-[24px] border border-[#E7E0D5] bg-[#FAF8F3] p-5 sm:p-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
            <div>
              <p className="font-editorial text-sm italic tracking-wide text-[#A8742E]">{content.body.partnerEyebrow}</p>
              {content.body.partnerLogo && <Image
                src={content.body.partnerLogo}
                alt={content.body.partnerLogoAlt}
                width={178}
                height={43}
                className="mt-4 h-10 w-[178px] object-contain object-left"
              />}
            </div>
            <div>
              <p className="break-keep text-[18px] font-bold leading-[1.6] text-[#17211D]">
                {content.body.partnerTitle}
              </p>
              <p className="mt-3 break-keep text-[14px] leading-[1.8] text-[#6F766F]">
                {content.body.partnerDescription}
              </p>
            </div>
          </div>}

          {content.body.disclosure && <p className="mt-5 break-keep text-[14px] leading-[1.8] text-[#6F766F]">{content.body.disclosure}</p>}
        </div>
      </section>}

      {content.body.inquiryVisible && <section id="partner" className="page-section-muted scroll-mt-24 border-y border-[#E7E0D5]">
        <div className="site-container-wide grid items-start gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:gap-16">
          <SectionHeading
            eyebrow={content.body.inquiryEyebrow}
            title={content.body.inquiryTitle}
            description={<p>{content.body.inquiryDescription}</p>}
          />

          <div className="rounded-[24px] border border-[#E7E0D5] bg-white p-5 shadow-[0_20px_48px_-28px_rgba(23,33,29,0.16)] sm:p-8">
            <PartnerInquiryForm />
          </div>
        </div>
      </section>}
    </div>
  );
}

function MultilineText({ text }: { text: string }) {
  return <>{text.split('\n').map((line, index) => <span key={`${line}-${index}`}>{index > 0 && <br />}{line}</span>)}</>;
}
