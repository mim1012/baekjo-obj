import StaticLegalDocument from '@/components/legal/StaticLegalDocument';
import { defaultPageTextSettings } from '@/data/pageTextContent';
import { getPublishedPageContent } from '@/lib/cms/content';
import { logServerError } from '@/lib/logServerError';
import { getCachedPageTextSettings } from '@/lib/public-read-cache';
import { selectPrivacyContent, type PrivacyContent } from '@/lib/cms/source/privacy';

export const metadata = {
  title: '개인정보 처리방침 | 백조오브제',
  description: '백조오브제 개인정보 처리방침입니다.',
};

export default async function PrivacyPage() {
  const published = await getPublishedPageContent<PrivacyContent>('privacy').catch((error: unknown) => {
    logServerError('[Privacy] CMS 조회 실패', error);
    return null;
  });
  const managed = published !== null;
  let settings = defaultPageTextSettings;
  if (!managed) {
    try {
      settings = (await getCachedPageTextSettings()) ?? defaultPageTextSettings;
    } catch (error) {
      logServerError('[Privacy] 기존 페이지 문구 조회 실패', error);
    }
  }
  const content = selectPrivacyContent(published, settings);
  return (
    <StaticLegalDocument
      document={content}
      showCompany={content.companyBoxVisible}
      cmsManagedKey={managed ? 'privacy' : undefined}
    />
  );
}
