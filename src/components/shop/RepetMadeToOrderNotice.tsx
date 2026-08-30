import { MessageCircle, PackageCheck } from 'lucide-react';
import { COMPANY } from '@/data/company';

export const REPET_BRAND_ID = 'b6';

export function isRepetMadeToOrderProduct(brandId: string): boolean {
  return brandId === REPET_BRAND_ID;
}

export default function RepetMadeToOrderNotice({ className = '' }: { className?: string }) {
  return (
    <aside
      data-testid="repet-made-to-order-notice"
      className={`rounded-[18px] border-2 border-[#A8742E] bg-[#FFF9EC] p-5 shadow-[0_14px_36px_-24px_rgba(122,78,29,0.55)] sm:p-6 ${className}`}
      aria-labelledby="repet-made-to-order-title"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#A8742E] text-white">
          <PackageCheck className="size-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-[11px] font-bold tracking-[0.16em] text-[#A8742E]">RE:PET MADE TO ORDER</p>
          <h2 id="repet-made-to-order-title" className="mt-1 text-[18px] font-bold text-[#17211D]">
            주문제작 안내
          </h2>
        </div>
      </div>

      <div className="mt-4 space-y-2 break-keep text-[14px] leading-7 text-[#4F574F]">
        <p>본 상품은 주문 후 제작자와의 확인 과정이 필요한 주문제작 상품입니다.</p>
        <p className="font-semibold text-[#7A4E1D]">
          본 상품은 1:1 주문제작 상품으로, 제작이 시작된 이후에는 주문 취소가 어렵습니다. 제작 일정에 따라 최대 3개월까지 소요될 수 있으니 충분히 확인하신 후 주문해주세요.
        </p>
        <p>
          주문 완료 후 원활한 제작 진행을 위해 <strong className="text-[#17211D]">‘백조오브제 주문제작’ 카카오톡 채널</strong>로
          주문자명과 주문번호를 남겨주세요.
        </p>
        <p>사진 전달 및 제작 관련 세부사항은 해당 채널을 통해 안내됩니다.</p>
      </div>

      <a
        href={COMPANY.kakaoTalkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#FEE500] px-5 text-[14px] font-bold text-[#191919] transition-colors hover:bg-[#F7D900] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A8742E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFF9EC] sm:w-auto"
      >
        <MessageCircle className="size-4" aria-hidden="true" />
        ‘백조오브제 주문제작’ 채널 열기
      </a>
    </aside>
  );
}
