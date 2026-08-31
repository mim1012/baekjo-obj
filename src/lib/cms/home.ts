import {
  defaultHomeSettings,
  normalizeHomeSettings,
  type HomeSettings,
} from '@/data/homeContent';

export const HOME_CMS_PAGE_KEY = 'home';

export const HOME_REQUIRED_SECTIONS = [
  'hero',
  'quickShop',
  'bestProducts',
  'curation',
  'audit',
  'solutions',
  'insuranceBanner',
  'trustBoard',
] as const;

export function isHomeSettingsInput(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const body = value as Record<string, unknown>;
  return HOME_REQUIRED_SECTIONS.every(
    (key) => body[key] !== null && typeof body[key] === 'object' && !Array.isArray(body[key]),
  );
}

export function normalizeCmsHomeContent(value: unknown): HomeSettings | null {
  return isHomeSettingsInput(value) ? normalizeHomeSettings(value) : null;
}

export function homeContentWithFallback(value: unknown): HomeSettings {
  return value && typeof value === 'object'
    ? normalizeHomeSettings(value)
    : defaultHomeSettings;
}

