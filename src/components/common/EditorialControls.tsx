import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, type LucideIcon } from 'lucide-react';

type EditorialActionVariant = 'primary' | 'secondary' | 'inverse' | 'inverse-outline';

interface EditorialActionLinkProps {
  href: string;
  children: ReactNode;
  variant?: EditorialActionVariant;
  className?: string;
}

interface EditorialIconBadgeProps {
  icon: LucideIcon;
  className?: string;
}

const actionVariants: Record<EditorialActionVariant, string> = {
  primary: 'bg-[#17211D] text-[#FBFAF7] hover:bg-[#202521] focus-visible:ring-offset-[#FBFAF7]',
  secondary:
    'border border-[#E7E0D5] bg-transparent text-[#17211D] hover:border-[#D8C4A3] hover:bg-[#F3EEE6] focus-visible:ring-offset-[#FBFAF7]',
  inverse:
    'bg-[#FBFAF7] text-[#17211D] hover:bg-[#F3EEE6] focus-visible:ring-offset-[#202521]',
  'inverse-outline':
    'border border-[#FBFAF7]/30 bg-transparent text-[#FBFAF7] hover:border-[#FBFAF7]/60 hover:bg-white/10 focus-visible:ring-offset-[#202521]',
};

export function EditorialActionLink({
  href,
  children,
  variant = 'primary',
  className = '',
}: EditorialActionLinkProps) {
  return (
    <Link
      href={href}
      className={`group inline-flex min-h-14 w-full items-center justify-between gap-4 rounded-full px-6 text-[15px] font-bold transition-all duration-500 ease-out active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A8742E] focus-visible:ring-offset-2 sm:min-h-12 sm:w-auto sm:justify-center ${actionVariants[variant]} ${className}`}
    >
      <span>{children}</span>
      <ArrowRight
        className="size-4 shrink-0 transition-transform duration-500 ease-out group-hover:translate-x-1"
        strokeWidth={1.75}
        aria-hidden="true"
      />
    </Link>
  );
}

export function EditorialIconBadge({ icon: Icon, className = '' }: EditorialIconBadgeProps) {
  return (
    <span
      className={`inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#F3EEE6] text-[#17211D] ${className}`}
      aria-hidden="true"
    >
      <Icon className="size-5" strokeWidth={1.5} />
    </span>
  );
}
