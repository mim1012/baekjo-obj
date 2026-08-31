import { notFound } from 'next/navigation';
import ManagedLegalDocument, { type ManagedLegalContent } from '@/components/legal/ManagedLegalDocument';
import { getPublishedPageContent } from '@/lib/cms/content';
import type { SiteShellContent } from '@/components/providers/PublicSiteContentProvider';

export const metadata = {
  title: '이용약관 | 백조오브제',
  description: '백조오브제 전자상거래 이용약관입니다.',
};

export default async function TermsPage() {
  const [document, shell] = await Promise.all([
    getPublishedPageContent<ManagedLegalContent>('terms'),
    getPublishedPageContent<SiteShellContent & Record<string, unknown>>('site-shell'),
  ]);
  if (!document.visible) notFound();
  return <ManagedLegalDocument document={document} company={shell.company} />;
}
