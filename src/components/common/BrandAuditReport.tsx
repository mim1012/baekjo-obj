import { Check, FileCheck2 } from 'lucide-react';
import type { Brand } from '@/types';
import { formatBrandDisplayName } from '@/lib/brands/presentation';

export default function BrandAuditReport({ brand }: { brand: Brand }) {
  const report = brand.auditReport;
  const fullBrandName = formatBrandDisplayName(brand.name);

  if (!report) return null;

  const checkpoints = report.checkpoints?.length ? report.checkpoints : brand.auditPoints;
  const auditMeta = [
    ['확인 기록', report.reportNo],
    ...(report.auditedAt ? [['마지막 확인', report.auditedAt]] : []),
    ['현재 상태', report.status],
  ];

  return (
    <section
      aria-labelledby={`${brand.id}-audit-title`}
      className="bg-noise relative mt-16 overflow-hidden rounded-3xl bg-[#202521] text-[#FBFAF7] shadow-[0_28px_80px_rgba(23,33,29,0.12)] sm:mt-24"
    >
      <div aria-hidden="true" className="absolute -right-24 -top-24 size-80 rounded-full border border-[#FBFAF7]/10" />
      <div className="relative z-10 border-b border-[#FBFAF7]/10 px-6 py-10 sm:px-10 sm:py-12 lg:px-16 lg:py-16">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-[#D8C4A3]">{fullBrandName} | 백조오브제 AUDIT</p>
          <h2
            id={`${brand.id}-audit-title`}
            className="mt-5 max-w-3xl text-balance break-keep text-3xl font-bold leading-[1.2] tracking-tight text-[#FBFAF7] sm:text-4xl lg:text-5xl"
          >
            {report.headline}
          </h2>
        </div>

        <dl className={`mt-10 grid overflow-hidden rounded-2xl border border-[#FBFAF7]/10 bg-[#FBFAF7]/5 ${auditMeta.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
          {auditMeta.map(([label, value], index) => (
            <div
              key={label}
              className={`px-5 py-5 ${index > 0 ? 'border-t border-[#FBFAF7]/10 sm:border-l sm:border-t-0' : ''}`}
            >
              <dt className="text-xs font-medium text-[#FBFAF7]/70">{label}</dt>
              <dd className="mt-2 break-keep text-sm font-semibold text-[#FBFAF7]/90">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="relative z-10 grid border-b border-[#FBFAF7]/10 lg:grid-cols-2 lg:divide-x lg:divide-[#FBFAF7]/10">
        <div className="px-6 py-10 sm:px-10 lg:px-16 lg:py-14">
          <h3 className="text-base font-semibold text-[#D8C4A3]">The Audit Checkpoints</h3>
          <ul className="mt-6 grid gap-4">
            {checkpoints.map((item) => (
              <li key={item} className="flex items-start gap-3 text-pretty break-keep text-sm leading-7 text-[#FBFAF7]/70 sm:text-[15px]">
                <Check className="mt-1 size-4 shrink-0 text-[#D8C4A3]" strokeWidth={2} aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-[#FBFAF7]/10 px-6 py-10 sm:px-10 lg:border-t-0 lg:px-16 lg:py-14">
          <h3 className="text-base font-semibold text-[#D8C4A3]">Selection Reason</h3>
          <p className="mt-5 whitespace-pre-line text-pretty break-keep text-sm leading-7 text-[#FBFAF7]/70 sm:text-[15px] sm:leading-8">
            {report.selectionReason}
          </p>
        </div>
      </div>

      <div className="relative z-10 bg-[#FAF8F3] px-6 py-10 text-[#17211D] sm:px-10 lg:px-16 lg:py-14">
        <div>
          <div className="max-w-4xl">
            <div className="flex items-center gap-2">
              <FileCheck2 className="size-5 text-[#A8742E]" strokeWidth={1.5} aria-hidden="true" />
              <h3 className="text-base font-bold tracking-tight">The Audit Process</h3>
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

        </div>

        {Boolean(report.materialReview?.length) && (
          <div className="mt-10 border-t border-[#E7E0D5] pt-10">
            <h3 className="text-base font-bold tracking-tight text-[#17211D]">Material & Quality Review</h3>
            <div className="mt-5 max-w-4xl space-y-4">
              {report.materialReview!.map((paragraph, index) => (
                <p key={index} className="break-keep text-sm leading-7 text-[#6F766F]">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        )}

        {Boolean(report.curatorNote?.length) && (
          <div className="mt-10 border-t border-[#E7E0D5] pt-10">
            <h3 className="text-base font-bold tracking-tight text-[#17211D]">Curator&apos;s Note</h3>
            <div className="mt-5 max-w-4xl space-y-4">
              {report.curatorNote!.map((paragraph, index) => (
                <p key={index} className="break-keep text-sm leading-7 text-[#6F766F]">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        )}

        {Boolean(report.auditConclusion?.length) && (
          <div className="mt-10 border-t border-[#E7E0D5] pt-10">
            <h3 className="text-base font-bold tracking-tight text-[#17211D]">Audit Conclusion</h3>
            <div className="mt-5 max-w-4xl space-y-4">
              {report.auditConclusion!.map((paragraph, index) => (
                <p key={index} className="break-keep text-sm leading-7 text-[#6F766F]">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
