import { NextResponse } from 'next/server';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };
const LOOPBACK_HOSTS = ['localhost', '127.0.0.1'] as const;
const SUPABASE_PROJECT_HOST = /^([a-z0-9]{20})\.supabase\.co$/;

function isLoopbackRequest(request: Request): boolean {
  if (!URL.canParse(request.url)) return false;

  const hostname = new URL(request.url).hostname.toLowerCase();
  return LOOPBACK_HOSTS.some((loopbackHost) => loopbackHost === hostname);
}

function extractProjectRef(url: string): string | null {
  if (!URL.canParse(url)) return null;

  const match = SUPABASE_PROJECT_HOST.exec(new URL(url).hostname.toLowerCase());
  return match?.[1] ?? null;
}

function unavailable(): NextResponse {
  return NextResponse.json({ error: 'not-available' }, { status: 404, headers: NO_STORE_HEADERS });
}

export function GET(request: Request): NextResponse {
  if (
    process.env.NODE_ENV !== 'development' ||
    process.env.LOCAL_APP_RUNTIME_SUPABASE_PREFLIGHT !== '1' ||
    !isLoopbackRequest(request)
  ) {
    return unavailable();
  }

  const projectRef = extractProjectRef(process.env.SUPABASE_URL ?? '');
  if (!projectRef) return unavailable();

  return NextResponse.json({ projectRef }, { status: 200, headers: NO_STORE_HEADERS });
}
