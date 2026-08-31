import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { getCmsPageDefinition } from '@/lib/cms/pageDefinitions';
import { normalizeCmsPageContent } from '@/lib/cms/content';
import {
  CmsRevisionConflictError,
  getCmsPageVersionContent,
  getCmsPageState,
  listCmsPageVersions,
  publishCmsPage,
  saveCmsPageDraft,
} from '@/lib/cms/repo';
import { EXPIRE_PUBLIC_READ_CACHE, PUBLIC_READ_CACHE_TAGS } from '@/lib/public-read-cache';
import { logServerError } from '@/lib/logServerError';

interface Context {
  params: Promise<{ pageKey: string }>;
}

function readRevision(body: unknown): number | null {
  if (!body || typeof body !== 'object') return null;
  const value = (body as { expectedRevision?: unknown }).expectedRevision;
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null;
}

function readSourceRevision(body: unknown): number | null {
  if (!body || typeof body !== 'object') return null;
  const value = (body as { sourceRevision?: unknown }).sourceRevision;
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null;
}

function conflict() {
  return NextResponse.json(
    { error: 'revision-conflict', message: '다른 관리자가 먼저 수정했습니다. 새로고침 후 다시 시도해 주세요.' },
    { status: 409 },
  );
}

export async function GET(_request: Request, context: Context) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  const { pageKey } = await context.params;
  const definition = getCmsPageDefinition(pageKey);
  if (!definition) return NextResponse.json({ error: 'not-found' }, { status: 404 });

  try {
    const page = await getCmsPageState<unknown>(pageKey);
    if (!page) return NextResponse.json({ error: 'not-found' }, { status: 404 });
    const versions = await listCmsPageVersions(pageKey);
    return NextResponse.json({
      definition,
      content: normalizeCmsPageContent(definition, page.draftContent),
      draftRevision: page.draftRevision,
      publishedRevision: page.publishedRevision,
      publishedAt: page.publishedAt,
      hasUnpublishedChanges: page.draftRevision !== page.publishedRevision,
      versions,
    });
  } catch (error) {
    logServerError(`[GET /api/admin/settings/pages/${pageKey}] 조회 실패`, error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}

export async function PUT(request: Request, context: Context) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  const { pageKey } = await context.params;
  const definition = getCmsPageDefinition(pageKey);
  if (!definition) return NextResponse.json({ error: 'not-found' }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }
  const expectedRevision = readRevision(body);
  const sourceRevision = readSourceRevision(body);
  if (expectedRevision === null || sourceRevision === null) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  try {
    const previousContent = await getCmsPageVersionContent<unknown>(pageKey, sourceRevision);
    if (!previousContent) return NextResponse.json({ error: 'version-not-found' }, { status: 404 });
    const content = normalizeCmsPageContent(definition, previousContent);
    const page = await saveCmsPageDraft({
      pageKey,
      content,
      expectedRevision,
      actorId: admin.requester.id,
    });
    return NextResponse.json({ ok: true, content, draftRevision: page.draftRevision });
  } catch (error) {
    if (error instanceof CmsRevisionConflictError) return conflict();
    logServerError(`[PUT /api/admin/settings/pages/${pageKey}] 이전 게시본 불러오기 실패`, error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: Context) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  const { pageKey } = await context.params;
  const definition = getCmsPageDefinition(pageKey);
  if (!definition) return NextResponse.json({ error: 'not-found' }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }
  const revision = readRevision(body);
  if (revision === null || !body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  try {
    const content = normalizeCmsPageContent(
      definition,
      (body as { content?: unknown }).content,
    );
    const page = await saveCmsPageDraft({
      pageKey,
      content,
      expectedRevision: revision,
      actorId: admin.requester.id,
    });
    return NextResponse.json({ ok: true, content, draftRevision: page.draftRevision });
  } catch (error) {
    if (error instanceof CmsRevisionConflictError) return conflict();
    logServerError(`[PATCH /api/admin/settings/pages/${pageKey}] 저장 실패`, error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}

export async function POST(request: Request, context: Context) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  const { pageKey } = await context.params;
  const definition = getCmsPageDefinition(pageKey);
  if (!definition) return NextResponse.json({ error: 'not-found' }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }
  const revision = readRevision(body);
  if (revision === null) return NextResponse.json({ error: 'invalid-input' }, { status: 400 });

  try {
    const published = await publishCmsPage({
      pageKey,
      expectedRevision: revision,
      actorId: admin.requester.id,
    });
    revalidateTag(PUBLIC_READ_CACHE_TAGS.cmsPages, EXPIRE_PUBLIC_READ_CACHE);
    revalidatePath(definition.route === '/_site-shell' ? '/' : definition.route);
    if (pageKey === 'site-shell') revalidatePath('/', 'layout');
    return NextResponse.json({ ok: true, ...published });
  } catch (error) {
    if (error instanceof CmsRevisionConflictError) return conflict();
    logServerError(`[POST /api/admin/settings/pages/${pageKey}] 게시 실패`, error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
