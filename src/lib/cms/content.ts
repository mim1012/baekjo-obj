import 'server-only';
import { getPublishedCmsPage, isCmsSchemaUnavailable } from '@/lib/cms/repo';
import {
  getCmsPageDefinition,
  type CmsFieldDefinition,
  type CmsLinkItem,
  type CmsPageDefinition,
} from '@/lib/cms/pageDefinitions';

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function getValueAtPath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    return isObject(current) ? current[key] : undefined;
  }, source);
}

export function setValueAtPath(source: JsonObject, path: string, value: unknown): void {
  const keys = path.split('.');
  let current = source;
  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      current[key] = value;
      return;
    }
    const next = current[key];
    if (!isObject(next)) current[key] = {};
    current = current[key] as JsonObject;
  });
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function safeString(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function safeUrl(value: unknown): string {
  const raw = safeString(value, 2048);
  if (!raw) return '';
  if (raw.startsWith('/') || raw.startsWith('#')) return raw;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? raw : '';
  } catch {
    return '';
  }
}

function normalizeLinks(value: unknown, fallback: unknown): CmsLinkItem[] {
  if (!Array.isArray(value)) return Array.isArray(fallback) ? clone(fallback as CmsLinkItem[]) : [];
  return value.slice(0, 30).flatMap((item) => {
    if (!isObject(item)) return [];
    const label = safeString(item.label, 80);
    const href = safeUrl(item.href);
    if (!label || !href) return [];
    return [{ label, href, visible: item.visible !== false }];
  });
}

function normalizeItems(field: CmsFieldDefinition, value: unknown, fallback: unknown): JsonObject[] {
  if (!Array.isArray(value)) return Array.isArray(fallback) ? clone(fallback as JsonObject[]) : [];
  const itemFields = field.itemFields ?? [];
  return value.slice(0, 30).flatMap((item) => {
    if (!isObject(item)) return [];
    const normalized: JsonObject = {};
    for (const itemField of itemFields) {
      const raw = item[itemField.key];
      if (itemField.type === 'boolean') {
        normalized[itemField.key] = typeof raw === 'boolean'
          ? raw
          : itemField.defaultValue === true;
      } else if (itemField.type === 'url' || itemField.type === 'image') {
        normalized[itemField.key] = safeUrl(raw);
      } else {
        normalized[itemField.key] = safeString(raw, itemField.type === 'textarea' ? 5000 : 500);
      }
    }
    const hasContent = Object.values(normalized).some((entry) => typeof entry === 'string' && entry.length > 0);
    return hasContent ? [normalized] : [];
  });
}

function normalizeField(field: CmsFieldDefinition, value: unknown, fallback: unknown): unknown {
  if (value === undefined) return fallback === undefined ? null : clone(fallback);
  switch (field.type) {
    case 'boolean':
      return typeof value === 'boolean' ? value : Boolean(fallback);
    case 'url':
    case 'image': {
      return safeUrl(value);
    }
    case 'link-list':
      return normalizeLinks(value, fallback);
    case 'item-list':
      return normalizeItems(field, value, fallback);
    case 'textarea': {
      return safeString(value, 5000);
    }
    case 'text':
    default: {
      return safeString(value, 500);
    }
  }
}

export function normalizeCmsPageContent(
  definition: CmsPageDefinition,
  value: unknown,
): Record<string, unknown> {
  const result = clone(definition.defaultContent);
  const input = isObject(value) ? value : {};
  for (const section of definition.sections) {
    for (const field of section.fields) {
      const fallback = getValueAtPath(definition.defaultContent, field.path);
      const incoming = getValueAtPath(input, field.path);
      setValueAtPath(result, field.path, normalizeField(field, incoming, fallback));
    }
  }
  return result;
}

export async function getPublishedPageContent<T extends Record<string, unknown>>(
  pageKey: string,
): Promise<T> {
  const definition = getCmsPageDefinition(pageKey);
  if (!definition) throw new Error(`unknown-cms-page:${pageKey}`);
  try {
    const published = await getPublishedCmsPage<unknown>(pageKey);
    return normalizeCmsPageContent(definition, published) as T;
  } catch (error) {
    if (!isCmsSchemaUnavailable(error)) throw error;
    return clone(definition.defaultContent) as T;
  }
}
