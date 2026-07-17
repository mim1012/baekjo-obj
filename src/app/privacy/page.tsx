import { COMPANY } from '@/data/company';

export const metadata = {
  title: '개인정보처리방침 | 백조오브제',
  description: '백조오브제 개인정보처리방침입니다.',
};

const EFFECTIVE_DATE = '2026년 7월 15일';

/**
 * 개인정보처리방침(/privacy). 「개인정보 보호법」 기반 정적 콘텐츠 페이지.
 * 사업자·보호책임자 정보는 company.ts(SSOT)에서 읽는다.
 * ⚠️ 실제 수집 항목·위탁사·보유기간은 서비스 확정 후 실제 운영 내용에 맞게 검토·확정할 것.
 */
export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-[#F4F2EC] py-16">
      <div className="site-container">
        <div className="mx-auto max-w-3xl">
          <p className="page-eyebrow">Legal</p>
          <h1 className="mt-3 text-3xl font-bold text-[#202521] md:text-4xl">개인정보처리방침</h1>
          <p className="mt-4 text-sm text-[#6F766F]">시행일: {EFFECTIVE_DATE}</p>

          <p className="mt-8 break-keep text-sm leading-7 text-[#4A514A]">
            {COMPANY.name}(이하 “회사”)는 「개인정보 보호법」 등 관련 법령을 준수하며, 이용자의 개인정보를 보호하고
            권익을 존중하기 위해 다음과 같이 개인정보처리방침을 수립·공개합니다.
          </p>

          <div className="mt-10 space-y-10">
            <Article title="1. 수집하는 개인정보 항목">
              <List
                items={[
                  '회원가입·서비스 이용: 이름, 이메일 주소, 비밀번호, 휴대전화번호',
                  '상품 주문·배송: 수령인 이름, 배송지 주소, 연락처, 주문 내역',
                  '결제: 결제수단 정보(결제는 전자결제대행사를 통해 처리되며 카드번호 등 민감정보는 회사가 저장하지 않습니다)',
                  '서비스 이용 과정에서 자동 생성·수집되는 정보: 접속 로그, 쿠키, 접속 IP 정보, 기기 정보',
                ]}
              />
            </Article>

            <Article title="2. 개인정보의 수집 및 이용 목적">
              <List
                items={[
                  '회원 식별 및 가입 의사 확인, 회원제 서비스 제공',
                  '재화·용역의 주문 처리, 대금 결제, 배송 및 고객 상담·불만 처리',
                  '신규 서비스 안내 및 이벤트 정보 제공(동의한 이용자에 한함)',
                  '부정 이용 방지 및 서비스 운영·개선을 위한 통계 분석',
                ]}
              />
            </Article>

            <Article title="3. 개인정보의 보유 및 이용 기간">
              회사는 원칙적으로 개인정보 수집·이용 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 다만 관련 법령에
              따라 보존할 필요가 있는 경우 아래 기간 동안 보관합니다.
              <List
                items={[
                  '계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래 등에서의 소비자보호에 관한 법률)',
                  '대금결제 및 재화 등의 공급에 관한 기록: 5년 (동법)',
                  '소비자의 불만 또는 분쟁처리에 관한 기록: 3년 (동법)',
                  '표시·광고에 관한 기록: 6개월 (동법)',
                ]}
              />
            </Article>

            <Article title="4. 개인정보의 제3자 제공">
              회사는 이용자의 개인정보를 제1조에서 고지한 범위 내에서만 이용하며, 이용자의 사전 동의 없이 범위를 초과하여
              이용하거나 제3자에게 제공하지 않습니다. 다만 법령의 규정에 의하거나 수사기관의 적법한 요청이 있는 경우는 예외로 합니다.
            </Article>

            <Article title="5. 개인정보 처리의 위탁">
              회사는 원활한 서비스 제공을 위해 아래와 같이 개인정보 처리 업무를 위탁할 수 있으며, 위탁 시 관련 법령에 따라
              개인정보가 안전하게 관리되도록 필요한 사항을 규정합니다.
              <List
                items={[
                  '전자결제 처리: 토스페이먼츠',
                  '상품 배송: 회사가 계약한 택배사 및 물류 업체',
                  `서비스 운영·호스팅: ${COMPANY.hostingProvider}`,
                ]}
              />
            </Article>

            <Article title="6. 정보주체의 권리·의무 및 행사 방법">
              이용자는 언제든지 자신의 개인정보를 조회·수정할 수 있으며, 회원 탈퇴 또는 개인정보 삭제·처리정지를 요청할 수
              있습니다. 권리 행사는 고객센터를 통해 요청할 수 있으며, 회사는 지체 없이 필요한 조치를 취합니다.
            </Article>

            <Article title="7. 개인정보의 파기">
              회사는 보유 기간이 경과하거나 처리 목적이 달성된 개인정보를 지체 없이 파기합니다. 전자적 파일 형태의 정보는
              복구·재생할 수 없는 기술적 방법으로 삭제하며, 종이 문서는 분쇄하거나 소각합니다.
            </Article>

            <Article title="8. 개인정보의 안전성 확보조치">
              회사는 개인정보의 안전성 확보를 위해 관리적 조치(내부관리계획 수립, 접근 권한 관리), 기술적 조치(접근통제,
              암호화, 보안 프로그램 설치), 물리적 조치를 시행합니다.
            </Article>

            <Article title="9. 개인정보 보호책임자">
              회사는 개인정보 처리에 관한 업무를 총괄하고, 이용자의 불만 처리 및 피해 구제를 위해 아래와 같이 개인정보
              보호책임자를 지정하고 있습니다.
              <div className="mt-3 rounded-2xl border border-[#D8D6CE] bg-white/60 p-4">
                개인정보 보호책임자: {COMPANY.privacyOfficer}
                <br />
                연락처: {COMPANY.tel} · {COMPANY.email}
              </div>
            </Article>
          </div>

          <p className="mt-10 text-sm text-[#6F766F]">
            이 개인정보처리방침은 {EFFECTIVE_DATE}부터 적용됩니다. 내용의 추가·삭제·수정이 있을 경우 시행 7일 전부터 공지합니다.
          </p>
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
