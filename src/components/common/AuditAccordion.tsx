'use client';

import { useId, useState } from 'react';
import { Minus, Plus } from 'lucide-react';

interface AuditAccordionProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  statusLabel?: string;
  theme?: 'dark' | 'light';
  density?: 'default' | 'compact';
}

export default function AuditAccordion({
  children,
  title,
  subtitle,
  statusLabel,
  theme = 'dark',
  density = 'default',
}: AuditAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const contentId = useId();

  const isDark = theme === 'dark';
  const isCompact = density === 'compact';
  const containerClass = isDark
    ? 'mx-auto max-w-4xl overflow-hidden rounded-3xl bg-[#202521] text-[#FBFAF7]'
    : 'w-full overflow-hidden text-[#17251F]';
  const headerClass = isDark
    ? 'p-6 sm:p-10 md:hidden'
    : isCompact
      ? 'p-5 md:hidden'
      : 'p-6 md:hidden';
  const titleClass = isDark
    ? 'mt-2 text-xl font-bold tracking-tight text-[#FBFAF7]'
    : isCompact
      ? 'text-[18px] font-bold leading-[1.3] tracking-tight text-[#17251F]'
      : 'text-[20px] font-bold leading-[1.3] tracking-tight text-[#17251F]';
  const subtitleClass = isDark
    ? 'font-editorial text-sm italic tracking-wide text-[#D8C4A3]'
    : isCompact
      ? 'mb-2 text-[10px] font-bold uppercase tracking-wide text-[#6F756F]'
      : 'mb-3 text-[11px] font-bold uppercase tracking-wide text-[#6F756F]';
  const iconContainerClass = isDark
    ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FBFAF7]/10 text-[#FBFAF7]'
    : 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F8F6F0] text-[#17251F]';
  const contentClass = isDark
    ? `px-6 pb-8 sm:px-10 md:block md:p-10 ${isExpanded ? 'block' : 'hidden'}`
    : isCompact
      ? `px-5 pb-5 md:block md:p-6 lg:p-8 ${isExpanded ? 'block' : 'hidden'}`
      : `px-6 pb-6 md:block md:p-8 lg:p-10 ${isExpanded ? 'block' : 'hidden'}`;

  return (
    <div className={containerClass}>
      <div className={headerClass}>
        <button
          type="button"
          aria-expanded={isExpanded}
          aria-controls={contentId}
          onClick={() => setIsExpanded((current) => !current)}
          className="flex w-full items-center justify-between gap-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A8742E] focus-visible:ring-offset-2"
        >
          <div className="min-w-0">
            {subtitle && <p className={subtitleClass}>{subtitle}</p>}
            <div className="flex flex-wrap items-center gap-2">
              <h2 className={`${titleClass} break-keep`}>{title}</h2>
              {statusLabel && (
                <span className="inline-flex min-h-7 items-center rounded-full border border-[#E2DACD] bg-[#F8F6F0] px-3 text-[12px] font-semibold text-[#6F756F]">
                  {statusLabel}
                </span>
              )}
            </div>
          </div>
          <span className={iconContainerClass} aria-hidden="true">
            {isExpanded ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </span>
        </button>
      </div>

      <div id={contentId} className={contentClass}>
        <div className={`${isCompact ? 'mb-6' : 'mb-8'} hidden md:block`}>
          {subtitle && <p className={subtitleClass}>{subtitle}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <h2
              className={
                isDark
                  ? 'mt-3 break-keep text-2xl font-bold tracking-tight text-[#FBFAF7] sm:text-3xl'
                  : `${titleClass} break-keep`
              }
            >
              {title}
            </h2>
            {statusLabel && (
              <span className="inline-flex min-h-7 items-center rounded-full border border-[#E2DACD] bg-[#F8F6F0] px-3 text-[12px] font-semibold text-[#6F756F]">
                {statusLabel}
              </span>
            )}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
