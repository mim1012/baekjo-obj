import { COMPANY } from '@/data/company';

export const metadata = {
  title: '이용약관 | 백조오브제',
  description: '백조오브제 전자상거래 이용약관입니다.',
};

const EFFECTIVE_DATE = '2026년 7월 15일';

/**
 * 이용약관(/terms). 전자상거래 표준약관을 기반으로 한 정적 콘텐츠 페이지.
 * 사업자 정보는 company.ts(SSOT)에서 읽는다.
 * ⚠️ 법적 효력을 위해 서비스 확정 후 법무/전문가 검토를 거쳐 문구를 확정할 것.
 */
export default function TermsPage() {
  return (
    <div className="min-h-dvh bg-[#F4F2EC] py-16">
      <div className="site-container">
        <div className="mx-auto max-w-3xl">
          <p className="page-eyebrow">Legal</p>
          <h1 className="mt-3 text-3xl font-bold text-[#202521] md:text-4xl">이용약관</h1>
          <p className="mt-4 text-sm text-[#6F766F]">시행일: {EFFECTIVE_DATE}</p>

          <div className="mt-10 space-y-10">
            <Article title="제1조 (목적)">
              이 약관은 {COMPANY.name}(이하 “회사”)가 운영하는 {COMPANY.serviceName}(이하 “몰”)에서 제공하는
              전자상거래 관련 서비스를 이용함에 있어 회사와 이용자의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
            </Article>

            <Article title="제2조 (정의)">
              <List
                items={[
                  '“몰”이란 회사가 재화 또는 용역을 이용자에게 제공하기 위하여 컴퓨터 등 정보통신설비를 이용하여 재화 등을 거래할 수 있도록 설정한 가상의 영업장을 말합니다.',
                  '“이용자”란 몰에 접속하여 이 약관에 따라 몰이 제공하는 서비스를 받는 회원 및 비회원을 말합니다.',
                  '“회원”이란 회사에 개인정보를 제공하여 회원등록을 한 자로서, 몰의 서비스를 계속적으로 이용할 수 있는 자를 말합니다.',
                ]}
              />
            </Article>

            <Article title="제3조 (약관의 명시와 개정)">
              <List
                items={[
                  '회사는 이 약관의 내용과 상호, 대표자 성명, 사업자등록번호, 연락처 등을 이용자가 쉽게 알 수 있도록 몰의 초기 서비스 화면에 게시합니다.',
                  '회사는 「전자상거래 등에서의 소비자보호에 관한 법률」, 「약관의 규제에 관한 법률」 등 관련 법령을 위배하지 않는 범위에서 이 약관을 개정할 수 있습니다.',
                  '약관을 개정할 경우 적용일자 및 개정사유를 명시하여 현행약관과 함께 적용일자 7일 이전(이용자에게 불리한 변경은 30일 이전)부터 공지합니다.',
                ]}
              />
            </Article>

            <Article title="제4조 (서비스의 제공 및 변경)">
              회사는 재화 또는 용역의 정보 제공 및 구매계약의 체결, 구매계약이 체결된 재화 등의 배송 등 서비스를 제공합니다.
              재화 등의 품절 또는 기술적 사양의 변경 등의 경우에는 장차 체결되는 계약에 의해 제공할 재화 등의 내용을 변경할 수 있으며,
              이 경우 변경된 내용과 사유를 이용자에게 통지합니다.
            </Article>

            <Article title="제5조 (구매신청 및 계약의 성립)">
              이용자는 몰에서 재화 등의 선택, 결제방법의 선택 등의 방법으로 구매를 신청하며, 회사가 그 신청에 대한 수신확인 및
              판매가능 여부를 확인하여 승낙함으로써 계약이 성립합니다.
            </Article>

            <Article title="제6조 (결제방법)">
              몰에서 구매한 재화 등에 대한 대금의 지급방법은 신용카드 등 각종 전자적 지급수단에 의한 결제 등 회사가 제공하는
              방법으로 할 수 있습니다. 결제는 회사가 계약한 전자결제대행사(PG)를 통해 안전하게 처리됩니다.
            </Article>

            <Article title="제7조 (청약철회 및 환불)">
              <List
                items={[
                  '이용자는 재화 등을 공급받은 날부터 7일 이내에 청약철회를 할 수 있습니다.',
                  '이용자에게 책임 있는 사유로 재화 등이 멸실·훼손된 경우, 사용 또는 소비로 재화 등의 가치가 현저히 감소한 경우, 복제가 가능한 재화 등의 포장을 훼손한 경우 등에는 청약철회가 제한될 수 있습니다.',
                  '회사는 청약철회를 확인한 날부터 3영업일 이내에 이미 지급받은 재화 등의 대금을 환급합니다. 결제수단별 환불 처리 기간은 결제대행사 정책에 따를 수 있습니다.',
                  '자세한 배송·교환·환불 기준은 각 상품 상세 페이지 및 배송·교환·환불 안내 페이지의 안내를 따릅니다.',
                ]}
              />
            </Article>

            <Article title="제8조 (개인정보보호)">
              회사는 이용자의 개인정보를 「개인정보 보호법」 등 관련 법령에 따라 보호하며, 개인정보의 수집·이용·제공에 관한
              사항은 별도의 <a href="/privacy" className="font-semibold text-[#202521] underline underline-offset-2">개인정보처리방침</a>에 따릅니다.
            </Article>

            <Article title="제9조 (회사와 이용자의 의무)">
              회사는 관련 법령과 이 약관이 금지하거나 미풍양속에 반하는 행위를 하지 않으며, 지속적·안정적으로 서비스를
              제공하기 위해 노력합니다. 이용자는 관련 법령, 이 약관의 규정, 이용안내 및 몰이 공지한 주의사항을 준수하여야 합니다.
            </Article>

            <Article title="제10조 (면책조항 및 분쟁의 해결)">
              <List
                items={[
                  '회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.',
                  '회사와 이용자 간에 발생한 분쟁에 관한 소송은 관련 법령에 정한 절차에 따른 법원을 관할 법원으로 합니다.',
                  '회사와 이용자 간에 제기된 소송에는 대한민국 법을 적용합니다.',
                ]}
              />
            </Article>
          </div>

          <div className="mt-14 rounded-2xl border border-[#D8D6CE] bg-white/60 p-6 text-sm leading-7 text-[#4A514A]">
            <p className="font-semibold text-[#202521]">사업자 정보</p>
            <p className="mt-2">
              상호: {COMPANY.name} · 대표자: {COMPANY.ceo}
              <br />
              사업자등록번호: {COMPANY.businessNumber} · 통신판매업신고번호: {COMPANY.mailOrderNumber}
              <br />
              주소: {COMPANY.address}
              <br />
              고객센터: {COMPANY.tel} · {COMPANY.email}
            </p>
          </div>

          <p className="mt-10 text-sm text-[#6F766F]">부칙 — 이 약관은 {EFFECTIVE_DATE}부터 시행합니다.</p>
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
    <ol className="list-decimal space-y-2 pl-5">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ol>
  );
}
