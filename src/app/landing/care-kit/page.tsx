import Image from 'next/image';
import { Activity, FileText, Gift, ShieldCheck, type LucideIcon } from 'lucide-react';
import { EditorialActionLink, EditorialIconBadge } from '@/components/common/EditorialControls';
import { PageIntro, SectionHeading } from '@/components/common/EditorialHeading';
import PartnerInquiryForm from '@/components/care-kit/PartnerInquiryForm';
import { defaultKitsConfig } from '@/lib/kits/config';
import { getKitsConfig } from '@/lib/kits/repo';
import type { CareKit } from '@/types';

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

const legacyDefaultKitNames = new Set(['병원 회복 케어 키트', '시니어 활력 키트']);

async function listVisibleCareKits(): Promise<CareKit[]> {
  const saved = await getKitsConfig();
  const savedItems = saved?.items ?? [];
  const hasLegacyDefaults = savedItems.some((kit) => legacyDefaultKitNames.has(kit.name));
  const items = hasLegacyDefaults
    ? [
        ...defaultKitsConfig.items,
        ...savedItems.filter((kit) => !legacyDefaultKitNames.has(kit.name)),
      ]
    : (saved ?? defaultKitsConfig).items;

  return items.filter((kit) => kit.isVisible);
}

export default async function CareKitLandingPage() {
  const careKits = await listVisibleCareKits();

  return (
    <div className="page-canvas">
      <section className="bg-noise border-b border-[#E7E0D5] bg-[#F7F4ED] py-12 md:py-14 lg:py-16">
        <div className="site-container-wide grid items-center gap-8 md:gap-10 lg:grid-cols-12 lg:gap-16">
          <PageIntro
            className="lg:col-span-6"
            eyebrow="CARE KIT"
            title={
              <>
                필요한 순간에 맞는
                <br />
                케어를 담습니다.
              </>
            }
            description={
              <p>
                파트너의 목적과 상황에 맞춰 상품과 안내를 구성하고, 필요한 협업 방식을 함께 고민합니다.
              </p>
            }
            action={<EditorialActionLink href="#partner">파트너십 문의하기</EditorialActionLink>}
          />

          <div className="relative h-[300px] overflow-hidden rounded-[24px] border border-[#E7E0D5] bg-white sm:h-[360px] lg:col-span-6 lg:h-[410px]">
            <Image
              src="/images/care_guide_hero.png"
              alt="보호자에게 필요한 순간을 위한 백조오브제 케어 키트"
              fill
              priority
              sizes="(max-width: 1023px) 100vw, 50vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#17211D]/85 via-[#17211D]/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 text-[#FBFAF7] sm:p-8">
              <p className="font-editorial text-sm italic tracking-wide text-[#D8C4A3]">MOMENTS OF CARE</p>
              <p className="mt-2 max-w-lg break-keep text-[20px] font-bold leading-[1.35] text-[#FBFAF7] sm:text-[24px]">
                각 순간을 생각하며 상품과 안내를 구성합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="page-section">
        <div className="site-container-wide">
          <SectionHeading
            eyebrow="CARE KIT PROJECT"
            title="파트너와 함께 만드는 케어"
            description={<p>초기 케어키트는 필요한 순간에 집중할 수 있도록 간결하게 구성하며, 파트너의 목적과 필요에 따라 구성과 범위를 계속 발전시켜갑니다.</p>}
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
                      주요 구성품: {kit.items.join(', ')}
                    </p>
                  )}
                  <div className="mt-auto border-t border-[#E7E0D5] pt-4">
                    <p className="text-[11px] font-bold tracking-wide text-[#A8742E]">추천 대상</p>
                    <p className="mt-2 break-keep text-[14px] leading-[1.7] text-[#59615B] md:text-[13px]">
                      {kit.target}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-8 grid gap-6 rounded-[24px] border border-[#E7E0D5] bg-[#FAF8F3] p-5 sm:p-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
            <div>
              <p className="font-editorial text-sm italic tracking-wide text-[#A8742E]">CARE KIT PARTNER</p>
              <Image
                src="/brands/penefit-official.png"
                alt="페네핏 로고"
                width={178}
                height={43}
                className="mt-4 h-10 w-[178px] object-contain object-left"
              />
            </div>
            <div>
              <p className="break-keep text-[18px] font-bold leading-[1.6] text-[#17211D]">
                첫 케어키트 프로젝트는 페네핏과 함께 기획하고 제작합니다.
              </p>
              <p className="mt-3 break-keep text-[14px] leading-[1.8] text-[#6F766F]">
                현재 상세 구성 및 디자인 이미지는 공개하지 않습니다.
              </p>
            </div>
          </div>

          <p className="mt-5 break-keep text-[14px] leading-[1.8] text-[#6F766F]">
            ※ 공개 가능한 파트너 및 협업 내용에 한해 소개하며, 비공개로 진행되는 프로젝트는 노출하지 않습니다.
          </p>
        </div>
      </section>

      <section id="partner" className="page-section-muted scroll-mt-24 border-y border-[#E7E0D5]">
        <div className="site-container-wide grid items-start gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:gap-16">
          <SectionHeading
            eyebrow="PARTNERSHIP INQUIRY"
            title="협업·제휴 문의"
            description={<p>함께하고 싶은 협업이나 제휴의 목적과 내용을 자유롭게 남겨주세요.</p>}
          />

          <div className="rounded-[24px] border border-[#E7E0D5] bg-white p-5 shadow-[0_20px_48px_-28px_rgba(23,33,29,0.16)] sm:p-8">
            <PartnerInquiryForm />
          </div>
        </div>
      </section>
    </div>
  );
}
