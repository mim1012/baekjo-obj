export const DEFAULT_E2E_BASE_URL = 'http://127.0.0.1:3000';
type SafetyEnvironment = Readonly<Record<string, string | undefined>>;
export type E2ETargetSafetyOptions = Readonly<{
  allowPreviewReadOnly?: boolean;
  environment?: SafetyEnvironment;
}>;

const PRODUCTION_HOSTS = [
  'www.baekjo-objet.com',
  'baekjo-objet.com',
  'baekjo-obj.vercel.app',
] as const;

const LOOPBACK_HOSTS = ['localhost', '127.0.0.1'] as const;
const APPROVED_PREVIEW_HOST = /^baekjo-obj(?:et)?-git-[a-z0-9]+(?:-[a-z0-9]+)*\.vercel\.app$/;

export class UnsafeE2ETargetError extends Error {
  readonly name = 'UnsafeE2ETargetError';

  constructor(reason: 'malformed' | 'unsupported-protocol' | 'production' | 'remote-preview') {
    super(`Playwright target blocked: ${reason}`);
  }
}

export function resolveE2EBaseUrl(environment: SafetyEnvironment = process.env): string {
  return environment.E2E_BASE_URL || environment.BASE_URL || DEFAULT_E2E_BASE_URL;
}

function isApprovedPreviewReadOnlyMode(options: E2ETargetSafetyOptions): boolean {
  if (!options.allowPreviewReadOnly) return false;

  const environment = options.environment ?? process.env;
  return (
    environment.PREVIEW_QA_ACK === '1' &&
    environment.MAX_TOP_LEVEL_NAVIGATIONS === '5' &&
    environment.MAX_ROUTE_CALLS === '5' &&
    environment.PLAYWRIGHT_WORKERS === '1' &&
    environment.PLAYWRIGHT_RETRIES === '0'
  );
}

export function assertNoProductionOrPreviewTarget(
  baseUrl: string,
  options: E2ETargetSafetyOptions = {},
): URL {
  if (!URL.canParse(baseUrl)) throw new UnsafeE2ETargetError('malformed');

  const target = new URL(baseUrl);
  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    throw new UnsafeE2ETargetError('unsupported-protocol');
  }

  const hostname = target.hostname.toLowerCase();
  if (PRODUCTION_HOSTS.some((productionHost) => productionHost === hostname)) {
    throw new UnsafeE2ETargetError('production');
  }
  if (LOOPBACK_HOSTS.some((loopbackHost) => loopbackHost === hostname)) {
    return target;
  }
  if (!isApprovedPreviewReadOnlyMode(options) || !APPROVED_PREVIEW_HOST.test(hostname)) {
    throw new UnsafeE2ETargetError('remote-preview');
  }

  return target;
}

export function resolvePaymentsWriteBaseUrl(environment: SafetyEnvironment = process.env): string {
  const baseUrl = environment.PAYMENTS_PREVIEW_URL;
  if (!baseUrl) return '';
  return assertNoProductionOrPreviewTarget(baseUrl).toString().replace(/\/+$/u, '');
}
