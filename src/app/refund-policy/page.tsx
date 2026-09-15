import StaticLegalDocument from '@/components/legal/StaticLegalDocument';
import { getPublishedPageContent } from '@/lib/cms/content';
import { logServerError } from '@/lib/logServerError';
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
  const content = selectRefundPolicyContent(published);
  return (
    <StaticLegalDocument
      document={content}
      showCompany={content.companyBoxVisible}
      showAppendixNote={false}
      cmsManagedKey={managed ? 'refund-policy' : undefined}
    />
  );
}
