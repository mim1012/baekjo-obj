import Image from 'next/image';
import { Brand } from '@/types';

interface Props {
  brand: Brand;
  size?: 'sm' | 'md' | 'lg';
  surface?: boolean;
  fit?: 'contain' | 'cover';
  className?: string;
}

const sizeClasses = {
  sm: 'h-5 w-[84px]',
  md: 'h-10 w-[178px]',
  lg: 'h-16 w-[260px]',
};

const logoScaleMap: Record<string, number> = {
  b1: 1,
  b2: 1.6,
  b3: 1,
  b5: 1,
  b6: 1,
  b7: 1.15,
  b8: 1.2,
  b9: 0.9,
};

export default function BrandLogo({ brand, size = 'md', surface = true, fit, className = '' }: Props) {
  const fallbackName = brand.name.replace(/\s*\(.*?\)/, '').trim();
  const isAlloming = brand.id === 'b5';
  const imageFit = fit ?? (isAlloming ? 'cover' : 'contain');
  const surfaceClass = surface ? 'rounded-xl border border-[#E7E0D5] bg-white p-2 shadow-sm' : '';
  const imageClass = imageFit === 'cover' ? 'object-cover object-center' : 'object-contain object-center';

  return (
    <div
      className={`relative flex shrink-0 items-center overflow-hidden ${sizeClasses[size]} ${surfaceClass} ${className}`}
    >
      {brand.logo ? (
        <Image
          src={brand.logo}
          alt={`${fallbackName} 로고`}
          fill
          sizes={size === 'lg' ? '260px' : size === 'md' ? '178px' : '84px'}
          unoptimized
          className={imageClass}
          style={{
            transform: size === 'md' ? `scale(${logoScaleMap[brand.id] ?? 1})` : 'none',
            transformOrigin: 'center'
          }}
        />
      ) : (
        <span className="truncate text-[11px] font-bold tracking-tight text-[#17211D]">{fallbackName}</span>
      )}
    </div>
  );
}
