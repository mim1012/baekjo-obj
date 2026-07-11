import { Review } from '@/types';
import { Image as ImageIcon, Star } from 'lucide-react';
import { formatDate, ratingStars } from '@/lib/format';

interface Props {
  review: Review;
  productName?: string;
}

export default function ReviewCard({ review, productName }: Props) {
  const stars = ratingStars(review.rating);

  return (
    <article className="group flex h-full flex-col gap-4 rounded-xl border border-[#E7E0D5] bg-white p-5 transition-colors duration-500 ease-out hover:border-[#D8C4A3] lg:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex gap-0.5" aria-label={`${review.rating}점`} role="img">
            {stars.map((star, index) => (
              <Star
                key={index}
                className={`size-4 ${
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
          <p className="mt-2 text-[13px] text-[#6F766F] break-keep">
            {review.breed} · {review.age} · {review.usePeriod}
          </p>
        </div>
        <time className="shrink-0 font-editorial text-[12px] font-medium tracking-wider text-[#8A7A64]">
          {formatDate(review.createdAt)}
        </time>
      </div>

      {productName && (
        <p className="border-l-2 border-[#D8C4A3] pl-3 text-[13px] font-medium leading-snug text-[#59615B] break-keep">
          {productName}
        </p>
      )}

      <p className="flex-1 text-[15px] leading-[1.75] text-[#17211D] break-keep">
        “{review.content}”
      </p>

      {review.isPhotoReview && review.image && (
        <div className="relative overflow-hidden rounded-lg border border-[#E7E0D5] bg-[#FAF8F3]">
          <img src={review.image} alt={`${review.breed} 반려동물 후기 사진`} className="h-[112px] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]" />
          <div className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-md border border-white/70 bg-white/90 px-2 py-1 text-[#8A6230]">
            <ImageIcon className="size-3" aria-hidden="true" />
            <span className="font-editorial text-[10px] font-bold tracking-wider">PHOTO</span>
          </div>
        </div>
      )}
    </article>
  );
}
