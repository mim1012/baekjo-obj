import Link from 'next/link';
import { ArrowRight, FileSearch, HeartHandshake, ShieldCheck } from 'lucide-react';
import { SectionHeading } from '@/components/common/EditorialHeading';
import InsuranceUploadPlate from '@/components/common/InsuranceUploadPlate';
import ScrollReveal from '@/components/common/ScrollReveal';

export const metadata = {
  title: '보험 분석',
  description: '우리 아이의 현재 보장과 놓치기 쉬운 조건을 함께 살펴보는 백조오브제 보험 분석 안내입니다.',
};

const reviewPrinciples = [
  {
    icon: FileSearch,
    title: '놓치기 쉬운 조건까지',
    text: '보장 금액뿐 아니라 자기부담금과 보장에서 빠지는 조건도 함께 살펴봐요.',
  },
  {
    icon: ShieldCheck,
    title: '안내한 이유를 분명하게',
    text: '무엇을 기준으로 확인했는지, 어려운 표현을 덜어내고 이해하기 쉽게 정리해 드려요.',
  },
  {
    icon: HeartHandshake,
    title: '지금 보험이 괜찮다면 그대로',
    text: '바꿀 이유가 없다면 현재 보험을 유지하는 편이 낫다고 솔직하게 말씀드려요.',
  },
];

const reviewSteps = [
  {
    title: '아이 정보 남기기',
    description: '기본 정보와 지금 궁금한 점을 편하게 적어 주세요.',
  },
  {
    title: '확인할 내용 정리하기',
    description: '현재 보장과 관심 조건을 바탕으로 살펴볼 항목을 정리해요.',
  },
  {
    title: '보장 조건 살펴보기',
    description: '보장 범위와 자기부담금, 제외 조건을 차근차근 확인해요.',
  },
  {
    title: '결과 안내받기',
    description: '정리된 내용을 입력한 연락처로 안내해 드려요.',
  },
];

const firstChecks = ['현재 보장 범위', '자기부담금과 한도', '보장에서 빠지는 조건'];

