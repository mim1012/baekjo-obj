export type SupabaseAccessSource = 'payments' | 'shipments' | 'golden' | 'storage' | 'workflow';
type SafetyEnvironment = Readonly<Record<string, string | undefined>>;
type LocalRuntimePreflightRequest = (target: URL) => Promise<Pick<Response, 'ok' | 'json'>>;

const SUPABASE_PROJECT_HOST = /^([a-z0-9]{20})\.supabase\.co$/;

type SupabaseBlockReason =
  | 'missing-project-ref'
  | 'invalid-project-url'
  | 'project-ref-mismatch'
  | 'missing-credential'
  | 'runtime-preflight-unavailable'
  | 'invalid-runtime-response'
  | 'runtime-project-ref-mismatch';

const BLOCK_REASON_MESSAGES = {
  'missing-project-ref': 'TEST_SUPABASE_PROJECT_REF is required',
  'invalid-project-url': 'SUPABASE_URL is not a valid project URL',
  'project-ref-mismatch': 'project ref mismatch',
  'missing-credential': 'Supabase test credential is required',
  'runtime-preflight-unavailable': 'localhost app runtime preflight is unavailable',
  'invalid-runtime-response': 'localhost app runtime preflight returned an invalid response',
  'runtime-project-ref-mismatch': 'localhost app runtime project ref mismatch',
} as const satisfies Readonly<Record<SupabaseBlockReason, string>>;

export class UnsafeSupabaseTestTargetError extends Error {
  readonly name = 'UnsafeSupabaseTestTargetError';

  constructor(source: SupabaseAccessSource, reason: SupabaseBlockReason, detail?: string) {
    const suffix = detail ? ` (${detail})` : '';
    super(`Supabase ${source} access blocked: ${BLOCK_REASON_MESSAGES[reason]}${suffix}`);
  }
}

export function extractSupabaseProjectRef(url: string): string | null {
  if (!URL.canParse(url)) return null;

  const match = SUPABASE_PROJECT_HOST.exec(new URL(url).hostname.toLowerCase());
  return match?.[1] ?? null;
}

export function maskProjectRef(ref: string): string {
  if (ref.length <= 8) return '****';
  return `${ref.slice(0, 4)}...${ref.slice(-4)}`;
}

export function assertAllowedTestSupabaseRef(
  source: SupabaseAccessSource,
  environment: SafetyEnvironment = process.env,
): string {
  const expectedRef = environment.TEST_SUPABASE_PROJECT_REF;
  if (!expectedRef) {
    throw new UnsafeSupabaseTestTargetError(source, 'missing-project-ref');
  }

  const actualRef = extractSupabaseProjectRef(environment.SUPABASE_URL ?? '');
  if (!actualRef) {
    throw new UnsafeSupabaseTestTargetError(source, 'invalid-project-url');
  }

  if (actualRef !== expectedRef) {
    throw new UnsafeSupabaseTestTargetError(
      source,
      'project-ref-mismatch',
      `${maskProjectRef(actualRef)} != ${maskProjectRef(expectedRef)}`,
    );
  }

  return actualRef;
}

function isRuntimeProjectRefPayload(value: unknown): value is { readonly projectRef: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'projectRef' in value &&
    typeof value.projectRef === 'string' &&
    SUPABASE_PROJECT_HOST.test(`${value.projectRef}.supabase.co`)
  );
}

async function requestLocalRuntimePreflight(target: URL): Promise<Pick<Response, 'ok' | 'json'>> {
  return fetch(target, { method: 'GET', cache: 'no-store' });
}

export async function assertLocalhostAppRuntimeSupabaseRefMatchesTestRef(
  source: SupabaseAccessSource,
  environment: SafetyEnvironment = process.env,
  request: LocalRuntimePreflightRequest = requestLocalRuntimePreflight,
): Promise<string> {
  const expectedRef = assertAllowedTestSupabaseRef(source, environment);
  const target = new URL('/api/__test__/supabase-ref', assertLocalhostTarget(source, environment));

  let response: Pick<Response, 'ok' | 'json'>;
  try {
    response = await request(target);
  } catch {
    throw new UnsafeSupabaseTestTargetError(source, 'runtime-preflight-unavailable');
  }

  if (!response.ok) {
    throw new UnsafeSupabaseTestTargetError(source, 'runtime-preflight-unavailable');
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new UnsafeSupabaseTestTargetError(source, 'invalid-runtime-response');
  }

  if (!isRuntimeProjectRefPayload(payload)) {
    throw new UnsafeSupabaseTestTargetError(source, 'invalid-runtime-response');
  }
  if (payload.projectRef !== expectedRef) {
    throw new UnsafeSupabaseTestTargetError(source, 'runtime-project-ref-mismatch');
  }

  return payload.projectRef;
}

function assertLocalhostTarget(source: SupabaseAccessSource, environment: SafetyEnvironment): URL {
  const baseUrl = environment.E2E_BASE_URL || environment.BASE_URL || 'http://127.0.0.1:3000';
  if (!URL.canParse(baseUrl)) {
    throw new UnsafeSupabaseTestTargetError(source, 'runtime-preflight-unavailable');
  }

  const target = new URL(baseUrl);
  const hostname = target.hostname.toLowerCase();
  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    throw new UnsafeSupabaseTestTargetError(source, 'runtime-preflight-unavailable');
  }
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    throw new UnsafeSupabaseTestTargetError(source, 'runtime-preflight-unavailable');
  }

  return target;
}

export function supabaseEnvReadySafely(
  source: SupabaseAccessSource,
  environment: SafetyEnvironment = process.env,
): boolean {
  const hasUrl = Boolean(environment.SUPABASE_URL);
  const hasCredential = Boolean(environment.SUPABASE_ACCESS_TOKEN || environment.SUPABASE_SECRET_KEY);
  const hasExpectedRef = Boolean(environment.TEST_SUPABASE_PROJECT_REF);
  if (!hasUrl && !hasCredential && !hasExpectedRef) return false;

  assertAllowedTestSupabaseRef(source, environment);
  if (!hasCredential) {
    throw new UnsafeSupabaseTestTargetError(source, 'missing-credential');
  }
  return true;
}
