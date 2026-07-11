import { Notice } from '@/types';

interface Props {
  category?: Notice['category'];
  className?: string;
}

const categoryLabels: Record<NonNullable<Notice['category']>, string> = {
  notice: '공지',
  event: '이벤트',
  brand: '브랜드',
};

const categoryStyles: Record<NonNullable<Notice['category']>, string> = {
  notice: 'border-[#D8C4A3] bg-[#F3EEE6] text-[#8A6230]',
  event: 'border-[#C8B19B] bg-[#EFE6DD] text-[#765640]',
  brand: 'border-[#C8D2C8] bg-[#EDF2ED] text-[#4E6655]',
};

export default function NoticeCategoryBadge({ category = 'notice', className = '' }: Props) {
  return (
    <span
      className={`inline-flex min-w-[52px] items-center justify-center rounded-md border px-2.5 py-1 text-[11px] font-semibold leading-none ${categoryStyles[category]} ${className}`}
    >
      {categoryLabels[category]}
    </span>
  );
}
