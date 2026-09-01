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

export const metadata = {
  title: 'B2B 파트너십',
  description: '기관과 브랜드의 목적에 맞춘 상품, 콘텐츠, 케어키트, 대량 구매 및 공동 기획 파트너십을 안내합니다.',
};

const partnerTypes = [
  {
    icon: Building2,
    title: '동물병원',
    description: '보호자와 반려동물이 필요한 상황에 맞춰 상품과 구성을 제안합니다.',
  },
  {
    icon: BriefcaseBusiness,
    title: '기업·단체',
    description: '임직원 복지, 고객 선물, 캠페인 등 목적에 맞춰 상품과 구성을 제안합니다.',
  },
  {
    icon: Store,
    title: '반려생활 공간',
    description: '호텔, 유치원, 장례식장·추모 공간 등 공간의 성격과 이용 목적에 맞는 구성을 제안합니다.',
  },
  {
    icon: Handshake,
    title: '브랜드 파트너',
    description: '입점부터 공동 기획까지 브랜드의 방향과 목적에 맞는 협업 방식을 함께 찾습니다.',
  },
];

const programs = [
  {
    icon: PackageCheck,
    eyebrow: 'CARE KIT',
    title: '상황별 케어키트',
    description: '웰컴, 위로 등 필요한 순간과 목적에 맞춰 상품과 안내 구성을 제안합니다.',
    features: ['목적에 맞는 상품 구성', '수량·예산에 따른 제안', '필요한 안내 구성'],
    href: '/landing/care-kit',
    cta: '케어키트 안내',
  },
  {
    icon: ShoppingCart,
    eyebrow: 'SUPPLY',
    title: '대량 구매·정기 공급',
    description: '기업과 기관에 필요한 상품을 수량, 예산, 일정에 맞춰 제안합니다.',
    features: ['대량 구매 협의', '정기 공급 협의', '구성 및 납품 일정 조율'],
    href: '/signup',
    cta: 'B2B 회원가입',
  },
  {
    icon: Handshake,
    eyebrow: 'PARTNERSHIP',
    title: '입점·공동 기획',
    description: '브랜드의 방향과 제품을 살펴보고, 입점부터 필요한 협업 방식을 함께 논의합니다.',
    features: ['입점 및 운영 협의', '브랜드·제품에 맞는 협업 검토', '필요 시 공동 기획 진행'],
    href: '/signup',
    cta: '브랜드 회원가입',
  },
];

const process = [
  { title: '문의 접수', description: '기관·브랜드 유형과 원하는 협업 내용을 남겨주세요.' },
  { title: '내용 확인', description: '문의 내용을 바탕으로 필요한 사항과 협업 방향을 확인합니다.' },
  { title: '제안 및 협의', description: '협업 범위와 세부 내용, 일정 등을 정리해 함께 협의합니다.' },
  { title: '진행', description: '협의된 내용과 일정에 따라 협업을 진행합니다.' },
];

