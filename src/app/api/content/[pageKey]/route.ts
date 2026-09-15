import { NextResponse } from 'next/server';
import { getPublishedPageContent } from '@/lib/cms/content';
import { getCmsPageDefinition } from '@/lib/cms/pageDefinitions';
import { logServerError } from '@/lib/logServerError';

interface Context {
  readonly params: Promise<{ readonly pageKey: string }>;
}

export async function GET(_request: Request, context: Context) {
  const { pageKey } = await context.params;
  const definition = getCmsPageDefinition(pageKey);
  if (!definition) return NextResponse.json({ error: 'not-found' }, { status: 404 });

  try {
    const content = await getPublishedPageContent(pageKey);
    if (!content) return NextResponse.json({ error: 'not-found' }, { status: 404 });
    return NextResponse.json(
      { content },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    logServerError(`[GET /api/content/${pageKey}] 공개 CMS 조회 실패`, error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
