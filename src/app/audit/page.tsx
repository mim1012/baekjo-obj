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
  title: '백조오브제 Audit의 검토 기준',
  description: '브랜드 철학과 제품의 특성, 실제 운영과 확인 기록까지 백조오브제가 살펴보는 기준을 안내합니다.',
};

const auditPillars = [
  {
    icon: Building2,
    number: '01',
    title: '브랜드 철학',
    description: '브랜드가 중요하게 생각하는 가치와 제품에 담긴 방향을 살펴봅니다.',
    checks: ['브랜드가 지향하는 가치', '제품에 담긴 생각과 방향', '반려동물을 대하는 태도'],
  },
  {
    icon: Leaf,
    number: '02',
    title: '제품과 안전',
    description: '제품이 어떤 목적으로 만들어졌는지 살펴보고, 제품과 안전에 대해 확인할 수 있는 정보를 검토합니다.',
    checks: ['제품의 목적과 사용 방식', '소재·원료 등 제품 정보', '안전과 관련해 확인 가능한 자료'],
  },
  {
    icon: Truck,
    number: '03',
    title: '일관성과 운영',
    description: '브랜드가 중요하게 말하는 가치가 제품과 실제 운영에서도 이어지는지 살펴봅니다.',
    checks: ['브랜드가 말하는 가치와 제품의 연결', '제품 정보와 실제 안내의 일관성', '고객에게 전달되는 운영 과정'],
  },
  {
    icon: Heart,
    number: '04',
    title: '확인과 기록',
    description: '브랜드마다 중요하게 살펴봐야 할 내용을 확인하고, 확인한 범위 안에서 기록합니다.',
    checks: ['브랜드별로 중요하게 살펴본 내용', '검토에 참고한 자료와 이야기', '함께 알아둘 점'],
  },
];

const auditSteps = [
  {
    title: '처음의 확인',
    description: '브랜드와 제품을 이해하고, 확인한 내용을 Audit에 담습니다.',
  },
  {
    title: '새로운 내용',
    description: '이후 새롭게 알게 된 자료와 변화도 다시 살펴봅니다.',
  },
  {
    title: '기록의 보완',
    description: '추가로 확인한 내용이 있다면 기존 Audit에 필요한 내용을 더합니다.',
  },
  {
    title: '이어지는 Audit',
    description: '완료된 기록에 머무르지 않고, 새롭게 확인되는 변화와 내용을 계속 기록합니다.',
  },
];

const statusItems = [
  {
    icon: ShieldCheck,
    label: 'Audit 확인 완료',
    description: '현재 확인된 내용을 바탕으로 Audit이 완료된 상태입니다.',
  },
  {
    icon: ClipboardCheck,
    label: '추가 확인 중',
    description: 'Audit 완료 이후 새롭게 확인할 내용이나 자료를 추가로 살펴보고 있는 상태입니다.',
  },
  {
    icon: RefreshCw,
    label: '업데이트 예정',
    description: '추가로 확인된 내용이나 변경 사항을 Audit 기록에 반영할 예정입니다.',
  },
];