export default function B2BPage() {
  return (
    <div className="page-canvas">
      <section className="bg-noise border-b border-[#E7E0D5] bg-[#F7F4ED] py-12 md:py-14 lg:py-16">
        <div className="site-container-wide grid items-center gap-8 md:gap-10 lg:grid-cols-12 lg:gap-16">
          <PageIntro
            className="lg:col-span-6"
            eyebrow="BAEKJO OBJET FOR BUSINESS"
            title={<>반려가족과 만나는 순간을<br />함께 설계합니다.</>}
            description={
              <p>
                백조오브제 B2B는 기관과 브랜드의 목적에 맞춰 상품과 콘텐츠, 필요한 구성을 함께 제안합니다.
              </p>
            }
            action={
              <div className="grid w-full gap-3 sm:flex">
                <EditorialActionLink href="/landing/care-kit#partner">B2B 문의하기</EditorialActionLink>
                <EditorialActionLink href="#programs" variant="secondary">협업 프로그램 보기</EditorialActionLink>
              </div>
            }
          />

          <div className="relative h-[300px] overflow-hidden rounded-[24px] border border-[#E7E0D5] bg-white sm:h-[360px] lg:col-span-6 lg:h-[410px]">
            <Image
              src="/images/care_guide_hero.png"
              alt="반려생활 기관을 위한 백조오브제 B2B 파트너십"
              fill
              priority
              sizes="(max-width: 1023px) 100vw, 50vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#17211D]/85 via-[#17211D]/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
              <p className="font-editorial text-sm italic tracking-wide text-[#D8C4A3]">Care in every touchpoint</p>
              <p className="mt-2 max-w-lg text-[20px] font-bold leading-[1.3] text-[#FBFAF7] sm:text-[24px]">
                기관의 목적과 보호자의 필요가 만나는 구성을 제안합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="page-section">
        <div className="site-container-wide">
          <SectionHeading
            eyebrow="FOR PARTNERS"
            title="목적에 따라 협업의 방식도 달라집니다."
            description={<p>기관과 브랜드의 목적에 맞춰 필요한 협업 방식을 함께 찾습니다.</p>}
          />

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:gap-5 xl:grid-cols-4">
            {partnerTypes.map((partner) => {
              const Icon = partner.icon;
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
      </section>

      <section id="programs" className="page-section-muted scroll-mt-24 border-y border-[#E7E0D5]">
        <div className="site-container-wide">
          <SectionHeading
            eyebrow="PARTNERSHIP PROGRAMS"
            title="필요에 맞는 협업 방식을 제안합니다."
            description={<p>상품 공급부터 케어키트, 입점과 공동 기획까지 목적에 맞는 방식으로 협업합니다.</p>}
          />

          <p className="mt-5 max-w-4xl break-keep text-[14px] leading-[1.8] text-[#6F766F]">
            ※ 프로젝트는 충분한 협의와 준비를 거쳐 공개하며, 기획·진행 단계의 내용은 노출을 지양합니다.
            일부 프로젝트는 파트너사와의 협의에 따라 공개되지 않을 수 있습니다.
          </p>

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {programs.map((program) => {
              const Icon = program.icon;
              return (
                <article key={program.title} className="group flex h-full flex-col rounded-[20px] border border-[#E7E0D5] bg-white p-5 transition-all duration-700 ease-out hover:-translate-y-1 hover:border-[#D8C4A3] hover:shadow-[0_20px_40px_-15px_rgba(23,33,29,0.08)] md:p-6">
                  <div className="flex items-start justify-between">
                    <EditorialIconBadge icon={Icon} />
                    <span className="font-editorial text-sm italic text-[#A8742E]">{program.eyebrow}</span>
                  </div>
                  <h2 className="mt-5 text-[20px] font-bold tracking-tight text-[#17211D]">{program.title}</h2>
                  <p className="mt-3 break-keep text-[15px] leading-[1.8] text-[#6F766F] md:text-[14px] md:leading-[1.7]">{program.description}</p>
                  <ul className="mt-5 space-y-2.5 border-t border-[#E7E0D5] pt-4">
                    {program.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2.5 text-[14px] leading-[1.7] text-[#6F766F] md:text-[13px]">
                        <Check className="size-4 shrink-0 text-[#A8742E]" strokeWidth={1.5} aria-hidden="true" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto pt-6">
                    <EditorialActionLink href={program.href} variant="secondary" className="sm:min-w-[280px]">
                      {program.cta}
                    </EditorialActionLink>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="page-section">
        <div className="site-container-wide grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <SectionHeading
            eyebrow="HOW IT WORKS"
            title="협업은 이렇게 진행됩니다."
            description={<p>구체적인 협업 내용이 정해지기 전에도 문의할 수 있습니다. 협업 목적을 확인한 뒤 필요한 범위와 일정을 함께 정리합니다.</p>}
          />

          <div>
            <ol className="border-t border-[#D8C4A3]">
              {process.map((step, index) => (
                <li key={step.title} className="grid gap-3 border-b border-[#E7E0D5] py-5 sm:grid-cols-[64px_1fr] sm:py-6">
                  <span className="font-editorial text-xl italic text-[#A8742E]">0{index + 1}</span>
                  <div>
                    <h3 className="text-[18px] font-bold text-[#17211D]">{step.title}</h3>
                    <p className="mt-2 break-keep text-[15px] leading-[1.8] text-[#6F766F] md:text-[14px] md:leading-[1.7]">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-5 break-keep text-[14px] leading-[1.8] text-[#6F766F]">
              ※ 진행 중인 프로젝트와 검토 일정에 따라 기획 및 제안까지 다소 시간이 소요될 수 있습니다.
              충분한 검토가 필요한 협업은 일정에 여유를 두고 문의해 주세요.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[#202521] py-14 text-[#FBFAF7] lg:py-16">
        <div className="site-container-wide flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="font-editorial text-sm italic tracking-wide text-[#D8C4A3]">START A PARTNERSHIP</p>
            <h2 className="mt-3 text-[26px] font-bold leading-[1.25] text-[#FBFAF7] sm:text-[32px]">필요한 순간과 목적을 들려주세요.</h2>
            <p className="mt-4 max-w-3xl break-keep text-[16px] leading-[1.8] text-[#FBFAF7]/75 sm:text-[15px] sm:leading-[1.7]">서로의 가치를 지키며 함께 성장할 수 있는 관계를 만들어갑니다.</p>
          </div>
          <div className="grid w-full gap-3 sm:flex sm:w-auto">
            <EditorialActionLink href="/landing/care-kit#partner" variant="inverse">B2B 문의하기</EditorialActionLink>
            <EditorialActionLink href="/signup" variant="inverse-outline">파트너 회원가입</EditorialActionLink>
          </div>
        </div>
      </section>
    </div>
  );
}
