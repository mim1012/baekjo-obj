import {
  type CmsFieldDefinition,
  type CmsLinkItem,
  type CmsPageDefinition,
} from '@/lib/cms/pageDefinitions';

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function isCmsContentInput(value: unknown): value is Record<string, unknown> {
  return isObject(value);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
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

function safeString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function normalizeLinks(value: unknown, fallback: unknown): CmsLinkItem[] {
  if (!Array.isArray(value)) return Array.isArray(fallback) ? clone(fallback as CmsLinkItem[]) : [];
  return value.flatMap((item) => {
    if (!isObject(item)) return [];
    const normalized: CmsLinkItem = {
      ...clone(item),
      label: safeString(item.label),
      href: safeString(item.href),
      visible: item.visible !== false,
    };
    return [normalized];
  });
}

function normalizeItems(field: CmsFieldDefinition, value: unknown, fallback: unknown): JsonObject[] {
  if (!Array.isArray(value)) return Array.isArray(fallback) ? clone(fallback as JsonObject[]) : [];
  const itemFields = field.itemFields ?? [];
  return value.flatMap((item) => {
    if (!isObject(item)) return [];
    const normalized: JsonObject = clone(item);
    for (const itemField of itemFields) {
      const raw = item[itemField.key];
      if (itemField.type === 'boolean') {
        normalized[itemField.key] = typeof raw === 'boolean'
          ? raw
          : itemField.defaultValue === true;
      } else {
        normalized[itemField.key] = safeString(raw);
      }
    }
    return [normalized];
  });
}

function normalizeField(field: CmsFieldDefinition, value: unknown, fallback: unknown): unknown {
  if (value === undefined) return fallback === undefined ? null : clone(fallback);
  switch (field.type) {
    case 'boolean':
      return typeof value === 'boolean' ? value : Boolean(fallback);
    case 'url':
    case 'image':
    case 'textarea':
    case 'text':
      return safeString(value);
    case 'link-list':
      return normalizeLinks(value, fallback);
    case 'item-list':
      return normalizeItems(field, value, fallback);
    default:
      return value;
  }
}

export function normalizeCmsPageContent(
  definition: CmsPageDefinition,
  value: unknown,
): Record<string, unknown> {
  if (definition.sections.length === 0) return isObject(value) ? clone(value) : {};

  const result = isObject(value) ? clone(value) : clone(definition.defaultContent);
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
