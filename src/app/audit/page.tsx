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

export const metadata = {
  title: '백조오브제 Audit 검증 기준 | 백조오브제',
  description: '브랜드 운영 방향부터 성분·원료, 제조·유통, 보호자의 사용 가치까지 백조오브제가 확인하는 기준을 안내합니다.',
};

const auditPillars = [
  {
    icon: Building2,
    number: '01',
    title: '브랜드 운영 방향',
    description: '무엇을 만들고 왜 운영하는지, 상품 정보와 고객 안내를 일관되게 공개하는지 살펴봅니다.',
    checks: ['브랜드 철학과 운영 이력', '정보 공개의 구체성', '고객 응대와 사후 안내'],
  },
  {
    icon: Leaf,
    number: '02',
    title: '성분·원료 정보',
    description: '아이에게 직접 닿거나 먹이는 정보가 충분히 공개되어 있는지, 주의할 내용이 빠지지 않았는지 확인합니다.',
    checks: ['원재료·소재 표시', '알레르기·주의 정보', '급여 및 사용 기준'],
  },
  {
    icon: Truck,
    number: '03',
    title: '제조·유통 기준',
    description: '제조와 보관, 배송 과정에 관한 자료를 확인하고 상품 상태를 안정적으로 유지할 수 있는지 검토합니다.',
    checks: ['제조·생산 정보', '보관과 유통 조건', '품질 이슈 대응 기준'],
  },
  {
    icon: Heart,
    number: '04',
    title: '보호자 사용 가치',
    description: '실제 반려생활에서 이해하고 선택하기 쉬운지, 사용 경험과 상품의 쓰임이 안내 내용과 맞는지 살펴봅니다.',
    checks: ['사용 목적의 명확성', '보호자 경험과 피드백', '가격·용량·사용성의 균형'],
  },
];

const auditSteps = [
  {
    title: '자료를 모읍니다',
    description: '브랜드가 제공한 상품 자료와 공개 정보, 제조·유통 및 사용 안내를 한곳에 모읍니다.',
  },
  {
    title: '기준별로 살펴봅니다',
    description: '운영 방향, 성분·원료, 제조·유통, 보호자 사용 가치의 네 가지 축으로 빠짐없이 검토합니다.',
  },
  {
    title: '확인 결과를 정리합니다',
    description: '확인한 근거와 아직 확인이 필요한 내용을 구분해 브랜드와 상품 화면에 이해하기 쉽게 표시합니다.',
  },
  {
    title: '새 정보로 갱신합니다',
    description: '성분이나 제조 조건, 상품 안내가 바뀌면 자료를 다시 확인하고 공개된 내용을 업데이트합니다.',
  },
];

const statusItems = [
  {
    icon: ShieldCheck,
    label: 'Audit 확인 완료',
    description: '현재 확보한 자료를 네 가지 기준으로 검토해 안내할 수 있는 상태입니다.',
  },
  {
    icon: ClipboardCheck,
    label: '자료 확인 중',
    description: '상품 정보는 공개되어 있지만 일부 확인 자료를 추가로 살펴보고 있는 상태입니다.',
  },
  {
    icon: RefreshCw,
    label: '업데이트 예정',
    description: '새로운 정보나 변경 사항이 확인되어 검증 안내를 다시 정리하고 있는 상태입니다.',
  },
];

