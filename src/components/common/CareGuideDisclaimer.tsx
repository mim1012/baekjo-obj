import { Stethoscope } from 'lucide-react';
import { CARE_GUIDE_DISCLAIMER } from '@/data/customerNotices';

export default function CareGuideDisclaimer({ className = '' }: { className?: string }) {
  return (
    <aside
      data-testid="care-guide-disclaimer"
      aria-label="케어가이드 의료 안내"
      className={`rounded-[16px] border border-[#DED8CC] bg-[#FAF8F3] px-5 py-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <Stethoscope className="mt-0.5 size-4 shrink-0 text-[#7A4E1D]" aria-hidden="true" />
        <div>
          <p className="text-[13px] font-bold text-[#17211D]">꼭 확인해주세요</p>
          <p className="mt-1.5 break-keep text-sm leading-6 text-[#59615B] ">
            {CARE_GUIDE_DISCLAIMER}
          </p>
        </div>
      </div>
    </aside>
  );
}
