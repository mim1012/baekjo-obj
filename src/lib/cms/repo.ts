import 'server-only';
import { getSupabase } from '@/lib/supabase/server';

export const CMS_MANAGED_VERSION = 1;

export interface CmsPageState<T> {
  readonly pageKey: string;
  readonly route: string;
  readonly title: string;
  readonly draftContent: T;
  readonly publishedContent: T | null;
  readonly draftRevision: number;
  readonly publishedRevision: number | null;
  readonly updatedAt: string;
  readonly publishedAt: string | null;
}

export interface CmsPageVersionSummary {
  readonly revision: number;
  readonly publishedAt: string;
}

interface CmsPageRow {
  readonly page_key: string;
  readonly route: string;
  readonly title: string;
  readonly draft_content: unknown;
  readonly published_content: unknown | null;
  readonly draft_revision: number | string;
  readonly published_revision: number | string | null;
  readonly updated_at: string;
  readonly published_at: string | null;
}

interface PublishResultRow {
  readonly published_revision: number | string;
  readonly published_at: string;
}

const CMS_PAGE_COLUMNS =
  'page_key, route, title, draft_content, published_content, draft_revision, published_revision, updated_at, published_at';

export class CmsRevisionConflictError extends Error {
  constructor() {
    super('cms-revision-conflict');
    this.name = 'CmsRevisionConflictError';
  }
}

export function isCmsSchemaUnavailable(error: unknown): boolean {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : null;
  return code === '42P01' || code === '42883' || code === 'PGRST202' || code === 'PGRST205';
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stripManagedMarker<T>(value: T): T {
  if (!isObject(value) || value.__managedVersion !== CMS_MANAGED_VERSION) return value;
  const { __managedVersion: _managedVersion, ...content } = value;
  return content as T;
}

function rowToState<T>(row: CmsPageRow): CmsPageState<T> {
  return {
    pageKey: row.page_key,
    route: row.route,
    title: row.title,
    draftContent: row.draft_content as T,
    publishedContent: row.published_content === null ? null : stripManagedMarker(row.published_content as T),
    draftRevision: Number(row.draft_revision),
    publishedRevision: row.published_revision === null ? null : Number(row.published_revision),
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  };
}

function isRevisionConflict(error: unknown): boolean {
  if (error instanceof CmsRevisionConflictError) return true;
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? error.code : null;
  const message = 'message' in error ? error.message : null;
  return code === '40001' || (typeof message === 'string' && message.includes('cms-revision-conflict'));
}

export async function getCmsPageState<T>(pageKey: string): Promise<CmsPageState<T> | null> {
  const { data, error } = await getSupabase()
    .from('cms_pages')
    .select(CMS_PAGE_COLUMNS)
    .eq('page_key', pageKey)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToState<T>(data as CmsPageRow) : null;
}

export async function listCmsPageStates(): Promise<CmsPageState<unknown>[]> {
  const { data, error } = await getSupabase()
    .from('cms_pages')
    .select(CMS_PAGE_COLUMNS)
    .order('title', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => rowToState<unknown>(row as CmsPageRow));
}

export async function getPublishedCmsPage<T>(pageKey: string): Promise<T | null> {
  const { data, error } = await getSupabase()
    .from('cms_pages')
    .select('published_content')
    .eq('page_key', pageKey)
    .not('published_content', 'is', null)
    .maybeSingle();
  if (error) throw error;
  const content = data?.published_content;
  if (!isObject(content) || content.__managedVersion !== CMS_MANAGED_VERSION) return null;
  return stripManagedMarker(content as T);
}

export async function listCmsPageVersions(pageKey: string, limit = 10): Promise<CmsPageVersionSummary[]> {
  const boundedLimit = Math.max(1, Math.min(limit, 30));
  const { data, error } = await getSupabase()
    .from('cms_page_versions')
    .select('revision, published_at')
    .eq('page_key', pageKey)
    .order('published_at', { ascending: false })
    .limit(boundedLimit);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    revision: Number(row.revision),
    publishedAt: String(row.published_at),
  }));
}

export async function getCmsPageVersionContent<T>(pageKey: string, revision: number): Promise<T | null> {
  const { data, error } = await getSupabase()
    .from('cms_page_versions')
    .select('content')
    .eq('page_key', pageKey)
    .eq('revision', revision)
    .maybeSingle();
  if (error) throw error;
  return data ? stripManagedMarker(data.content as T) : null;
}

export async function saveCmsPageDraft<T>(input: {
  readonly pageKey: string;
  readonly content: T;
  readonly expectedRevision: number;
  readonly actorId: string;
}): Promise<CmsPageState<T>> {
  const now = new Date().toISOString();
  const { data, error } = await getSupabase()
    .from('cms_pages')
    .update({
      draft_content: input.content,
      draft_revision: input.expectedRevision + 1,
      updated_by: input.actorId,
      updated_at: now,
    })
    .eq('page_key', input.pageKey)
    .eq('draft_revision', input.expectedRevision)
    .select(CMS_PAGE_COLUMNS)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new CmsRevisionConflictError();
  return rowToState<T>(data as CmsPageRow);
}

export async function publishCmsPage(input: {
  readonly pageKey: string;
  readonly expectedRevision: number;
  readonly actorId: string;
}): Promise<{ readonly publishedRevision: number; readonly publishedAt: string }> {
  const { data, error } = await getSupabase().rpc('publish_cms_page', {
    p_page_key: input.pageKey,
    p_expected_revision: input.expectedRevision,
    p_actor: input.actorId,
  });
  if (error) {
    if (isRevisionConflict(error)) throw new CmsRevisionConflictError();
    throw error;
  }
  const rows = Array.isArray(data) ? data as readonly PublishResultRow[] : [data as PublishResultRow | null];
  const row = rows[0];
  if (!row) throw new Error('cms-publish-no-result');
  return {
    publishedRevision: Number(row.published_revision),
    publishedAt: String(row.published_at),
  };
}

export async function restoreCmsPageVersionDraft<T>(input: {
  readonly pageKey: string;
  readonly sourceRevision: number;
  readonly expectedRevision: number;
  readonly actorId: string;
}): Promise<CmsPageState<T> | null> {
  const content = await getCmsPageVersionContent<T>(input.pageKey, input.sourceRevision);
  if (!content) return null;
  return saveCmsPageDraft({
    pageKey: input.pageKey,
    content,
    expectedRevision: input.expectedRevision,
    actorId: input.actorId,
  });
}