export default function AuditPage() {
  return (
    <div className="page-canvas">
      <section className="bg-noise border-b border-[#E7E0D5] bg-[#F7F4ED] py-12 md:py-14 lg:py-16">
        <div className="site-container-wide grid items-center gap-8 md:gap-10 lg:grid-cols-12 lg:gap-16">
          <PageIntro
            className="lg:col-span-6"
            eyebrow="Baekjo Audit Standard"
            title={<>선택보다 먼저,<br />확인의 기준을 공개합니다.</>}
            description={
              <p>
                백조오브제는 많이 소개하는 것보다 왜 선택했는지 설명할 수 있는 것을 중요하게 생각합니다.
                브랜드 운영 방향부터 보호자의 실제 사용 가치까지, 네 가지 기준으로 차분히 확인합니다.
              </p>
            }
            action={
              <div className="grid w-full gap-3 sm:flex">
                <EditorialActionLink href="#pillars">검증 기준 살펴보기</EditorialActionLink>
                <EditorialActionLink href="/brands" variant="secondary">검증 브랜드 보기</EditorialActionLink>
              </div>
            }
          />

          <div className="relative h-[300px] overflow-hidden rounded-[24px] border border-[#E7E0D5] bg-white sm:h-[360px] lg:col-span-6 lg:h-[410px]">
            <Image
              src="/images/brand-curation-hero.webp"
              alt="반려생활 상품 자료를 살펴보는 백조오브제 Audit"
              fill
              priority
              sizes="(max-width: 1023px) 100vw, 50vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#17211D]/80 via-[#17211D]/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 text-[#FBFAF7] sm:p-8">
              <p className="font-editorial text-sm italic tracking-wide text-[#D8C4A3]">100 to 5</p>
              <p className="mt-2 max-w-md text-[20px] font-bold leading-[1.35] text-[#FBFAF7] sm:text-[24px]">
                모든 상품을 소개하지 않습니다. 확인한 선택만 남깁니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="pillars" className="page-section scroll-mt-24">
        <div className="site-container-wide">
          <SectionHeading
            eyebrow="Four standards"
            title="백조오브제가 살펴보는 네 가지 기준"
            description={<p>한 가지 장점만으로 판단하지 않고, 브랜드와 상품이 반려생활에 들어오는 전 과정을 함께 봅니다.</p>}
          />

          <div
            className="hide-scrollbar -mx-5 mt-8 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-4 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0 xl:grid-cols-4 xl:gap-5"
            role="region"
            aria-label="백조오브제 Audit 네 가지 기준"
          >
            {auditPillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <article key={pillar.number} className="group flex min-h-[360px] w-[82vw] max-w-[352px] shrink-0 snap-start flex-col rounded-[20px] border border-[#E7E0D5] bg-white p-5 transition-all duration-700 ease-out hover:-translate-y-1 hover:border-[#D8C4A3] hover:shadow-[0_20px_40px_-15px_rgba(23,33,29,0.08)] md:min-h-0 md:w-auto md:max-w-none md:p-6">
                  <div className="flex items-start justify-between">
                    <EditorialIconBadge icon={Icon} />
                    <span className="font-editorial text-lg italic text-[#A8742E]">{pillar.number}</span>
                  </div>
                  <h2 className="mt-5 text-[18px] font-bold tracking-tight text-[#17211D]">{pillar.title}</h2>
                  <p className="mt-3 break-keep text-[15px] leading-[1.8] text-[#6F766F] md:text-[14px] md:leading-[1.7]">{pillar.description}</p>
                  <ul className="mt-5 space-y-2.5 border-t border-[#E7E0D5] pt-4">
                    {pillar.checks.map((check) => (
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
      </section>

      <section className="page-section-muted border-y border-[#E7E0D5]">
        <div className="site-container-wide grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <SectionHeading
            eyebrow="Audit process"
            title="확인하고, 기록하고, 다시 갱신합니다."
            description={<p>한 번의 선정으로 끝내지 않습니다. 정보가 바뀌면 다시 확인할 수 있도록 검토 과정을 운영합니다.</p>}
          />

          <ol
            className="hide-scrollbar -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-4 md:mx-0 md:block md:border-t md:border-[#D8C4A3] md:px-0 md:pb-0"
            aria-label="백조오브제 Audit 검토 과정"
          >
            {auditSteps.map((step, index) => (
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
      </section>

      <section className="page-section">
        <div className="site-container-wide">
          <SectionHeading
            eyebrow="How to read"
            title="화면에서는 이렇게 안내합니다."
            description={<p>확인 완료와 확인 중을 같은 의미로 표시하지 않습니다. 현재 상태를 구분해 선택에 필요한 맥락을 전합니다.</p>}
          />

          <div className="mt-8 grid gap-4 md:grid-cols-3 md:gap-5">
            {statusItems.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.label} className="rounded-[20px] border border-[#E7E0D5] bg-[#FAF8F3] p-5 md:p-6">
                  <EditorialIconBadge icon={Icon} />
                  <h3 className="mt-5 text-[18px] font-bold text-[#17211D]">{item.label}</h3>
                  <p className="mt-3 break-keep text-[15px] leading-[1.8] text-[#6F766F] md:text-[14px] md:leading-[1.7]">{item.description}</p>
                </article>
              );
            })}
          </div>

          <aside className="mt-6 rounded-[20px] border border-[#E7E0D5] bg-white p-5 sm:p-6" aria-label="백조오브제 Audit 안내">
            <p className="break-keep text-[15px] leading-[1.8] text-[#6F766F] md:text-[14px] md:leading-[1.7]">
              백조오브제 Audit은 브랜드가 제공한 자료와 공개 정보를 바탕으로 한 큐레이션 기준입니다.
              수의학적 진단, 법정 인증 또는 개별 반려동물에 대한 의료 판단을 대신하지 않습니다.
              질환이나 알레르기가 있다면 구매 전 수의사와 상담해 주세요.
            </p>
          </aside>
        </div>
      </section>

      <section className="bg-[#202521] py-14 text-[#FBFAF7] lg:py-16">
        <div className="site-container-wide flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="font-editorial text-sm italic tracking-wide text-[#D8C4A3]">Continue exploring</p>
            <h2 className="mt-3 text-[26px] font-bold leading-[1.25] text-[#FBFAF7] sm:text-[32px]">기준을 확인했다면, 선택을 이어가세요.</h2>
            <p className="mt-4 break-keep text-[16px] leading-[1.8] text-[#FBFAF7]/75 sm:text-[15px] sm:leading-[1.7]">브랜드 이야기와 상품 상세에서 확인한 기준과 공개된 정보를 함께 살펴볼 수 있습니다.</p>
          </div>
          <div className="grid w-full gap-3 sm:flex sm:w-auto">
            <EditorialActionLink href="/brands" variant="inverse">검증 브랜드 보기</EditorialActionLink>
            <EditorialActionLink href="/shop" variant="inverse-outline">셀렉션 보기</EditorialActionLink>
          </div>
        </div>
      </section>
    </div>
  );
}
