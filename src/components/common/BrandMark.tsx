'use client';

import Image from 'next/image';
import { usePublicSiteContent } from '@/components/providers/PublicSiteContentProvider';

interface BrandMarkProps {
  inverse?: boolean;
  compact?: boolean;
  className?: string;
  priority?: boolean;
  testId?: string;
}

export default function BrandMark({
  inverse = false,
  compact = false,
  className = '',
  priority = false,
  testId,
}: BrandMarkProps) {
  const siteContent = usePublicSiteContent();

  return (
    <span
      className={`relative block shrink-0 ${className || (compact ? 'h-10 w-12' : 'h-12 w-[156px]')}`}
    >
      <Image
        src={siteContent.branding.headerLogo}
        alt={siteContent.branding.logoAlt}
        fill
        sizes={compact ? '48px' : '156px'}
        priority={priority}
        className={`object-contain ${inverse ? 'brightness-0 invert' : ''}`}
        data-testid={testId}
      />
    </span>
  );
}
