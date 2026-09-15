import 'server-only';
import { normalizePageTextSettings, pageTextDefinitions } from '@/data/pageTextContent';
import { auditContentFromPageTexts } from '@/components/admin-new/pages/auditContent';
import { normalizeCmsPageContent } from '@/lib/cms/normalize';
import { getCmsPageDefinition } from '@/lib/cms/pageDefinitions';
import { getCmsSourceBuilder, type CmsSourceRow } from '@/lib/cms/source/registry';
import { getSupabase } from '@/lib/supabase/server';

export interface AuditImportInput {
  readonly expectedRevision: number;
  readonly sourceValue: Record<string, unknown>;
  readonly sourceUpdatedAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function parseAuditImportInput(value: unknown): AuditImportInput | null {
  if (!isRecord(value)) return null;
  const { expectedRevision, sourceValue, sourceUpdatedAt } = value;
  if (typeof expectedRevision !== 'number' || !Number.isSafeInteger(expectedRevision) || expectedRevision <= 0) return null;
  if (!isRecord(sourceValue) || !isRecord(sourceValue.values)) return null;
  const fields = pageTextDefinitions.find((page) => page.id === 'audit')?.fields;
  if (!fields || Object.entries(sourceValue.values).some(([key, text]) =>
    key.startsWith('audit.') && (typeof text !== 'string' || !fields.some((field) => key === `audit.${field.id}`)))) return null;
  if (typeof sourceUpdatedAt !== 'string'
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(sourceUpdatedAt)
    || !Number.isFinite(Date.parse(sourceUpdatedAt))) return null;
  return { expectedRevision, sourceValue, sourceUpdatedAt };
}

export class AuditImportConflictError extends Error {
  constructor() {
    super('audit-import-source-or-revision-conflict');
    this.name = 'AuditImportConflictError';
  }
}

export async function publishAuditCmsFromSource(input: AuditImportInput & { readonly actorId: string }) {
  const definition = getCmsPageDefinition('audit');
  if (!definition) throw new Error('audit-definition-missing');
  const expectedContent = normalizeCmsPageContent(
    definition,
    auditContentFromPageTexts(normalizePageTextSettings(input.sourceValue)),
  );
  const { data, error } = await getSupabase().rpc('publish_audit_cms_from_source', {
    p_expected_revision: input.expectedRevision,
    p_expected_source_value: input.sourceValue,
    p_expected_source_updated_at: input.sourceUpdatedAt,
    p_actor: input.actorId,
    p_expected_content: expectedContent,
  });
  if (error) {
    if (error.code === 'PT409' || error.code === '40001') throw new AuditImportConflictError();
    throw error;
  }
  const result: unknown = Array.isArray(data) ? data[0] : data;
  if (!isRecord(result)) throw new Error('audit-import-invalid-result');
  const publishedRevision = Number(result.published_revision);
  if (!Number.isSafeInteger(publishedRevision) || publishedRevision !== input.expectedRevision
    || typeof result.published_at !== 'string') throw new Error('audit-import-invalid-result');
  return { publishedRevision, publishedAt: result.published_at };
}

export interface PublishCmsPageFromSourceInput {
  readonly pageKey: string;
  readonly expectedRevision: number;
  /** builder.siteSettingIds에 대응하는 잠긴 site_settings 행 스냅샷(값+갱신시각). */
  readonly sources: Record<string, CmsSourceRow>;
  readonly actorId: string;
}

export class CmsSourceImportConflictError extends Error {
  constructor() {
    super('cms-source-or-revision-conflict');
    this.name = 'CmsSourceImportConflictError';
  }
}

/**
 * audit 이외 페이지를 포함한 범용 소스 결속 활성화(D1). 콘텐츠는 항상 서버가 현재 등록된
 * 소스 매퍼(getCmsSourceBuilder)로 계산한다 — 클라이언트가 보낸 content는 절대 신뢰하지 않는다.
 * publishAuditCmsFromSource(위)는 기존 /audit/import-publish 계약을 위해 그대로 남긴다(D2).
 */
export async function publishCmsPageFromSource(input: PublishCmsPageFromSourceInput) {
  const definition = getCmsPageDefinition(input.pageKey);
  if (!definition) throw new Error('cms-source-import-definition-missing');
  const builder = getCmsSourceBuilder(input.pageKey);
  if (!builder) throw new Error('cms-source-import-mapper-missing');

  const expectedContent = normalizeCmsPageContent(definition, builder.build(input.sources));
  const { data, error } = await getSupabase().rpc('publish_cms_page_from_source', {
    p_page_key: input.pageKey,
    p_expected_revision: input.expectedRevision,
    p_expected_sources: input.sources,
    p_actor: input.actorId,
    p_expected_content: expectedContent,
  });
  if (error) {
    if (error.code === 'PT409' || error.code === '40001') throw new CmsSourceImportConflictError();
    throw error;
  }
  const result: unknown = Array.isArray(data) ? data[0] : data;
  if (!isRecord(result)) throw new Error('cms-source-import-invalid-result');
  const publishedRevision = Number(result.published_revision);
  if (!Number.isSafeInteger(publishedRevision) || publishedRevision !== input.expectedRevision
    || typeof result.published_at !== 'string') throw new Error('cms-source-import-invalid-result');
  return { publishedRevision, publishedAt: result.published_at };
}
