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
  /** deriveCmsPageContentFromSources로 계산한 값을 그대로 넘긴다 — 이 함수가 다시 계산하지 않는다
   * (호출부가 같은 콘텐츠를 draft 저장과 RPC 양쪽에 동일 객체로 쓰도록 강제하기 위함). */
  readonly expectedContent: Record<string, unknown>;
  readonly actorId: string;
}

export class CmsSourceImportConflictError extends Error {
  constructor() {
    super('cms-source-or-revision-conflict');
    this.name = 'CmsSourceImportConflictError';
  }
}

/**
 * pageKey의 현재 site_settings 소스로부터 파생되는 CMS 콘텐츠를 계산한다(순수 파생, side effect
 * 없음). 라우트가 saveCmsPageDraft에 쓰는 draft와 publishCmsPageFromSource에 넘기는
 * p_expected_content가 항상 같은 함수로 계산된 동일 객체이도록 강제한다 — 두 곳에서 각자 다시
 * 계산하면 정규화 결과가 미세하게 갈릴 수 있고, 0166의 draft_content == p_expected_content 가드와
 * 어긋난다.
 */
export function deriveCmsPageContentFromSources(
  pageKey: string,
  sources: Record<string, CmsSourceRow>,
): Record<string, unknown> {
  const definition = getCmsPageDefinition(pageKey);
  if (!definition) throw new Error('cms-source-import-definition-missing');
  const builder = getCmsSourceBuilder(pageKey);
  if (!builder) throw new Error('cms-source-import-mapper-missing');
  return normalizeCmsPageContent(definition, builder.build(sources));
}

/**
 * audit 이외 페이지를 포함한 범용 소스 결속 활성화(D1). 콘텐츠는 항상 호출부가
 * deriveCmsPageContentFromSources로 미리 계산해 넘긴다 — 클라이언트가 보낸 content는 절대
 * 신뢰하지 않는다. publishAuditCmsFromSource(위)는 기존 /audit/import-publish 계약을 위해 그대로
 * 남긴다(D2).
 */
export async function publishCmsPageFromSource(input: PublishCmsPageFromSourceInput) {
  const { data, error } = await getSupabase().rpc('publish_cms_page_from_source', {
    p_page_key: input.pageKey,
    p_expected_revision: input.expectedRevision,
    p_expected_sources: input.sources,
    p_actor: input.actorId,
    p_expected_content: input.expectedContent,
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
