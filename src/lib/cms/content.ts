import 'server-only';
import { isCmsSchemaUnavailable } from '@/lib/cms/repo';
import { getCmsPageDefinition } from '@/lib/cms/pageDefinitions';
import { normalizeCmsPageContent } from '@/lib/cms/normalize';
import { cachedPublishedCmsPage } from '@/lib/public-read-cache';

export { isCmsContentInput, normalizeCmsPageContent } from '@/lib/cms/normalize';

export async function getPublishedPageContent<T extends Record<string, unknown>>(
  pageKey: string,
): Promise<T | null> {
  const definition = getCmsPageDefinition(pageKey);
  if (!definition) return null;
  try {
    const published = await cachedPublishedCmsPage(pageKey);
    return published ? normalizeCmsPageContent(definition, published) as T : null;
  } catch (error) {
    if (!isCmsSchemaUnavailable(error)) throw error;
    return null;
  }
}
