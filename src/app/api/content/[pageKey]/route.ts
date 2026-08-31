import { NextResponse } from 'next/server';
import { getCmsPageDefinition } from '@/lib/cms/pageDefinitions';
import { getPublishedPageContent } from '@/lib/cms/content';
import { logServerError } from '@/lib/logServerError';

interface Context {
  params: Promise<{ pageKey: string }>;
}

export async function GET(_request: Request, context: Context) {
  const { pageKey } = await context.params;
  if (!getCmsPageDefinition(pageKey)) {
    return NextResponse.json({ error: 'not-found' }, { status: 404 });
  }
  try {
    const content = await getPublishedPageContent(pageKey);
    return NextResponse.json(
      { content },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
    );
  } catch (error) {
    logServerError(`[GET /api/content/${pageKey}] 공개 콘텐츠 조회 실패`, error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}

