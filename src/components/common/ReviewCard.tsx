'use client';

import { Review } from '@/types';
import Image from 'next/image';
import { Image as ImageIcon, Star } from 'lucide-react';
import { formatDate, ratingStars } from '@/lib/format';
import ExpandableText from '@/components/common/ExpandableText';

interface Props {
  review: Review;
  productName?: string;
  variant?: 'default' | 'home';
  className?: string;
}

export default function ReviewCard({ review, productName, variant = 'default', className }: Props) {
  const stars = ratingStars(review.rating);
  const isHome = variant === 'home';

  return (
    <article className={`group flex h-full min-w-0 flex-col overflow-hidden text-left transition-colors duration-500 ease-out ${isHome ? 'p-[20px] bg-transparent' : 'h-full p-5 md:p-6 rounded-xl border border-[#E7E0D5] hover:border-[#D8C4A3] bg-white'}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex gap-0.5" aria-label={`${review.rating}점`} role="img">
            {stars.map((star, index) => (
              <Star
                key={index}
                className={`size-3.5 md:size-4 ${
                  star === 'full'
                    ? 'fill-[#A8742E] text-[#A8742E]'
                    : star === 'half'
                      ? 'fill-[#D8C4A3] text-[#A8742E]'
                      : 'fill-[#E7E0D5] text-[#E7E0D5]'
                }`}
                aria-hidden="true"
              />
            ))}
          </div>
          <p className="mt-2 text-[12px] md:text-[13px] text-[#6F766F] break-keep">
            {review.breed} · {review.age} · {review.usePeriod}
          </p>
        </div>
        <time className="shrink-0 font-editorial text-[11px] md:text-[12px] font-medium tracking-wider text-[#8A7A64]">
          {formatDate(review.createdAt)}
        </time>
      </div>

      {productName && (
        <p className="border-l-2 border-[#D8C4A3] pl-3 text-[12px] md:text-[13px] font-medium leading-snug text-[#59615B] break-keep">
          {productName}
        </p>
      )}

      <div className="flex-1 flex flex-col">
        <ExpandableText
          text={`“${review.content}”`}
          collapsedLines={3}
          previewThreshold={90}
          className="break-keep text-[14px] leading-[1.6] text-[#59615B] md:text-[15px]"
        />
      </div>

      {review.isPhotoReview && review.image && (
        <div className="relative overflow-hidden rounded-lg border border-[#E7E0D5] bg-[#FAF8F3]">
          <Image src={review.image} alt={`${review.breed} 반려동물 후기 사진`} fill sizes="(max-width: 768px) 100vw, 300px" className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]" />
          <div className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-md border border-white/70 bg-white/90 px-2 py-1 text-[#8A6230]">
            <ImageIcon className="size-3" aria-hidden="true" />
            <span className="font-editorial text-[10px] font-bold tracking-wider">PHOTO</span>
          </div>
        </div>
      )}
    </article>
  );
}