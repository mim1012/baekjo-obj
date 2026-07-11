import Link from 'next/link';
import { ArrowDown, Check, FileCheck2, Search, ShieldCheck } from 'lucide-react';
import type { Brand } from '@/types';

const reviewingTopics = [
  '브랜드 철학과 제품 방향',
  '원료·소재와 상세 정보',
  '제조와 유통 과정',
  '생활 속 사용성과 안내 방식',
];

export default function BrandAuditReport({ brand }: { brand: Brand }) {
  const report = brand.auditReport;

  if (!report) {
    return (
      <section
        aria-labelledby={`${brand.id}-reviewing-title`}
        className="mt-16 overflow-hidden rounded-3xl border border-[#E7E0D5] bg-[#FAF8F3] sm:mt-24"
      >
        <div className="grid gap-10 p-6 sm:p-10 lg:grid-cols-[0.42fr_0.58fr] lg:p-12">
          <div>
            <span className="flex size-12 items-center justify-center rounded-2xl bg-[#F3EEE6] text-[#A8742E]">
              <Search className="size-5" strokeWidth={1.5} aria-hidden="true" />
            </span>
            <p className="page-eyebrow mt-6">지금 확인하고 있어요</p>
            <h2
              id={`${brand.id}-reviewing-title`}
              className="mt-3 break-keep text-2xl font-bold leading-[1.25] tracking-tight text-[#17211D] sm:text-3xl"
            >
              브랜드 자료를 살펴보고 있어요.
            </h2>
            <p className="mt-5 break-keep text-sm leading-7 text-[#6F766F] sm:text-base sm:leading-8">
              {brand.name}이 무엇을 만들고 어떤 마음으로 이어가는지 차근차근 확인하는 중이에요. 확인을 마친 내용부터 솔직하게 안내할게요.
            </p>
          </div>

          <div className="rounded-2xl border border-[#E7E0D5] bg-white p-6 sm:p-8">
            <h3 className="text-sm font-bold tracking-tight text-[#17211D]">함께 살펴보는 내용</h3>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {reviewingTopics.map((topic) => (
                <li key={topic} className="flex items-start gap-3 break-keep text-sm leading-6 text-[#6F766F]">
                  <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#F3EEE6] text-[#A8742E]">
                    <Search className="size-3" strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  {topic}
                </li>
              ))}
            </ul>
            <p className="mt-6 border-t border-[#E7E0D5] pt-5 break-keep text-xs leading-5 text-[#8A7A64]">
              아직 확인 중인 내용은 완료된 것처럼 표시하지 않습니다.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-[#E7E0D5] bg-white px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-10 lg:px-12">
          <p className="break-keep text-sm leading-6 text-[#6F766F]">상품 정보도 준비되는 순서대로 차분히 채워가고 있어요.</p>
          <Link href="#brand-products" className="btn-secondary shrink-0">
            브랜드 상품 보기
            <ArrowDown className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    );
  }

  const statusLabel = /[가-힣]/.test(report.status) ? report.status : '확인 기록 공개';

  return (
    <section
      aria-labelledby={`${brand.id}-audit-title`}
      className="bg-noise relative mt-16 overflow-hidden rounded-3xl bg-[#202521] text-[#FBFAF7] shadow-[0_28px_80px_rgba(23,33,29,0.12)] sm:mt-24"
    >
      <div aria-hidden="true" className="absolute -right-24 -top-24 size-80 rounded-full border border-[#FBFAF7]/10" />
      <div className="relative z-10 border-b border-[#FBFAF7]/10 px-6 py-10 sm:px-10 sm:py-12 lg:px-16 lg:py-16">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#D8C4A3]">
            <ShieldCheck className="size-4" strokeWidth={1.5} aria-hidden="true" />
            백조가 살펴본 기록
          </div>
          <h2
            id={`${brand.id}-audit-title`}
            className="mt-5 max-w-3xl break-keep text-3xl font-bold leading-[1.2] tracking-tight text-[#FBFAF7] sm:text-4xl lg:text-5xl"
          >
            {report.headline}
          </h2>
          <p className="mt-5 max-w-2xl break-keep text-sm leading-7 text-[#FBFAF7]/70 sm:text-base sm:leading-8">
            브랜드가 무엇을 만들고 어떤 마음으로 이어가는지, 백조오브제가 차근차근 살펴본 내용을 담았어요.
          </p>
        </div>

        <dl className="mt-10 grid overflow-hidden rounded-2xl border border-[#FBFAF7]/10 bg-[#FBFAF7]/5 sm:grid-cols-3">
          {[
            ['확인 기록', report.reportNo],
            ['마지막 확인', report.auditedAt],
            ['현재 상태', statusLabel],
          ].map(([label, value], index) => (
            <div
              key={label}
              className={`px-5 py-5 ${index > 0 ? 'border-t border-[#FBFAF7]/10 sm:border-l sm:border-t-0' : ''}`}
            >
              <dt className="text-xs font-medium text-[#FBFAF7]/45">{label}</dt>
              <dd className="mt-2 break-keep text-sm font-semibold text-[#FBFAF7]/90">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="relative z-10 grid border-b border-[#FBFAF7]/10 lg:grid-cols-2 lg:divide-x lg:divide-[#FBFAF7]/10">
        <div className="px-6 py-10 sm:px-10 lg:px-16 lg:py-14">
          <p className="text-sm font-semibold text-[#D8C4A3]">살펴본 내용</p>
          <h3 className="mt-4 break-keep font-editorial text-2xl italic leading-[1.3] text-[#FBFAF7]">
            {report.summaryTitle}
          </h3>
          <p className="mt-5 break-keep text-sm leading-7 text-[#FBFAF7]/70 sm:text-[15px] sm:leading-8">
            {report.summary}
          </p>
        </div>

        <div className="border-t border-[#FBFAF7]/10 px-6 py-10 sm:px-10 lg:border-t-0 lg:px-16 lg:py-14">
          <p className="text-sm font-semibold text-[#D8C4A3]">소개하는 이유</p>
          <p className="mt-5 break-keep text-sm leading-7 text-[#FBFAF7]/70 sm:text-[15px] sm:leading-8">
            {report.selectionReason}
          </p>
        </div>
      </div>

      <div className="relative z-10 bg-[#FAF8F3] px-6 py-10 text-[#17211D] sm:px-10 lg:px-16 lg:py-14">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <div className="flex items-center gap-2">
              <FileCheck2 className="size-5 text-[#A8742E]" strokeWidth={1.5} aria-hidden="true" />
              <h3 className="text-base font-bold tracking-tight">함께 확인한 기준</h3>
            </div>
            <ul className="mt-7 grid gap-x-10 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              {report.process.map((item) => (
                <li key={item} className="flex items-start gap-3 break-keep text-sm leading-6 text-[#6F766F]">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#17211D] text-[#FBFAF7]">
                    <Check className="size-3" strokeWidth={2.5} aria-hidden="true" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <Link href="#brand-products" className="btn-primary shrink-0">
            추천 상품 보기
            <ArrowDown className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
