import 'server-only';
import { getSupabase } from '@/lib/supabase/server';
import { defaultHomeSettings } from '@/data/homeContent';
import { getCmsPageDefinition, CMS_PAGE_DEFINITIONS } from '@/lib/cms/pageDefinitions';
import {
  createCmsCompatibilityEnvelope,
  parseCmsCompatibilityEnvelope,
  publishCmsCompatibilityDraft,
  saveCmsCompatibilityDraft,
  type CmsCompatibilityEnvelope,
} from '@/lib/cms/compatibility';

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

interface CompatibilityRow {
  id: string;
  value: unknown;
  updated_at: string;
}

interface CompatibilityPage {
  envelope: CmsCompatibilityEnvelope;
  rowUpdatedAt: string | null;
  route: string;
  title: string;
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
  return code === '42P01' || code === '42883' || code === 'PGRST202' || code === 'PGRST205';
}

export class CmsRevisionConflictError extends Error {
  constructor() {
    super('cms-revision-conflict');
    this.name = 'CmsRevisionConflictError';
  }
}

const COMPATIBILITY_ROW_PREFIX = 'cms-page:';

function compatibilityMetadata(pageKey: string): { route: string; title: string; defaultContent: unknown } | null {
  if (pageKey === 'home') {
    return { route: '/', title: '홈 화면', defaultContent: defaultHomeSettings };
  }
  const definition = getCmsPageDefinition(pageKey);
  return definition
    ? { route: definition.route, title: definition.title, defaultContent: definition.defaultContent }
    : null;
}

function compatibilityRowId(pageKey: string): string {
  return `${COMPATIBILITY_ROW_PREFIX}${pageKey}`;
}

async function getCompatibilitySeed(pageKey: string, defaultContent: unknown): Promise<unknown> {
  if (pageKey !== 'home') return defaultContent;
  const { data, error } = await getSupabase()
    .from('site_settings')
    .select('value')
    .eq('id', 'home')
    .maybeSingle();
  if (error) throw error;
  return data?.value ?? defaultContent;
}

async function readCompatibilityPage(pageKey: string): Promise<CompatibilityPage | null> {
  const metadata = compatibilityMetadata(pageKey);
  if (!metadata) return null;
  const { data, error } = await getSupabase()
    .from('site_settings')
    .select('id, value, updated_at')
    .eq('id', compatibilityRowId(pageKey))
    .maybeSingle();
  if (error) throw error;

  const row = data as CompatibilityRow | null;
  const stored = row ? parseCmsCompatibilityEnvelope(row.value) : null;
  const seedContent = stored ? null : await getCompatibilitySeed(pageKey, metadata.defaultContent);
  return {
    envelope: stored ?? createCmsCompatibilityEnvelope(seedContent, row?.updated_at ?? new Date().toISOString()),
    rowUpdatedAt: row?.updated_at ?? null,
    route: metadata.route,
    title: metadata.title,
  };
}

function compatibilityToState<T>(pageKey: string, page: CompatibilityPage): CmsPageState<T> {
  return {
    pageKey,
    route: page.route,
    title: page.title,
    draftContent: page.envelope.draftContent as T,
    publishedContent: page.envelope.publishedContent as T | null,
    draftRevision: page.envelope.draftRevision,
    publishedRevision: page.envelope.publishedRevision,
    updatedAt: page.envelope.updatedAt,
    publishedAt: page.envelope.publishedAt,
  };
}

async function writeCompatibilityPage(
  pageKey: string,
  page: CompatibilityPage,
  envelope: CmsCompatibilityEnvelope,
): Promise<void> {
  const row = {
    id: compatibilityRowId(pageKey),
    value: envelope,
    updated_at: envelope.updatedAt,
  };
  if (page.rowUpdatedAt === null) {
    const { error } = await getSupabase().from('site_settings').insert(row);
    if (error) {
      if (error.code === '23505') throw new CmsRevisionConflictError();
      throw error;
    }
    return;
  }

  const { data, error } = await getSupabase()
    .from('site_settings')
    .update({ value: envelope, updated_at: envelope.updatedAt })
    .eq('id', compatibilityRowId(pageKey))
    .eq('updated_at', page.rowUpdatedAt)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new CmsRevisionConflictError();
}

