'use client';

import Image from 'next/image';
import { createContext, useContext } from 'react';
import type { SiteShellContent } from '@/lib/cms/source/siteShell';
import { resolveCmsImageProps } from '@/lib/cms/imageSrc';

export const SiteBrandingContext = createContext<SiteShellContent['branding'] | null>(null);

interface BrandMarkProps {
  inverse?: boolean;
  compact?: boolean;
  hideTagline?: boolean;
}

export default function BrandMark({ inverse = false, compact = false }: BrandMarkProps) {
  const branding = useContext(SiteBrandingContext);
  const logo = resolveCmsImageProps(branding?.headerLogo ?? '/images/baekjo-objet-header-logo-v2.png');
  if (!logo) return null;

  return (
    <span className={'relative inline-block shrink-0 align-middle ' + (compact ? 'h-9 w-[117px]' : 'h-11 w-[143px] lg:h-12 lg:w-[156px]')}>
      <Image
        src={logo.src}
        unoptimized={logo.unoptimized}
        alt={branding?.logoAlt ?? 'Baekjo Objet'}
        fill
        sizes={compact ? '117px' : '(min-width: 1024px) 156px, 143px'}
        className={'object-contain ' + (inverse ? 'brightness-0 invert' : '')}
      />
    </span>
  );
}
