import StaticLegalDocument from '@/components/legal/StaticLegalDocument';
import { defaultPageTextSettings } from '@/data/pageTextContent';
import { getPublishedPageContent } from '@/lib/cms/content';
import { logServerError } from '@/lib/logServerError';
import { getCachedPageTextSettings } from '@/lib/public-read-cache';
import { selectRefundPolicyContent, type RefundPolicyContent } from '@/lib/cms/source/refundPolicy';

export const metadata = {
  title: '배송·교환·환불 안내 | 백조오브제',
  description: '백조오브제 상품 배송, 교환, 반품, 환불 기준입니다.',
};

export default async function RefundPolicyPage() {
  const published = await getPublishedPageContent<RefundPolicyContent>('refund-policy').catch(
    (error: unknown) => {
      logServerError('[RefundPolicy] CMS 조회 실패', error);
      return null;
    },
  );
  const managed = published !== null;
  // B3: 활성화 전(managed=false)에는 옛 환경설정(page-texts)의 'refundPolicy.*' 덮어쓰기를
  // 반영해야 한다(privacy/terms page.tsx와 동일 패턴) — refundPolicyContent()가 상수만 쓰면
  // 관리자가 예전에 바꿔둔 조항 제목이 조용히 되돌아간다.
  let settings = defaultPageTextSettings;
  if (!managed) {
    try {
      settings = (await getCachedPageTextSettings()) ?? defaultPageTextSettings;
    } catch (error) {
      logServerError('[RefundPolicy] 기존 페이지 문구 조회 실패', error);
    }
  }
  const content = selectRefundPolicyContent(published, settings);
  return (
    <StaticLegalDocument
      document={content}
      showCompany={content.companyBoxVisible}
      showAppendixNote={false}
      cmsManagedKey={managed ? 'refund-policy' : undefined}
    />
  );
}
