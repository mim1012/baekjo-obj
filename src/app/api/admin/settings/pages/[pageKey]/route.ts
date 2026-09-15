import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { isCmsContentInput, normalizeCmsPageContent } from '@/lib/cms/content';
import { getCmsPageDefinition } from '@/lib/cms/pageDefinitions';
import {
  CmsRevisionConflictError,
  getCmsPageState,
  getPublishedCmsPage,
  listCmsPageVersions,
  publishCmsPage,
  restoreCmsPageVersionDraft,
  saveCmsPageDraft,
} from '@/lib/cms/repo';
import { logServerError } from '@/lib/logServerError';

interface Context {
  readonly params: Promise<{ readonly pageKey: string }>;
}

function readRevision(body: unknown): number | null {
  if (!body || typeof body !== 'object') return null;
  const value = (body as { readonly expectedRevision?: unknown }).expectedRevision;
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null;
}

function readSourceRevision(body: unknown): number | null {
  if (!body || typeof body !== 'object') return null;
  const value = (body as { readonly sourceRevision?: unknown }).sourceRevision;
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null;
}

function conflict() {
  return NextResponse.json(
    { error: 'revision-conflict', message: '다른 관리자가 먼저 수정했습니다. 새로고침 후 다시 시도해 주세요.' },
    { status: 409 },
  );
}

function revalidateCmsRoute(pageKey: string, route: string): void {
  revalidatePath(route === '/_site-shell' ? '/' : route);
  if (pageKey === 'site-shell') revalidatePath('/', 'layout');
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
  const expectedRevision = readRevision(body);
  const contentInput = body && typeof body === 'object'
    ? (body as { readonly content?: unknown }).content
    : undefined;
  if (expectedRevision === null || !isCmsContentInput(contentInput)) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  try {
    const content = normalizeCmsPageContent(definition, contentInput);
    const page = await saveCmsPageDraft({
      pageKey,
      content,
      expectedRevision,
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
  const expectedRevision = readRevision(body);
  if (expectedRevision === null) return NextResponse.json({ error: 'invalid-input' }, { status: 400 });

  try {
    if (await getPublishedCmsPage(pageKey) === null) {
      return NextResponse.json({ error: 'initial-import-required' }, { status: 409 });
    }
    const published = await publishCmsPage({
      pageKey,
      expectedRevision,
      actorId: admin.requester.id,
    });
    revalidateCmsRoute(pageKey, definition.route);
    return NextResponse.json({ ok: true, ...published });
  } catch (error) {
    if (error instanceof CmsRevisionConflictError) return conflict();
    logServerError(`[POST /api/admin/settings/pages/${pageKey}] 게시 실패`, error);
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
    const page = await restoreCmsPageVersionDraft<unknown>({
      pageKey,
      sourceRevision,
      expectedRevision,
      actorId: admin.requester.id,
    });
    if (!page) return NextResponse.json({ error: 'version-not-found' }, { status: 404 });
    return NextResponse.json({
      ok: true,
      content: normalizeCmsPageContent(definition, page.draftContent),
      draftRevision: page.draftRevision,
    });
  } catch (error) {
    if (error instanceof CmsRevisionConflictError) return conflict();
    logServerError(`[PUT /api/admin/settings/pages/${pageKey}] 이전 게시본 불러오기 실패`, error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
