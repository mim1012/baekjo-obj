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
      } else if (itemField.type === 'textarea' && itemField.linesArray) {
        // linesArray는 항목 필드 정의 자체의 정적 선언이다(예: refund-policy articles의
        // noticeLines) — item-list는 항목을 자유롭게 추가·삭제·재정렬할 수 있어 "같은 index의
        // 기본 항목" 같은 위치 기반 판정은 항목 수가 늘어나는 순간(예: 4개→12개로 늘린 뒤 다시
        // 정규화) 어긋난다. 정의에 고정된 플래그로만 배열/문자열을 판정해야 normalize가
        // 항목 수·순서와 무관하게 항상 멱등적이다. normalizeTextareaValue에 항상 배열인
        // fallback([])을 넘겨 배열 분기를 강제한다(문자열이면 줄바꿈으로 분리, 배열이면 문자열만
        // 걸러 보존, 그 외엔 빈 배열).
        normalized[itemField.key] = normalizeTextareaValue(raw, []);
      } else {
        normalized[itemField.key] = safeString(raw);
      }
    }
    return [normalized];
  });
}

// 'textarea' 필드는 대부분 평문 문자열(줄바꿈은 문자열 안의 '\n')이지만, 정의의 defaultContent가
// 배열(string[])인 필드(예: home.hero.titleLines)는 "한 줄에 한 항목" 배열 그대로 보존한다 — 페이지
// 키가 아니라 fallback의 실제 shape로 분기하므로 어떤 페이지에도 적용 가능한 범용 규칙이다(홈 전용
// 특례 아님). 배열이 아닌 값이 들어오면(예: 편집기가 줄바꿈 문자열로 합쳐 보냄) '\n' 로 분리해
// 받아들인다 — join/split 라운드트립.
function normalizeTextareaValue(value: unknown, fallback: unknown): unknown {
  if (!Array.isArray(fallback)) return safeString(value);
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  if (typeof value === 'string') return value.split('\n');
  return clone(fallback);
}

function normalizeField(field: CmsFieldDefinition, value: unknown, fallback: unknown): unknown {
  if (value === undefined) return fallback === undefined ? null : clone(fallback);
  switch (field.type) {
    case 'boolean':
      return typeof value === 'boolean' ? value : Boolean(fallback);
    case 'textarea':
      return normalizeTextareaValue(value, fallback);
    case 'url':
    case 'image':
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
