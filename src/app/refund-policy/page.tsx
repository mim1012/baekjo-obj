import { notFound } from 'next/navigation';
import ManagedLegalDocument, { type ManagedLegalContent } from '@/components/legal/ManagedLegalDocument';
import { getPublishedPageContent } from '@/lib/cms/content';
import type { SiteShellContent } from '@/components/providers/PublicSiteContentProvider';

export const metadata = {
  title: '배송·교환·환불 안내 | 백조오브제',
  description: '백조오브제 상품 배송, 교환, 반품, 환불 기준입니다.',
};

export default async function RefundPolicyPage() {
  const [document, shell] = await Promise.all([
    getPublishedPageContent<ManagedLegalContent>('refund-policy'),
    getPublishedPageContent<SiteShellContent & Record<string, unknown>>('site-shell'),
  ]);
  if (!document.visible) notFound();
  return <ManagedLegalDocument document={document} company={shell.company} />;
}
