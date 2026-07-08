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
    <article className="group flex h-full min-h-[240px] flex-col gap-4 rounded-[18px] bg-card border border-border p-6 transition-all duration-500 hover:shadow-md">
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
          <p className="mt-2 text-xs text-text-sub">
            {review.breed} · {review.age} · {review.usePeriod}
          </p>
        </div>
        <time className="shrink-0 text-[11px] tabular-nums text-slate-400">
          {formatDate(review.createdAt)}
        </time>
      </div>

      {productName && (
        <p className="truncate border-l-2 border-border pl-3 text-xs font-medium text-slate-700">
          {productName}
        </p>
      )}

      <p className="line-clamp-5 flex-1 text-pretty text-sm leading-7 text-text-main">
        “{review.content}”
      </p>

      {review.isPhotoReview && (
        <div className="mt-auto self-end flex items-center gap-1 rounded bg-bg px-2 py-1 text-text-sub border border-border">
          <ImageIcon className="size-3 opacity-60" />
          <span className="text-[9px] font-semibold tracking-wider">PHOTO</span>
        </div>
      )}
    </article>
  );
}
