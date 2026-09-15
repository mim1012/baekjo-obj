import type { CmsContent } from './types';

export function isCmsContent(value: unknown): value is CmsContent {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function getAtPath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => (
    isCmsContent(current) ? current[key] : undefined
  ), source);
}

export function setAtPath(source: CmsContent, path: string, value: unknown): CmsContent {
  const next = structuredClone(source);
  const keys = path.split('.');
  let current: CmsContent = next;

  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      current[key] = value;
      return;
    }

    const child = current[key];
    if (!isCmsContent(child)) current[key] = {};
    const nextChild = current[key];
    if (isCmsContent(nextChild)) current = nextChild;
  });

  return next;
}
