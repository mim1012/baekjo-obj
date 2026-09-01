import { redirect } from 'next/navigation';
import { getPublishedPageContent } from '@/lib/cms/content';
import type { SiteShellContent } from '@/components/providers/PublicSiteContentProvider';

export default async function InsuranceLayout({ children }: { children: React.ReactNode }) {
  const shell = await getPublishedPageContent<SiteShellContent & Record<string, unknown>>('site-shell');
  if (!shell.features.insurance) redirect('/');
  return children;
}
