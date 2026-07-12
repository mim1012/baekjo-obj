import Link from 'next/link';
import { ArrowRight, Droplet, Bone, PawPrint, Scale, Utensils, Activity, Brain, ShieldPlus } from 'lucide-react';
import { Concern } from '@/types';

interface Props {
  concern: Concern;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  tear: <Droplet className="size-5 text-[#18231F]" strokeWidth={1.5} />,
  joint: <Bone className="size-5 text-[#18231F]" strokeWidth={1.5} />,
  skin: <PawPrint className="size-5 text-[#18231F]" strokeWidth={1.5} />,
  obesity: <Scale className="size-5 text-[#18231F]" strokeWidth={1.5} />,
  picky: <Utensils className="size-5 text-[#18231F]" strokeWidth={1.5} />,
  digestion: <Activity className="size-5 text-[#18231F]" strokeWidth={1.5} />,
  stress: <Brain className="size-5 text-[#18231F]" strokeWidth={1.5} />,
  senior: <ShieldPlus className="size-5 text-[#18231F]" strokeWidth={1.5} />,
};

const INDEX_MAP: Record<string, string> = {
  tear: '01',
  joint: '02',
  skin: '03',
  obesity: '04',
  picky: '05',
  digestion: '06',
  stress: '07',
  senior: '08'
};

export default function ConcernCard({ concern }: Props) {
  const icon = ICON_MAP[concern.slug] || <Droplet className="size-5 text-[#18231F]" strokeWidth={1.5} />;
  const index = INDEX_MAP[concern.slug] || '00';

  return (
    <Link
      href={`/concerns/${concern.slug}`}
      aria-label={`${concern.title} 케어 살펴보기`}
      className="care-card group"
    >
      <div className="mb-8 flex items-start justify-between">
        <span
          aria-hidden="true"
          className="flex size-11 items-center justify-center rounded-[12px] bg-[var(--care-surface-muted)] transition-colors duration-500 group-hover:bg-[#EAE2D3]"
        >
          {icon}
        </span>
        <span className="text-[13px] font-bold tracking-[0.1em] text-[var(--care-accent)]">
          {index}
        </span>
      </div>
      
      <div className="flex grow flex-col justify-end">
        <h3 className="break-keep text-lg font-bold tracking-tight text-[var(--care-text)]">{concern.title}</h3>
        <p className="mt-2 line-clamp-2 break-keep text-sm leading-relaxed text-[var(--care-text-muted)]">
          {concern.shortDescription}
        </p>
        <div className="mt-5 flex items-center text-[13px] font-bold text-[var(--care-text)]">
          <span>살펴보기</span>
          <ArrowRight aria-hidden="true" className="ml-1.5 size-3.5 text-[var(--care-text-muted)] transition-transform duration-300 group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
}
