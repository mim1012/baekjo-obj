import Link from 'next/link';
import { AlertTriangle, ArrowRight, FileText, ShieldCheck } from 'lucide-react';
import InsuranceUploadPlate from '@/components/common/InsuranceUploadPlate';

export const metadata = {
  title: '보험분석',
  description: '지금 가입된 보험이 우리 아이에게 정말 유리할까요? 무료로 분석해드립니다.',
};

const strengths = [
  {
    icon: ShieldCheck,
    title: '집요한 분석',
    text: '보이지 않는 리스크까지 걸러내는 정밀한 시선',
  },
  {
    icon: FileText,
    title: '투명한 추천',
    text: '객관적 데이터가 보장하는 독립적 설계',
  },
  {
    icon: AlertTriangle,
    title: '데이터 증명',
    text: 'mock 약관 비교 데이터로 구현하는 조건 시뮬레이션',
  },
];

const steps = [
  ['신청 정보 입력', '기본 정보와 지금의 고민을 간단히 입력합니다.'],
  ['전문가 배정', '입력한 내용을 바탕으로 전담 분석가가 배정됩니다.'],
  ['맞춤 분석', '약관 분석과 전문가의 검토가 함께 이루어집니다.'],
  ['결과 리포트', '카카오톡 또는 이메일로 상세 결과를 보내드립니다.'],
];

export default function InsuranceIntroPage() {
  return (
    <div className="bg-[#FBFAF7]">
      <section className="bg-[#17211D] text-white">
        <div className="site-container grid gap-12 py-16 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:py-28">
          <div>
            <p className="font-editorial text-lg italic text-slate-400">Insurance, reviewed with care</p>
            <h1 className="mt-5 max-w-3xl text-balance text-4xl font-normal leading-tight sm:text-5xl tracking-tight">
              <span className="block sm:whitespace-nowrap">옆집 아이에게 유리한 보험이</span>
              <span className="block sm:whitespace-nowrap mt-2">우리 아이에게도 정답일까요?</span>
            </h1>
          </div>
          <div>
            <p className="text-pretty text-base leading-8 text-slate-300">
              매달 바뀌는 약관과 보장 조건을 분석하여 우리 아이에게 맞는 선택지를 안내합니다.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href="/insurance/apply"
                className="inline-flex items-center justify-center gap-2 bg-white px-6 py-4 text-sm font-semibold text-[#17211D] hover:bg-slate-100 rounded-full transition-all"
              >
                전문가 무료 분석 신청
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/insurance/recommend"
                className="inline-flex items-center justify-center gap-2 border border-slate-600 bg-transparent px-6 py-4 text-sm font-semibold text-white hover:bg-slate-800 rounded-full transition-all"
              >
                1분 실시간 추천받기
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-28 bg-white">
        <div className="site-container">
          <div className="max-w-2xl text-center mx-auto mb-16">
            <p className="font-editorial text-lg italic text-slate-400">Why Baekjo</p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-normal text-[#17211D] tracking-tight">판단에 필요한 기준만 투명하게.</h2>
            <p className="mt-4 text-sm leading-7 text-[#64748B]">
              객관적인 데이터와 사람의 세심한 검토를 함께 담습니다.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {strengths.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="flex flex-col min-h-72 rounded-[18px] border border-[rgba(15,23,42,0.08)] bg-[#FBFAF7] p-8 shadow-sm transition-transform hover:-translate-y-1">
                  <span className="flex size-14 items-center justify-center rounded-full bg-white shadow-sm border border-[rgba(15,23,42,0.04)] mb-8">
                    <Icon className="size-6 text-[#17211D]" strokeWidth={1.5} />
                  </span>
                  <h3 className="font-editorial text-2xl text-[#17211D] tracking-tight">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#64748B]">{item.text}</p>
                </article>
              );
            })}
          </div>

          <div className="mt-20">
            <InsuranceUploadPlate />
          </div>
        </div>
      </section>

      <section className="bg-[#FBFAF7] py-16 lg:py-28 border-t border-[rgba(15,23,42,0.06)]">
        <div className="site-container">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end mb-16">
            <div>
              <p className="font-editorial text-lg italic text-slate-400">The process</p>
              <h2 className="mt-3 text-3xl sm:text-4xl font-normal text-[#17211D] tracking-tight">분석은 이렇게 진행됩니다.</h2>
            </div>
            <p className="max-w-sm text-sm leading-7 text-[#64748B]">신청부터 결과까지 네 단계로 간결하게 진행합니다.</p>
          </div>

          <ol className="grid gap-6 md:grid-cols-4">
            {steps.map(([title, description], index) => (
              <li key={title} className="relative min-h-60 rounded-[18px] bg-white border border-[rgba(15,23,42,0.08)] p-8 shadow-sm">
                <span className="font-editorial text-4xl tabular-nums text-slate-200 block mb-8">0{index + 1}</span>
                <h3 className="font-semibold text-xl text-[#17211D] tracking-tight">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#64748B]">{description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-[rgba(15,23,42,0.06)] bg-white py-16 lg:py-28">
        <div className="site-container grid gap-8 md:grid-cols-[0.8fr_1.2fr] md:items-center">
          <h2 className="text-3xl sm:text-4xl font-normal text-[#17211D] tracking-tight text-balance">분석은 무료로 진행됩니다.</h2>
          <div className="border-l-2 border-slate-200 pl-8">
            <p className="text-base leading-8 text-[#334155]">
              저희는 보험 가입을 강요하지 않습니다. 분석 결과 현재 가입하신 보험이 가장 훌륭하다면
              유지하시는 것이 최선이라고 안내합니다.
            </p>
            <p className="mt-4 text-xs text-slate-400 font-medium">실제 보험사 API가 아닌 mock 비교 구조로 제공됩니다.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
