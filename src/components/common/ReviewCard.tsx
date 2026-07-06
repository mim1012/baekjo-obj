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
    <article className="group flex min-h-64 flex-col gap-4 rounded-[18px] bg-white border border-[rgba(15,23,42,0.08)] p-6 transition-all duration-500 hover:shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex gap-0.5" aria-label={`${review.rating}점`}>
            {stars.map((star, index) => (
              <Star
                key={index}
                className={`size-3.5 ${
                  star === 'full'
                    ? 'fill-slate-700 text-slate-700'
                    : star === 'half'
                      ? 'fill-slate-400 text-slate-700'
                      : 'fill-slate-100 text-slate-200'
                }`}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-[#64748B]">
            {review.breed} · {review.age} · {review.usePeriod}
          </p>
        </div>
        <time className="shrink-0 text-[11px] tabular-nums text-slate-400">
          {formatDate(review.createdAt)}
        </time>
      </div>

      {productName && (
        <p className="truncate border-l-2 border-slate-200 pl-3 text-xs font-medium text-[#334155]">
          {productName}
        </p>
      )}

      <p className="line-clamp-5 flex-1 text-pretty text-sm leading-7 text-[#17211D]">
        “{review.content}”
      </p>

      {review.isPhotoReview && (
        <div className="flex size-16 items-center justify-center rounded-lg bg-[#F4EFE8] text-[#64748B]">
          {review.image ? <span className="text-[10px] font-semibold">PHOTO</span> : <ImageIcon className="size-5 opacity-50" />}
        </div>
      )}
    </article>
  );
}
