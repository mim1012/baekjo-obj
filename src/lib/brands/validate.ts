// 관리자 브랜드 생성/수정 입력 검증. POST/PATCH 라우트가 공유한다.
// id/createdAt은 여기서 받지 않는다(서버 결정, mass-assignment 차단).
import type { Brand, BrandAuditReport } from '@/types';
import type { BrandInsertInput, BrandPatchInput } from '@/lib/brands/repo';

const MAX_NAME = 200;
const MAX_SHORT_TEXT = 100;
const MAX_TEXT = 300;
const MAX_LONG_TEXT = 5000;
const MAX_URL = 500;
const MAX_ARRAY_ITEMS = 50;
const MAX_PROCESS_ITEMS = 30;
const MAX_DISPLAY_ORDER = 100_000;
const AUDIT_GRADES = new Set(['A+', 'A', 'B+', 'B']);

function isStr(v: unknown, min: number, max: number): v is string {
  return typeof v === 'string' && v.length >= min && v.length <= max;
}

function isBool(v: unknown): v is boolean {
  return typeof v === 'boolean';
}

function isStrArray(v: unknown, maxItems: number, maxLen: number): v is string[] {
  if (!Array.isArray(v) || v.length > maxItems) return false;
  return v.every((item) => isStr(item, 0, maxLen));
}

function validateAuditReport(raw: unknown): BrandAuditReport | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (!isStr(r.reportNo, 1, MAX_SHORT_TEXT)) return null;
  if (!isStr(r.auditedAt, 1, MAX_SHORT_TEXT)) return null;
  if (!isStr(r.status, 1, MAX_SHORT_TEXT)) return null;
  if (!isStr(r.headline, 1, MAX_TEXT)) return null;
  if (!isStr(r.summaryTitle, 1, MAX_TEXT)) return null;
  if (!isStr(r.summary, 1, MAX_LONG_TEXT)) return null;
  if (!isStr(r.selectionReason, 1, MAX_LONG_TEXT)) return null;
  if (!isStrArray(r.process, MAX_PROCESS_ITEMS, MAX_TEXT)) return null;
  return {
    reportNo: r.reportNo,
    auditedAt: r.auditedAt,
    status: r.status,
    headline: r.headline,
    summaryTitle: r.summaryTitle,
    summary: r.summary,
    selectionReason: r.selectionReason,
    process: r.process,
  };
}

export type ValidatedBrandFields = Partial<Brand>;

/**
 * body에서 허용 필드만 뽑아 검증한다. requireAll=true(생성)면 필수 필드 누락 시 실패,
 * false(수정)면 넘어온 필드만 검증하고 나머지는 건드리지 않는다.
 */
export function validateBrandFields(body: unknown, requireAll: boolean): ValidatedBrandFields | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const out: ValidatedBrandFields = {};

  if (b.name !== undefined) {
    if (!isStr(b.name, 1, MAX_NAME)) return null;
    out.name = b.name;
  } else if (requireAll) return null;

  if (b.logo !== undefined) {
    if (!isStr(b.logo, 1, MAX_URL)) return null;
    out.logo = b.logo;
  } else if (requireAll) return null;

  if (b.description !== undefined) {
    if (!isStr(b.description, 1, MAX_LONG_TEXT)) return null;
    out.description = b.description;
  } else if (requireAll) return null;

  if (b.philosophy !== undefined) {
    if (!isStr(b.philosophy, 1, MAX_LONG_TEXT)) return null;
    out.philosophy = b.philosophy;
  } else if (requireAll) return null;

  if (b.auditGrade !== undefined) {
    if (typeof b.auditGrade !== 'string' || !AUDIT_GRADES.has(b.auditGrade)) return null;
    out.auditGrade = b.auditGrade as Brand['auditGrade'];
  } else if (requireAll) return null;

  if (b.auditPoints !== undefined) {
    if (!isStrArray(b.auditPoints, MAX_ARRAY_ITEMS, MAX_TEXT)) return null;
    out.auditPoints = b.auditPoints;
  } else if (requireAll) {
    out.auditPoints = [];
  }

  const auditReport = validateAuditReport(b.auditReport);
  if (auditReport === null) return null;
  if (auditReport !== undefined) out.auditReport = auditReport;

  if (b.representativeProductIds !== undefined) {
    if (!isStrArray(b.representativeProductIds, MAX_ARRAY_ITEMS, MAX_SHORT_TEXT)) return null;
    out.representativeProductIds = b.representativeProductIds;
  } else if (requireAll) {
    out.representativeProductIds = [];
  }

  if (b.relatedConcernSlugs !== undefined) {
    if (!isStrArray(b.relatedConcernSlugs, MAX_ARRAY_ITEMS, MAX_SHORT_TEXT)) return null;
    out.relatedConcernSlugs = b.relatedConcernSlugs;
  } else if (requireAll) {
    out.relatedConcernSlugs = [];
  }

  if (b.isRecommended !== undefined) {
    if (!isBool(b.isRecommended)) return null;
    out.isRecommended = b.isRecommended;
  } else if (requireAll) {
    out.isRecommended = false;
  }

  if (b.isNew !== undefined) {
    if (!isBool(b.isNew)) return null;
    out.isNew = b.isNew;
  }

  if (b.isVisible !== undefined) {
    if (!isBool(b.isVisible)) return null;
    out.isVisible = b.isVisible;
  } else if (requireAll) {
    out.isVisible = true;
  }

  if (b.displayOrder !== undefined) {
    if (
      typeof b.displayOrder !== 'number' ||
      !Number.isInteger(b.displayOrder) ||
      b.displayOrder < 0 ||
      b.displayOrder > MAX_DISPLAY_ORDER
    )
      return null;
    out.displayOrder = b.displayOrder;
  }

  return out;
}

export function toInsertInput(fields: ValidatedBrandFields): BrandInsertInput | null {
  if (
    fields.name === undefined ||
    fields.logo === undefined ||
    fields.description === undefined ||
    fields.philosophy === undefined ||
    fields.auditGrade === undefined
  ) {
    return null;
  }
  return fields as BrandInsertInput;
}

export function toPatchInput(fields: ValidatedBrandFields): BrandPatchInput {
  return fields;
}
