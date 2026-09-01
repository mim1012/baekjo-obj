import { notFound } from 'next/navigation';
import ManagedLegalDocument, { type ManagedLegalContent } from '@/components/legal/ManagedLegalDocument';
import { getPublishedPageContent } from '@/lib/cms/content';
import type { SiteShellContent } from '@/components/providers/PublicSiteContentProvider';

export const metadata = {
  title: '개인정보 처리방침 | 백조오브제',
  description: '백조오브제 개인정보 처리방침입니다.',
};

export default async function PrivacyPage() {
  const [document, shell] = await Promise.all([
    getPublishedPageContent<ManagedLegalContent>('privacy'),
    getPublishedPageContent<SiteShellContent & Record<string, unknown>>('site-shell'),
  ]);
  if (!document.visible) notFound();
  return <ManagedLegalDocument document={document} company={shell.company} />;
}
