import { NextResponse } from 'next/server';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };
const LOOPBACK_HOSTS = ['localhost', '127.0.0.1'] as const;

function isLoopbackRequest(request: Request): boolean {
  if (!URL.canParse(request.url)) return false;

  const hostname = new URL(request.url).hostname.toLowerCase();
  return LOOPBACK_HOSTS.some((loopbackHost) => loopbackHost === hostname);
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

  return NextResponse.json(
    {
      authSecretPresent: Boolean(process.env.AUTH_SECRET),
      authTrustHostEnabled: process.env.AUTH_TRUST_HOST === 'true',
    },
    { status: 200, headers: NO_STORE_HEADERS },
  );
}
