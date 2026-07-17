import type { LucideIcon } from 'lucide-react';

interface AdminPageHeaderProps {
  title: string;
  description: string;
  eyebrow?: string;
  actions?: React.ReactNode;
}

export function AdminPageHeader({
  title,
  description,
  eyebrow = 'BAEKJO OPERATIONS',
  actions,
}: AdminPageHeaderProps) {
  return (
    <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        <p className="font-editorial text-sm italic tracking-wide text-[#A8742E]">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight text-[#17211D] sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 break-keep text-sm leading-7 text-[#6F766F]">{description}</p>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}

interface AdminMetricCardProps {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  icon: LucideIcon;
  tone?: 'default' | 'accent' | 'attention';
}

export function AdminMetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'default',
}: AdminMetricCardProps) {
  const toneClass = {
    default: 'bg-white text-[#17211D]',
    accent: 'bg-[#202521] text-[#FBFAF7]',
    attention: 'bg-[#F3EEE6] text-[#17211D]',
  }[tone];
  const mutedClass = tone === 'accent' ? 'text-[#C5CBC5]' : 'text-[#6F766F]';

  return (
    <article
      className={`group relative min-h-40 overflow-hidden border border-[#E7E0D5] p-6 transition-all duration-500 ease-out hover:-translate-y-1 hover:border-[#D8C4A3] hover:shadow-[0_20px_40px_-18px_rgba(23,33,29,0.14)] ${toneClass}`}
    >
      <div className="flex items-start justify-between gap-4">
        <p className={`text-xs font-semibold tracking-wide ${mutedClass}`}>{label}</p>
        <span className={`flex size-10 items-center justify-center border ${tone === 'accent' ? 'border-white/15 bg-white/5 text-[#D8C4A3]' : 'border-[#E7E0D5] bg-[#FAF8F3] text-[#A8742E]'}`}>
          <Icon className="size-4" strokeWidth={1.6} />
        </span>
      </div>
      <div className="mt-7 font-editorial text-3xl leading-none tabular-nums">{value}</div>
      {detail && <div className={`mt-3 text-xs ${mutedClass}`}>{detail}</div>}
      <span className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-[#A8742E] transition-transform duration-500 group-hover:scale-x-100" />
    </article>
  );
}

interface AdminPanelProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function AdminPanel({ title, description, action, children, className = '' }: AdminPanelProps) {
  return (
    <section className={`overflow-hidden border border-[#E7E0D5] bg-white ${className}`}>
      <div className="flex items-start justify-between gap-5 border-b border-[#E7E0D5] px-5 py-5 sm:px-6">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-[#17211D]">{title}</h2>
          {description && <p className="mt-1 text-xs leading-5 text-[#6F766F]">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function AdminStatusBadge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' }) {
  const toneClass = {
    neutral: 'border-[#D9DDD9] bg-[#F1F3F0] text-[#59615B]',
    success: 'border-[#CAD5CC] bg-[#EDF2ED] text-[#395343]',
    warning: 'border-[#DDCCAF] bg-[#F7F0E4] text-[#8B6128]',
    danger: 'border-[#DFC8C4] bg-[#F7ECEA] text-[#8B3E38]',
  }[tone];

  return (
    <span className={`inline-flex items-center border px-2 py-1 text-[11px] font-semibold ${toneClass}`}>
      {children}
    </span>
  );
}