export async function getCmsPageState<T>(pageKey: string): Promise<CmsPageState<T> | null> {
  try {
    const { data, error } = await getSupabase()
      .from('cms_pages')
      .select(CMS_PAGE_COLUMNS)
      .eq('page_key', pageKey)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToState<T>(data as CmsPageRow) : null;
  } catch (error) {
    if (!isCmsSchemaUnavailable(error)) throw error;
    const page = await readCompatibilityPage(pageKey);
    return page ? compatibilityToState<T>(pageKey, page) : null;
  }
}

export async function listCmsPageStates(): Promise<CmsPageState<unknown>[]> {
  try {
    const { data, error } = await getSupabase()
      .from('cms_pages')
      .select(CMS_PAGE_COLUMNS)
      .order('title', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row) => rowToState<unknown>(row as CmsPageRow));
  } catch (error) {
    if (!isCmsSchemaUnavailable(error)) throw error;
    const pages = await Promise.all(CMS_PAGE_DEFINITIONS.map(async (definition) => {
      const page = await readCompatibilityPage(definition.key);
      return page ? compatibilityToState<unknown>(definition.key, page) : null;
    }));
    return pages.filter((page): page is CmsPageState<unknown> => page !== null);
  }
}

export async function getPublishedCmsPage<T>(pageKey: string): Promise<T | null> {
  try {
    const { data, error } = await getSupabase()
      .from('cms_pages')
      .select('published_content')
      .eq('page_key', pageKey)
      .maybeSingle();
    if (error) throw error;
    return data?.published_content ? (data.published_content as T) : null;
  } catch (error) {
    if (!isCmsSchemaUnavailable(error)) throw error;
    const page = await readCompatibilityPage(pageKey);
    return page?.envelope.publishedContent
      ? page.envelope.publishedContent as T
      : null;
  }
}

export async function listCmsPageVersions(pageKey: string, limit = 10): Promise<CmsPageVersionSummary[]> {
  try {
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
  } catch (error) {
    if (!isCmsSchemaUnavailable(error)) throw error;
    const page = await readCompatibilityPage(pageKey);
    return (page?.envelope.versions ?? []).slice(0, Math.max(1, Math.min(limit, 30))).map((version) => ({
      revision: version.revision,
      publishedAt: version.publishedAt,
    }));
  }
}

export async function getCmsPageVersionContent<T>(pageKey: string, revision: number): Promise<T | null> {
  try {
    const { data, error } = await getSupabase()
      .from('cms_page_versions')
      .select('content')
      .eq('page_key', pageKey)
      .eq('revision', revision)
      .maybeSingle();
    if (error) throw error;
    return data ? data.content as T : null;
  } catch (error) {
    if (!isCmsSchemaUnavailable(error)) throw error;
    const page = await readCompatibilityPage(pageKey);
    const version = page?.envelope.versions.find((item) => item.revision === revision);
    return version ? version.content as T : null;
  }
}

export async function saveCmsPageDraft<T>(input: {
  pageKey: string;
  content: T;
  expectedRevision: number;
  actorId: string;
}): Promise<CmsPageState<T>> {
  const nextRevision = input.expectedRevision + 1;
  const now = new Date().toISOString();
  try {
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
  } catch (error) {
    if (!isCmsSchemaUnavailable(error)) throw error;
    const page = await readCompatibilityPage(input.pageKey);
    if (!page) throw new Error(`unknown-cms-page:${input.pageKey}`);
    const envelope = saveCmsCompatibilityDraft({
      current: page.envelope,
      expectedRevision: input.expectedRevision,
      content: input.content,
      actorId: input.actorId,
      now,
    });
    if (!envelope) throw new CmsRevisionConflictError();
    await writeCompatibilityPage(input.pageKey, page, envelope);
    return compatibilityToState<T>(input.pageKey, { ...page, envelope, rowUpdatedAt: envelope.updatedAt });
  }
}

export async function publishCmsPage(input: {
  pageKey: string;
  expectedRevision: number;
  actorId: string;
}): Promise<{ publishedRevision: number; publishedAt: string }> {
  try {
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
  } catch (error) {
    if (!isCmsSchemaUnavailable(error)) throw error;
    const page = await readCompatibilityPage(input.pageKey);
    if (!page) throw new Error(`unknown-cms-page:${input.pageKey}`);
    const now = new Date().toISOString();
    const envelope = publishCmsCompatibilityDraft({
      current: page.envelope,
      expectedRevision: input.expectedRevision,
      actorId: input.actorId,
      now,
    });
    if (!envelope) throw new CmsRevisionConflictError();
    await writeCompatibilityPage(input.pageKey, page, envelope);
    return { publishedRevision: envelope.publishedRevision!, publishedAt: now };
  }
}
