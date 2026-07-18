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
  title: 'B2B 파트너십 | 백조오브제',
  description: '동물병원, 반려생활 기관, 기업과 브랜드를 위한 케어키트, 대량 구매, 입점 및 공동 기획 파트너십을 안내합니다.',
};

const partnerTypes = [
  {
    icon: Building2,
    title: '동물병원·전문기관',
    description: '진료와 회복, 첫 방문과 이별 등 보호자에게 안내가 필요한 순간에 맞춘 케어 구성을 제안합니다.',
  },
  {
    icon: BriefcaseBusiness,
    title: '기업·단체',
    description: '임직원 복지, 고객 선물, 캠페인 목적에 맞춰 상품과 가이드가 함께 담긴 구성을 설계합니다.',
  },
  {
    icon: Store,
    title: '반려생활 공간',
    description: '호텔, 유치원, 장례 및 커뮤니티 공간의 고객 경험에 맞는 상품 공급과 케어 콘텐츠를 연결합니다.',
  },
  {
    icon: Handshake,
    title: '브랜드 파트너',
    description: '입점 검토부터 공동 큐레이션, 콘텐츠와 체험 캠페인까지 브랜드의 강점이 정확히 전달되도록 협업합니다.',
  },
];

const programs = [
  {
    icon: PackageCheck,
    eyebrow: 'Care kit',
    title: '상황별 케어키트',
    description: '병원, 웰컴, 활력, 위로 등 보호자에게 필요한 순간을 기준으로 상품과 안내 콘텐츠를 함께 구성합니다.',
    features: ['기관 목적에 맞춘 구성', '수량·예산별 제안', '보호자용 안내 콘텐츠'],
    href: '/landing/care-kit',
    cta: '케어키트 자세히 보기',
  },
  {
    icon: ShoppingCart,
    eyebrow: 'Business order',
    title: '대량 구매·정기 공급',
    description: '기업 선물과 기관 운영에 필요한 검증 상품을 예산과 일정, 납품 조건에 맞춰 제안합니다.',
    features: ['대량 구매 견적', '정기 공급 협의', '구성 및 납품 일정 조율'],
    href: '/signup',
    cta: 'B2B 회원 시작하기',
  },
  {
    icon: Handshake,
    eyebrow: 'Brand partnership',
    title: '입점·공동 기획',
    description: '브랜드의 운영 방향과 상품 자료를 확인하고 백조오브제 고객에게 맞는 소개 방식과 협업을 설계합니다.',
    features: ['입점 자료 검토', '콘텐츠 공동 기획', '체험·캠페인 협의'],
    href: '/signup',
    cta: '파트너 등록하기',
  },
];

const process = [
  { title: '문의 접수', description: '기관 유형, 필요한 수량과 일정, 협업 목적을 남겨주세요.' },
  { title: '담당자 상담', description: '요청 내용을 확인한 뒤 필요한 조건과 운영 환경을 함께 정리합니다.' },
  { title: '맞춤 제안', description: '상품 구성, 단가, 일정과 안내 콘텐츠를 포함한 제안 내용을 전달합니다.' },
  { title: '실행과 운영', description: '확정된 조건에 따라 제작·납품하고 이후 운영과 추가 요청을 지원합니다.' },
];

export default function B2BPage() {
  return (
    <div className="page-canvas">
      <section className="bg-noise border-b border-[#E7E0D5] bg-[#F7F4ED] py-12 md:py-14 lg:py-16">
        <div className="site-container-wide grid items-center gap-8 md:gap-10 lg:grid-cols-12 lg:gap-16">
          <PageIntro
            className="lg:col-span-6"
            eyebrow="Baekjo for business"
            title={<>반려가족과 만나는 순간을<br />함께 설계합니다.</>}
            description={
              <p>
                백조오브제 B2B는 단순한 상품 공급이 아니라 기관과 브랜드가 보호자에게 전하고 싶은 경험을
                검증된 상품, 케어 콘텐츠, 운영 방식으로 연결합니다.
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
            eyebrow="For partners"
            title="이런 파트너와 함께합니다."
            description={<p>공간과 고객, 운영 목적이 달라도 필요한 순간을 함께 정의한 뒤 가장 적합한 방식을 찾습니다.</p>}
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
            eyebrow="Partnership programs"
            title="필요에 맞는 협업 방식을 선택하세요."
            description={<p>상품 공급부터 케어키트, 입점과 공동 기획까지 목적에 필요한 범위만 조합할 수 있습니다.</p>}
          />

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
            eyebrow="How it works"
            title="문의부터 운영까지 차근차근 진행합니다."
            description={<p>아직 구성과 수량이 정해지지 않아도 괜찮습니다. 목적과 일정부터 함께 정리해 드립니다.</p>}
          />

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
        </div>
      </section>

      <section className="bg-[#202521] py-14 text-[#FBFAF7] lg:py-16">
        <div className="site-container-wide flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="font-editorial text-sm italic tracking-wide text-[#D8C4A3]">Start a partnership</p>
            <h2 className="mt-3 text-[26px] font-bold leading-[1.25] text-[#FBFAF7] sm:text-[32px]">필요한 순간과 목적을 들려주세요.</h2>
            <p className="mt-4 break-keep text-[16px] leading-[1.8] text-[#FBFAF7]/75 sm:text-[15px] sm:leading-[1.7]">담당자가 내용을 확인한 뒤 영업일 기준으로 순차 연락드립니다.</p>
          </div>
          <div className="grid w-full gap-3 sm:flex sm:w-auto">
            <EditorialActionLink href="/landing/care-kit#partner" variant="inverse">B2B 문의 남기기</EditorialActionLink>
            <EditorialActionLink href="/signup" variant="inverse-outline">파트너 회원가입</EditorialActionLink>
          </div>
        </div>
      </section>
    </div>
  );
}
