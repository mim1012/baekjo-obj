import Link from 'next/link';
import { ArrowRight, Droplet, Bone, PawPrint, Scale, Utensils, Activity, Brain, ShieldPlus, Apple, Smile, Scissors, Home } from 'lucide-react';
import { Concern } from '@/types';

interface Props {
  concern: Concern;
  index?: string;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  tear: <Droplet className="size-[18px] md:size-[21px] text-[#18231F]" strokeWidth={1.5} />,
  joint: <Bone className="size-[18px] md:size-[21px] text-[#18231F]" strokeWidth={1.5} />,
  skin: <PawPrint className="size-[18px] md:size-[21px] text-[#18231F]" strokeWidth={1.5} />,
  obesity: <Scale className="size-[18px] md:size-[21px] text-[#18231F]" strokeWidth={1.5} />,
  picky: <Utensils className="size-[18px] md:size-[21px] text-[#18231F]" strokeWidth={1.5} />,
  digestion: <Activity className="size-[18px] md:size-[21px] text-[#18231F]" strokeWidth={1.5} />,
  stress: <Brain className="size-[18px] md:size-[21px] text-[#18231F]" strokeWidth={1.5} />,
  senior: <ShieldPlus className="size-[18px] md:size-[21px] text-[#18231F]" strokeWidth={1.5} />,
  nutrition: <Apple className="size-[18px] md:size-[21px] text-[#18231F]" strokeWidth={1.5} />,
  oral: <Smile className="size-[18px] md:size-[21px] text-[#18231F]" strokeWidth={1.5} />,
  grooming: <Scissors className="size-[18px] md:size-[21px] text-[#18231F]" strokeWidth={1.5} />,
  living: <Home className="size-[18px] md:size-[21px] text-[#18231F]" strokeWidth={1.5} />,
};

// 1. 주요 고민용 정보 카드 (4열 x 2행 구조용)
// named export도 함께 제공한다 — dad 버전 페이지가 { MainConcernCard }로 import한다.
export default function MainConcernCard({ concern, index = "01" }: Props) {
  const icon = ICON_MAP[concern.slug] || <Droplet className="size-[18px] md:size-[21px] text-[#18231F]" strokeWidth={1.5} />;

  return (
    <Link
      href={`/concerns/${concern.slug}`}
      aria-label={`${concern.title} 케어 살펴보기`}
      className="group relative flex min-h-[180px] w-full flex-col justify-between rounded-[16px] border border-[#E4DDD1] bg-white p-[22px] transition-all duration-300 hover:-translate-y-[2px] md:min-h-[210px] md:rounded-[18px] md:p-[26px]"
    >
      <div className="flex items-start justify-between w-full">
        <div className="flex size-[38px] md:size-[42px] items-center justify-center rounded-xl bg-[#F8F6F0] transition-colors group-hover:bg-[#F2EEE5]">
          {icon}
        </div>
        {/* 번호는 고민명보다 뒤로 물러나도록 작고 연하게(클라이언트 요청 2026-07-24) */}
        <span className="text-[10px] md:text-[11px] font-semibold tracking-widest text-[#CBB68F]">{index}</span>
      </div>

      <div className="flex flex-col mt-4">
        <h3 className="text-[17px] md:text-[19px] font-bold tracking-tight text-[#17231E] mb-1.5 md:mb-2">{concern.title}</h3>
        {/* 설명은 2줄 고정(line-clamp) — 카드 높이·줄 수를 동일하게 정렬 */}
        <p className="break-keep text-[13px] leading-[1.6] text-[#72766F] md:text-[14px] line-clamp-2 min-h-[41.6px] md:min-h-[44.8px]">
          {concern.shortDescription}
        </p>
      </div>

      <div className="flex items-center gap-1.5 mt-4 md:mt-5">
        <span className="text-[12px] md:text-[13px] font-bold text-[#17231E]">살펴보기</span>
        <ArrowRight className="size-3.5 md:size-4 text-[#17231E] transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2} />
      </div>
    </Link>
  );
}

export { MainConcernCard };

// 2. 추가 케어용 컴팩트 카드 (4열 구조용)
export function SubConcernCard({ concern }: Props) {
  const icon = ICON_MAP[concern.slug] || <Droplet className="size-[18px] md:size-[21px] text-[#18231F]" strokeWidth={1.5} />;

  return (
    <Link
      href={`/concerns/${concern.slug}`}
      aria-label={`${concern.title} 케어 살펴보기`}
      className="group flex min-h-[110px] w-full items-center justify-between rounded-[16px] border border-[#E4DDD1] bg-white p-[18px] transition-all duration-300 hover:-translate-y-[2px] md:min-h-[130px] md:rounded-[18px] md:p-[22px]"
    >
      <div className="flex items-start md:items-center gap-4 md:gap-5 w-full">
        <div
          aria-hidden="true"
          className="flex shrink-0 size-[38px] md:size-[42px] items-center justify-center rounded-xl bg-[#F8F6F0] transition-colors group-hover:bg-[#F2EEE5]"
        >
          {icon}
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <h3 className="mb-1 break-keep text-[16px] font-bold tracking-tight text-[#17231E] md:text-[17px]">
            {concern.title}
          </h3>
          <p className="break-keep text-[13px] leading-[1.6] text-[#72766F] md:text-[14px] line-clamp-2">
            {concern.shortDescription}
          </p>
        </div>
      </div>
      <ArrowRight aria-hidden="true" className="ml-3 shrink-0 size-4 md:size-5 text-[#D7CCBC] transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[#B68B4E]" strokeWidth={2} />
    </Link>
  );
}
