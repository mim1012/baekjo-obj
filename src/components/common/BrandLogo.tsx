import Image from 'next/image';
import { Brand } from '@/types';
import { formatBrandDisplayName } from '@/lib/brands/presentation';

interface Props {
  brand: Brand;
  size?: 'sm' | 'md' | 'lg';
  surface?: boolean;
  fit?: 'contain' | 'cover';
  fluid?: boolean;
  uniformScale?: boolean;
  scaleOverride?: number;
  srcOverride?: string;
  className?: string;
}

type LogoSize = NonNullable<Props['size']>;

const displayLogoMap: Record<string, string> = {
  b3: '/brands/nobledog-wordmark-pink-v2.png',
  b5: '/brands/alloming-wordmark-orange-v2.png',
  b6: '/brands/repet-clean.png',
};

export const getBrandDisplayLogo = (brand: Pick<Brand, 'id' | 'logo'>) =>
  displayLogoMap[brand.id] ?? brand.logo;

export const getBrandTitleDisplayLogo = (
  brand: Pick<Brand, 'id' | 'logo' | 'wordmarkImage'>,
) => displayLogoMap[brand.id] ?? brand.wordmarkImage ?? brand.logo;

const sizeClasses = {
  sm: 'h-5 w-[84px]',
  md: 'h-10 w-[178px]',
  lg: 'h-16 w-[260px]',
};

const fluidSizeClasses = {
  sm: 'h-5 w-full',
  md: 'h-10 w-full',
  lg: 'h-16 w-full',
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

// 원본 파일마다 포함된 투명 여백이 달라 같은 박스에서도 로고가 제각각 커 보인다.
// 셀렉션 레일에서는 실제 로고 획의 높이가 비슷하게 보이도록 시각 배율을 보정한다.
const mediumUniformLogoScaleMap: Record<string, number> = {
  b1: 0.9,
  b2: 1.8,
  b3: 1.1,
  b4: 0.95,
  b5: 1.15,
  b6: 0.95,
  b7: 1,
  b8: 2,
  b9: 1,
};

// 상세 패널의 큰 로고도 동일한 시각 면적을 사용하도록 별도 배율을 적용한다.
const largeUniformLogoScaleMap: Record<string, number> = {
  b1: 0.86,
  b2: 1.75,
  b3: 1.1,
  b4: 0.95,
  b5: 1.15,
  b6: 0.95,
  b7: 0.95,
  b8: 2,
  b9: 0.92,
};

// 챠콜스토리 원본은 로고 획이 캔버스 왼쪽에 치우쳐 있어 확대 시 시각 중심을 보정한다.
const uniformLogoOffsetMap: Record<string, string> = {
  b8: '16%',
};

const getLogoTransform = (
  brandId: string,
  size: LogoSize,
  uniformScale: boolean,
  scaleOverride?: number,
) => {
  if (scaleOverride !== undefined) {
    return `translateX(${uniformLogoOffsetMap[brandId] ?? '0%'}) scale(${scaleOverride})`;
  }

  if (uniformScale && size !== 'sm') {
    const scaleMap = size === 'lg' ? largeUniformLogoScaleMap : mediumUniformLogoScaleMap;
    return `translateX(${uniformLogoOffsetMap[brandId] ?? '0%'}) scale(${scaleMap[brandId] ?? 1})`;
  }

  return size === 'md' ? `scale(${logoScaleMap[brandId] ?? 1})` : 'none';
};

export default function BrandLogo({
  brand,
  size = 'md',
  surface = true,
  fit,
  fluid = false,
  uniformScale = false,
  scaleOverride,
  srcOverride,
  className = '',
}: Props) {
  const fallbackName = formatBrandDisplayName(brand.name);
  const logoSrc = srcOverride ?? getBrandDisplayLogo(brand);
  const hasTransparentDisplayLogo = Boolean(displayLogoMap[brand.id]);
  const imageFit = uniformScale ? 'contain' : (fit ?? 'contain');
  const surfaceClass = surface ? 'rounded-xl bg-white' : '';
  const surfaceImageClass = surface && !uniformScale && !hasTransparentDisplayLogo ? 'p-2' : '';
  const backgroundBlendClass = brand.id === 'b8' ? 'mix-blend-multiply' : '';
  const imageClass = imageFit === 'cover'
    ? `object-cover object-center ${surfaceImageClass} ${backgroundBlendClass}`
    : `object-contain object-center ${surfaceImageClass} ${backgroundBlendClass}`;
  const containerSizeClass = fluid ? fluidSizeClasses[size] : sizeClasses[size];

  return (
    <div
      className={`relative flex shrink-0 items-center overflow-hidden ${containerSizeClass} ${surfaceClass} ${className}`}
    >
      {logoSrc ? (
        <Image
          src={logoSrc}
          alt={`${fallbackName} 로고`}
          fill
          sizes={size === 'lg' ? '260px' : size === 'md' ? '178px' : '84px'}
          unoptimized
          className={imageClass}
          style={{
            transform: getLogoTransform(brand.id, size, uniformScale, scaleOverride),
            transformOrigin: 'center'
          }}
        />
      ) : (
        <span className="w-full break-keep text-left text-[11px] font-bold leading-[1.25] tracking-tight text-[#17211D]">{fallbackName}</span>
      )}
    </div>
  );
}
