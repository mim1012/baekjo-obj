import StaticLegalDocument from '@/components/legal/StaticLegalDocument';
import { defaultPageTextSettings } from '@/data/pageTextContent';
import { getPublishedPageContent } from '@/lib/cms/content';
import { logServerError } from '@/lib/logServerError';
import { getCachedPageTextSettings } from '@/lib/public-read-cache';
import { selectTermsContent, type TermsContent } from '@/lib/cms/source/terms';

export const metadata = {
  title: '이용약관 | 백조오브제',
  description: '백조오브제 전자상거래 이용약관입니다.',
};

export default async function TermsPage() {
  const published = await getPublishedPageContent<TermsContent>('terms').catch((error: unknown) => {
    logServerError('[Terms] CMS 조회 실패', error);
    return null;
  });
  const managed = published !== null;
  let settings = defaultPageTextSettings;
  if (!managed) {
    try {
      settings = (await getCachedPageTextSettings()) ?? defaultPageTextSettings;
    } catch (error) {
      logServerError('[Terms] 기존 페이지 문구 조회 실패', error);
    }
  }
  const content = selectTermsContent(published, settings);
  return (
    <StaticLegalDocument
      document={content}
      showCompany={content.companyBoxVisible}
      cmsManagedKey={managed ? 'terms' : undefined}
    />
  );
}