export default function AuditPage() {
  return (
    <div className="page-canvas">
      <section className="bg-noise border-b border-[#E7E0D5] bg-[#F7F4ED] py-12 md:py-14 lg:py-16">
        <div className="site-container-wide grid items-center gap-8 md:gap-10 lg:grid-cols-12 lg:gap-16">
          <PageIntro
            className="lg:col-span-6"
            eyebrow="BAEKJO OBJET AUDIT STANDARD"
            title={<>선택보다 먼저,<br />확인하는 기준이 있습니다.</>}
            description={
              <p>
                백조오브제는 많이 소개하는 것보다 왜 선택했는지 설명할 수 있는 것을 중요하게 생각합니다.
                브랜드의 철학과 제품의 특성, 실제 사용에서 확인되는 부분까지 각 브랜드와 제품에 맞춰 살펴봅니다.
              </p>
            }
            action={
              <EditorialActionLink href="/brands" variant="secondary">브랜드 둘러보기</EditorialActionLink>
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
              <p className="mt-2 max-w-md text-[20px] font-bold leading-[1.35] text-[#FBFAF7] sm:text-[24px]">
                모든 브랜드를 소개하지 않습니다. 확인하고 선택한 브랜드만 소개합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="pillars" className="page-section scroll-mt-24">
        <div className="site-container-wide">
          <SectionHeading
            eyebrow="FOUR STANDARDS"
            title="백조오브제가 살펴보는 네 가지 기준"
            description={<p>한 가지 장점만으로 판단하지 않고, 브랜드와 상품이 반려생활에 들어오는 전 과정을 함께 봅니다.</p>}
          />

          <div className="mt-10 max-w-3xl">
            <p className="font-editorial text-sm italic tracking-wide text-[#A8742E]">AUDIT CHECKPOINTS</p>
            <h2 className="mt-3 text-[24px] font-bold tracking-tight text-[#17211D] sm:text-[30px]">브랜드를 바라보는 기준</h2>
            <p className="mt-3 break-keep text-[15px] leading-[1.8] text-[#6F766F]">
              브랜드마다 제품과 이야기가 다른 만큼 확인하는 내용도 달라집니다. 브랜드의 특성에 맞춰 필요한 자료와 내용을 함께 검토합니다.
            </p>
          </div>

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
            eyebrow="AUDIT PROCESS"
            title="Audit은 완료된 뒤에도 이어집니다"
            description={<p>새롭게 확인되는 내용과 변화가 있다면 다시 살펴보고, 필요한 내용을 더해 기록을 보완합니다.</p>}
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
            eyebrow="HOW TO READ"
            title="화면에서는 이렇게 표시됩니다."
            description={<p>Audit 완료 후 추가 확인이나 업데이트가 필요한 경우, 상태를 구분해 표시합니다.</p>}
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

          <p className="mt-5 break-keep text-[14px] leading-[1.8] text-[#59615B]">
            ※ 추가 확인 중 및 업데이트 예정은 Audit 완료 이후의 추가 확인·보완 상태를 의미하며, 입점 및 제품 판매는 기존과 동일하게 유지됩니다.
          </p>

          <aside className="mt-6 rounded-[20px] border border-[#E7E0D5] bg-white p-5 sm:p-6" aria-label="백조오브제 Audit 안내">
            <p className="break-keep text-[15px] leading-[1.8] text-[#6F766F] md:text-[14px] md:leading-[1.7]">
              백조오브제 Audit은 브랜드가 제공한 자료와 공개 정보를 바탕으로 한 큐레이션 기준입니다.
              수의학적 진단, 법정 인증 또는 개별 반려동물에 대한 의료 판단을 대신하지 않습니다.
              질환이나 알레르기가 있다면 구매 전 수의사와 상담해 주세요.
            </p>
          </aside>

          <p className="mt-5 break-keep text-[15px] leading-[1.8] text-[#59615B] md:text-[14px] md:leading-[1.7]">
            백조오브제 Audit은 브랜드와 제품에 대해 확인할 수 있는 자료와 내용을 바탕으로 진행하는 백조오브제의 자체 검토 시스템입니다. 법적 인증기관의 인증이나 개별 반려동물에 대한 의료적 판단을 의미하지 않습니다.
          </p>
        </div>
      </section>

      <section className="bg-[#202521] py-14 text-[#FBFAF7] lg:py-16">
        <div className="site-container-wide flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="font-editorial text-sm italic tracking-wide text-[#D8C4A3]">Continue exploring</p>
            <h2 className="mt-3 text-[26px] font-bold leading-[1.25] text-[#FBFAF7] sm:text-[32px]">확인한 기준은 선택으로 이어집니다.</h2>
          </div>
          <div className="grid w-full gap-3 sm:flex sm:w-auto">
            <EditorialActionLink href="/brands" variant="inverse">브랜드 보기</EditorialActionLink>
            <EditorialActionLink href="/shop" variant="inverse-outline">셀렉션 보기</EditorialActionLink>
          </div>
        </div>
      </section>
    </div>
  );
}
