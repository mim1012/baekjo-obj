export const CMS_COMPATIBILITY_KIND = 'cms-page-compatibility-v1';

export interface CmsCompatibilityVersion {
  revision: number;
  content: unknown;
  publishedAt: string;
}

export interface CmsCompatibilityEnvelope {
  kind: typeof CMS_COMPATIBILITY_KIND;
  draftContent: unknown;
  publishedContent: unknown;
  draftRevision: number;
  publishedRevision: number | null;
  updatedBy: string | null;
  publishedBy: string | null;
  updatedAt: string;
  publishedAt: string | null;
  versions: CmsCompatibilityVersion[];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isRevision(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

export function createCmsCompatibilityEnvelope(seedContent: unknown, now: string): CmsCompatibilityEnvelope {
  return {
    kind: CMS_COMPATIBILITY_KIND,
    draftContent: clone(seedContent),
    publishedContent: clone(seedContent),
    draftRevision: 1,
    publishedRevision: 1,
    updatedBy: null,
    publishedBy: null,
    updatedAt: now,
    publishedAt: null,
    versions: [],
  };
}

export function parseCmsCompatibilityEnvelope(value: unknown): CmsCompatibilityEnvelope | null {
  if (!isObject(value) || value.kind !== CMS_COMPATIBILITY_KIND || !isRevision(value.draftRevision)) {
    return null;
  }
  if (value.publishedRevision !== null && !isRevision(value.publishedRevision)) return null;
  if (typeof value.updatedAt !== 'string') return null;
  if (value.publishedAt !== null && typeof value.publishedAt !== 'string') return null;

  const versions = Array.isArray(value.versions)
    ? value.versions.flatMap((entry) => {
        if (!isObject(entry) || !isRevision(entry.revision) || typeof entry.publishedAt !== 'string') return [];
        return [{
          revision: entry.revision,
          content: clone(entry.content),
          publishedAt: entry.publishedAt,
        }];
      })
    : [];

  return {
    kind: CMS_COMPATIBILITY_KIND,
    draftContent: clone(value.draftContent),
    publishedContent: clone(value.publishedContent),
    draftRevision: value.draftRevision,
    publishedRevision: value.publishedRevision,
    updatedBy: typeof value.updatedBy === 'string' ? value.updatedBy : null,
    publishedBy: typeof value.publishedBy === 'string' ? value.publishedBy : null,
    updatedAt: value.updatedAt,
    publishedAt: value.publishedAt,
    versions,
  };
}

export function saveCmsCompatibilityDraft(input: {
  current: CmsCompatibilityEnvelope;
  expectedRevision: number;
  content: unknown;
  actorId: string;
  now: string;
}): CmsCompatibilityEnvelope | null {
  if (input.current.draftRevision !== input.expectedRevision) return null;
  return {
    ...input.current,
    draftContent: clone(input.content),
    draftRevision: input.current.draftRevision + 1,
    updatedBy: input.actorId,
    updatedAt: input.now,
  };
}

export function publishCmsCompatibilityDraft(input: {
  current: CmsCompatibilityEnvelope;
  expectedRevision: number;
  actorId: string;
  now: string;
}): CmsCompatibilityEnvelope | null {
  if (input.current.draftRevision !== input.expectedRevision) return null;
  const version: CmsCompatibilityVersion = {
    revision: input.current.draftRevision,
    content: clone(input.current.draftContent),
    publishedAt: input.now,
  };
  return {
    ...input.current,
    publishedContent: clone(input.current.draftContent),
    publishedRevision: input.current.draftRevision,
    publishedBy: input.actorId,
    publishedAt: input.now,
    updatedAt: input.now,
    versions: [version, ...input.current.versions.filter((item) => item.revision !== version.revision)].slice(0, 30),
  };
}
