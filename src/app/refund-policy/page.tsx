import { COMPANY, DEFAULT_COMMERCE_POLICY } from '@/data/company';

export const metadata = {
  title: '배송·교환·환불 안내 | 백조오브제',
  description: '백조오브제 상품 배송, 교환, 반품, 환불 기준입니다.',
};

const EFFECTIVE_DATE = '2026년 7월 16일';

export default function RefundPolicyPage() {
  return (
    <div className="min-h-dvh bg-[#F4F2EC] py-16">
      <div className="site-container">
        <div className="mx-auto max-w-3xl">
          <p className="page-eyebrow">Commerce Policy</p>
          <h1 className="mt-3 text-3xl font-bold text-[#202521] md:text-4xl">배송·교환·환불 안내</h1>
          <p className="mt-4 text-sm text-[#6F766F]">시행일: {EFFECTIVE_DATE}</p>

          <div className="mt-10 space-y-10">
            <Article title="1. 배송 안내">
              <List
                items={[
                  '배송지역: 대한민국 전 지역으로 배송합니다. 단, 도서·산간 지역은 배송 기간이 추가로 소요되거나 추가 배송비가 발생할 수 있습니다.',
                  `배송비: ${DEFAULT_COMMERCE_POLICY.shippingLabel}. 상품별 배송비가 다른 경우 각 상품 상세 페이지의 안내를 우선합니다.`,
                  `출고 일정: ${DEFAULT_COMMERCE_POLICY.deliveryEstimate}`,
                  '배송조회: 상품 발송 후 마이페이지 또는 고객센터를 통해 운송장 번호와 배송 진행 상황을 확인할 수 있습니다.',
                ]}
              />
            </Article>

            <Article title="2. 교환·반품 안내">
              <List
                items={[
                  '교환·반품 신청기간: 상품 수령일로부터 7일 이내 고객센터 또는 상품 문의를 통해 신청할 수 있습니다.',
                  '단순 변심에 따른 교환·반품 배송비는 고객 부담입니다. 상품 불량 또는 오배송의 경우 배송비는 판매자가 부담합니다.',
                  '반품 주소는 교환·반품 접수 시 고객센터에서 개별 안내합니다.',
                  '상품을 사용했거나 훼손·오염된 경우, 구성품이 누락된 경우, 맞춤제작·신선식품 등 재판매가 어려운 상품은 교환·반품이 제한될 수 있습니다.',
                ]}
              />
            </Article>

            <Article title="3. 환불 안내">
              <List
                items={[
                  '반품 상품 회수 및 검수 완료 후 결제수단에 따라 환불이 진행됩니다.',
                  '신용카드 결제 취소는 카드사 정책에 따라 영업일 기준 3–7일 정도 소요될 수 있습니다.',
                  '무통장입금 주문은 환불 계좌 확인 후 영업일 기준 3일 이내 환불 처리합니다.',
                  '표시·광고 내용과 다르거나 계약 내용과 다르게 이행된 경우 관련 법령에 따라 교환·반품·환불을 처리합니다.',
                ]}
              />
            </Article>

            <Article title="4. 고객센터">
              <div className="rounded-2xl border border-[#D8D6CE] bg-white/60 p-5">
                <p>고객센터: {COMPANY.tel}</p>
                <p>이메일: {COMPANY.email}</p>
                <p>운영시간: {COMPANY.supportHours}</p>
              </div>
            </Article>
          </div>
        </div>
      </div>
    </div>
  );
}

function Article({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-[#202521]">{title}</h2>
      <div className="mt-3 break-keep text-sm leading-7 text-[#4A514A]">{children}</div>
    </section>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}
