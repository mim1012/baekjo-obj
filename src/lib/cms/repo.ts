import 'server-only';
import { getSupabase } from '@/lib/supabase/server';

export interface CmsPageState<T> {
  pageKey: string;
  route: string;
  title: string;
  draftContent: T;
  publishedContent: T | null;
  draftRevision: number;
  publishedRevision: number | null;
  updatedAt: string;
  publishedAt: string | null;
}

export interface CmsPageVersionSummary {
  revision: number;
  publishedAt: string;
}

interface CmsPageRow {
  page_key: string;
  route: string;
  title: string;
  draft_content: unknown;
  published_content: unknown | null;
  draft_revision: number;
  published_revision: number | null;
  updated_at: string;
  published_at: string | null;
}

function rowToState<T>(row: CmsPageRow): CmsPageState<T> {
  return {
    pageKey: row.page_key,
    route: row.route,
    title: row.title,
    draftContent: row.draft_content as T,
    publishedContent: row.published_content as T | null,
    draftRevision: Number(row.draft_revision),
    publishedRevision: row.published_revision === null ? null : Number(row.published_revision),
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  };
}

const CMS_PAGE_COLUMNS =
  'page_key, route, title, draft_content, published_content, draft_revision, published_revision, updated_at, published_at';

/** 0148 적용 전에는 Postgres와 PostgREST가 서로 다른 코드로 "CMS 표 없음"을 알릴 수 있다. */
export function isCmsSchemaUnavailable(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === '42P01' || code === 'PGRST205';
}

export class CmsRevisionConflictError extends Error {
  constructor() {
    super('cms-revision-conflict');
    this.name = 'CmsRevisionConflictError';
  }
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
    .maybeSingle();
  if (error) throw error;
  return data?.published_content ? (data.published_content as T) : null;
}

export async function listCmsPageVersions(pageKey: string, limit = 10): Promise<CmsPageVersionSummary[]> {
  const { data, error } = await getSupabase()
    .from('cms_page_versions')
    .select('revision, published_at')
    .eq('page_key', pageKey)
    .order('published_at', { ascending: false })
    .limit(Math.max(1, Math.min(limit, 30)));
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
  return data ? data.content as T : null;
}

export async function saveCmsPageDraft<T>(input: {
  pageKey: string;
  content: T;
  expectedRevision: number;
  actorId: string;
}): Promise<CmsPageState<T>> {
  const nextRevision = input.expectedRevision + 1;
  const now = new Date().toISOString();
  const { data, error } = await getSupabase()
    .from('cms_pages')
    .update({
      draft_content: input.content,
      draft_revision: nextRevision,
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
  pageKey: string;
  expectedRevision: number;
  actorId: string;
}): Promise<{ publishedRevision: number; publishedAt: string }> {
  const { data, error } = await getSupabase().rpc('publish_cms_page', {
    p_page_key: input.pageKey,
    p_expected_revision: input.expectedRevision,
    p_actor: input.actorId,
  });
  if (error) {
    if (error.code === '40001' || error.message.includes('cms-revision-conflict')) {
      throw new CmsRevisionConflictError();
    }
    throw error;
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('cms-publish-no-result');
  return {
    publishedRevision: Number(row.published_revision),
    publishedAt: String(row.published_at),
  };
}
