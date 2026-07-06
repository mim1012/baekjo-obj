import Link from 'next/link';
import { ArrowDown, Check, FileCheck2, ShieldCheck } from 'lucide-react';
import type { Brand } from '@/types';

const defaultProcess = [
  '브랜드 철학과 제품 방향성',
  '원료 선정 및 설계 기준',
  '생산 체계와 품질 관리 기준',
  '실제 운영 태도와 지속 가능성',
];

export default function BrandAuditReport({ brand }: { brand: Brand }) {
  const report = brand.auditReport;
  const process = report?.process ?? defaultProcess;

  return (
    <section
      aria-labelledby={`${brand.id}-audit-title`}
      className="relative mt-16 overflow-hidden rounded-[28px] bg-[#17211D] text-white shadow-[0_28px_80px_rgba(23,33,29,0.14)] sm:mt-20"
    >
      <div
        aria-hidden="true"
        className="absolute -right-28 -top-28 size-96 rounded-full border border-white/10"
      />
      <div
        aria-hidden="true"
        className="absolute -right-12 -top-12 size-64 rounded-full border border-white/10"
      />

      <div className="relative border-b border-white/10 px-6 py-8 sm:px-10 sm:py-10 lg:px-14">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-start">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 text-[11px] font-bold tracking-[0.24em] text-[#D9B77E] uppercase">
              <ShieldCheck className="size-4" />
              Baekjo Objet · The Audit
            </div>
            <h2
              id={`${brand.id}-audit-title`}
              className="mt-5 text-3xl font-bold tracking-[-0.035em] text-balance sm:text-4xl lg:text-[44px] lg:leading-[1.18]"
            >
              {report?.headline ?? brand.description}
            </h2>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
              판매 가능성보다 반려가족이 믿고 선택할 수 있는 기준을 먼저 확인했습니다.
            </p>
          </div>

          <div className="flex items-center gap-4 lg:justify-end">
            <div className="flex size-20 shrink-0 flex-col items-center justify-center rounded-full border border-[#D9B77E]/50 bg-[#D9B77E]/10 text-center shadow-[inset_0_0_0_5px_rgba(217,183,126,0.05)]">
              <span className="text-[9px] font-bold tracking-[0.18em] text-[#D9B77E] uppercase">Audit</span>
              <strong className="mt-0.5 text-2xl tracking-tight">{brand.auditGrade}</strong>
            </div>
            <div>
              <p className="text-xs text-white/45">Audit status</p>
              <p className="mt-1 text-sm font-semibold">{report?.status ?? 'Audit Completed'}</p>
            </div>
          </div>
        </div>

        {report && (
          <dl className="mt-8 grid overflow-hidden rounded-[14px] border border-white/10 bg-white/[0.04] sm:grid-cols-3">
            {[
              ['Audit Report No.', report.reportNo],
              ['Audit Date', report.auditedAt],
              ['Status', report.status],
            ].map(([label, value], index) => (
              <div
                key={label}
                className={`px-5 py-4 ${index > 0 ? 'border-t border-white/10 sm:border-l sm:border-t-0' : ''}`}
              >
                <dt className="text-[10px] font-bold tracking-[0.14em] text-white/35 uppercase">{label}</dt>
                <dd className="mt-1.5 text-sm font-semibold text-white/90">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <div className="relative grid gap-px bg-white/10 lg:grid-cols-2">
        <div className="bg-[#1B2722] px-6 py-9 sm:px-10 lg:px-14 lg:py-12">
          <p className="text-xs font-bold tracking-[0.18em] text-[#D9B77E] uppercase">The Audit Summary</p>
          <h3 className="mt-4 text-2xl font-bold tracking-tight">
            “{report?.summaryTitle ?? '제품보다 먼저 확인한 기준'}”
          </h3>
          <p className="mt-5 text-sm leading-7 text-white/65">
            {report?.summary
              ?? `${brand.name}의 제품 구성과 운영 방식이 백조오브제의 검토 기준에 부합하는지 확인했습니다.`}
          </p>
        </div>

        <div className="bg-[#1B2722] px-6 py-9 sm:px-10 lg:px-14 lg:py-12">
          <p className="text-xs font-bold tracking-[0.18em] text-[#D9B77E] uppercase">Selection Reason</p>
          <p className="mt-4 text-sm leading-7 text-white/65">
            {report?.selectionReason ?? brand.philosophy}
          </p>
        </div>
      </div>

      <div className="relative bg-[#F3EEE5] px-6 py-9 text-[#17211D] sm:px-10 lg:px-14 lg:py-11">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <div className="flex items-center gap-2">
              <FileCheck2 className="size-5 text-[#A8742E]" />
              <h3 className="text-base font-bold">The Audit Process</h3>
            </div>
            <ul className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              {process.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm leading-6 text-[#3E4944]">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#17211D] text-white">
                    <Check className="size-3" strokeWidth={2.5} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <Link
            href="#brand-products"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#17211D] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#2C3A34]"
          >
            검증 상품 보기
            <ArrowDown className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