export default function InsuranceIntroPage() {
  return (
    <div className="page-canvas">
      <section className="relative overflow-hidden bg-[#202521] bg-noise text-[#FBFAF7]">
        <div className="absolute -right-24 top-16 size-72 rounded-full bg-[#A8742E]/10 blur-3xl sm:size-96" aria-hidden="true" />
        <div className="site-container-hero relative z-10 grid min-h-[560px] gap-12 py-20 lg:min-h-[640px] lg:grid-cols-[0.62fr_0.38fr] lg:items-end lg:py-24">
          <div className="self-end">
            <p className="font-editorial text-sm italic tracking-wide text-[#D8C4A3] sm:text-base">
              보험도 같은 마음으로
            </p>
            <h1 className="mt-4 max-w-3xl break-keep text-4xl font-bold leading-[1.15] tracking-[-0.045em] text-[#FBFAF7] sm:text-5xl lg:text-6xl">
              우리 아이에게 필요한 보장,
              <br className="hidden sm:block" /> 함께 차근차근 살펴봐요.
            </h1>
            <p className="mt-6 max-w-2xl break-keep text-sm leading-7 text-[#FBFAF7]/75 sm:text-base sm:leading-8">
              나이와 건강 고민, 지금 가진 보장을 함께 살펴 놓치기 쉬운 조건을 이해하기 쉽게 정리해 드려요.
              바꾸는 것보다 유지하는 편이 낫다면 그 이유도 솔직하게 알려드릴게요.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/insurance/apply" className="btn-primary w-full bg-[#FBFAF7] text-[#17211D] hover:bg-white sm:w-auto">
                보험 분석 신청하기
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href="/insurance/recommend"
                className="btn-secondary w-full border-[#FBFAF7]/30 text-[#FBFAF7] hover:border-[#FBFAF7]/55 hover:bg-[#FBFAF7]/10 sm:w-auto"
              >
                간단히 조건 살펴보기
              </Link>
            </div>
          </div>

          <aside className="rounded-3xl border border-[#FBFAF7]/15 bg-[#FBFAF7]/[0.06] p-6 backdrop-blur-sm sm:p-8" aria-label="보험 분석에서 먼저 확인하는 항목">
            <p className="text-xs font-semibold tracking-[0.18em] text-[#D8C4A3]">먼저 확인해요</p>
            <ul className="mt-6 divide-y divide-[#FBFAF7]/10">
              {firstChecks.map((item, index) => (
                <li key={item} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                  <span className="font-editorial text-sm text-[#D8C4A3]">0{index + 1}</span>
                  <span className="break-keep text-sm font-semibold text-[#FBFAF7]/90 sm:text-base">{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 break-keep border-t border-[#FBFAF7]/10 pt-5 text-xs leading-6 text-[#FBFAF7]/55">
              분석 신청만으로 보험 가입 의무가 생기지 않아요.
            </p>
          </aside>
        </div>
      </section>

      <section className="page-section bg-noise">
        <ScrollReveal className="site-container-wide relative z-10">
          <SectionHeading
            eyebrow="백조오브제가 살펴보는 방식"
            title="어려운 보험 조건을, 이해하기 쉽게."
            description="많이 보장된다는 말보다 우리 아이에게 어떤 조건이 필요한지, 지금 가진 보험에서 무엇을 먼저 확인하면 좋을지 차분히 짚어드려요."
          />

          <div className="mt-10 grid gap-5 md:grid-cols-3 lg:gap-6">
            {reviewPrinciples.map(({ icon: Icon, title, text }) => (
              <article key={title} className="premium-card flex min-h-64 flex-col p-6 sm:p-8">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-[#F3EEE6] text-[#A8742E]">
                  <Icon className="size-5" strokeWidth={1.5} aria-hidden="true" />
                </span>
                <h3 className="mt-8 break-keep text-xl font-bold leading-7 tracking-tight text-[#17211D]">{title}</h3>
                <p className="mt-3 break-keep text-sm leading-7 text-[#6F766F]">{text}</p>
              </article>
            ))}
          </div>
        </ScrollReveal>
      </section>

      <section className="page-section-muted border-y border-[#E7E0D5] bg-noise">
        <ScrollReveal className="site-container-wide relative z-10">
          <div className="grid gap-10 lg:grid-cols-[0.4fr_0.6fr] lg:items-start lg:gap-12">
            <SectionHeading
              eyebrow="가입한 보험이 있다면"
              title="증권을 보며 궁금한 점부터 정리해 보세요."
              description="보험 증권 파일을 고르면 파일 이름과 형식을 먼저 확인할 수 있어요. 현재 화면에서는 파일이 전송되지 않으며, 실제 분석 신청은 상담 정보 작성으로 이어집니다."
            />
            <InsuranceUploadPlate />
          </div>
        </ScrollReveal>
      </section>

      <section className="page-section bg-noise">
        <ScrollReveal className="site-container-wide relative z-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeading
              eyebrow="신청 후 과정"
              title="신청 후에는 이렇게 이어져요."
              description="복잡한 준비 없이 필요한 내용을 남겨 주세요. 확인한 내용은 네 단계로 차분히 정리해 안내합니다."
            />
            <Link href="/insurance/apply" className="btn-secondary self-start lg:self-auto">
              분석 신청하기
              <ArrowRight className="size-4 text-[#A8742E]" aria-hidden="true" />
            </Link>
          </div>

          <ol className="mt-10 grid overflow-hidden rounded-3xl border border-[#E7E0D5] bg-white md:grid-cols-4">
            {reviewSteps.map((step, index) => (
              <li
                key={step.title}
                className="flex min-h-56 flex-col border-b border-[#E7E0D5] p-6 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0 sm:p-8"
              >
                <span className="font-editorial text-2xl text-[#A8742E]">0{index + 1}</span>
                <h3 className="mt-8 break-keep text-lg font-bold tracking-tight text-[#17211D]">{step.title}</h3>
                <p className="mt-3 break-keep text-sm leading-7 text-[#6F766F]">{step.description}</p>
              </li>
            ))}
          </ol>
        </ScrollReveal>
      </section>

      <section className="border-t border-[#E7E0D5] bg-white py-16 lg:py-24">
        <ScrollReveal className="site-container-wide">
          <div className="grid gap-10 rounded-3xl bg-[#FAF8F3] p-6 sm:p-10 lg:grid-cols-[0.62fr_0.38fr] lg:items-end lg:p-12">
            <SectionHeading
              eyebrow="부담 없이 먼저 확인하세요"
              title="지금 보험이 괜찮다면, 그대로."
              description="보험을 새로 고르는 것보다 중요한 건 지금 보장이 우리 아이에게 잘 맞는지 아는 일이에요. 바꿀 필요가 없다면 현재 보험을 유지하는 편이 낫다고 안내해 드립니다."
            />
            <div>
              <p className="break-keep text-xs leading-6 text-[#6F766F]">
                현재 페이지의 비교 예시는 서비스 흐름을 보여 주기 위한 안내용 정보입니다. 실제 보장 조건과 가입
                가능 여부는 각 보험사의 약관과 심사 결과에 따라 달라질 수 있어요.
              </p>
              <Link href="/insurance/apply" className="btn-primary mt-6 w-full sm:w-auto lg:w-full">
                우리 아이 보험 살펴보기
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </section>
    </div>
  );
}
