import 'server-only';
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
  const { data, error } = await getSupabase().rpc('publish_audit_cms_from_source', {
    p_expected_revision: input.expectedRevision,
    p_expected_source_value: input.sourceValue,
    p_expected_source_updated_at: input.sourceUpdatedAt,
    p_actor: input.actorId,
  });
  if (error) {
    if (error.code === '40001') throw new AuditImportConflictError();
    throw error;
  }
  const result: unknown = Array.isArray(data) ? data[0] : data;
  if (!isRecord(result)) throw new Error('audit-import-invalid-result');
  const publishedRevision = Number(result.published_revision);
  if (!Number.isSafeInteger(publishedRevision) || publishedRevision !== input.expectedRevision
    || typeof result.published_at !== 'string') throw new Error('audit-import-invalid-result');
  return { publishedRevision, publishedAt: result.published_at };
}
