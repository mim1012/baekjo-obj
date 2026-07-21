import NextAuth, { type NextAuthRequest } from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from '@/lib/auth.config';

// Next.js 16: 'middleware' 파일 컨벤션이 deprecated 되어 'proxy'로 대체됐다(런타임은 nodejs 고정,
// edge 미지원). 엣지 전용으로 나눠뒀던 auth.config.ts는 더 이상 필수는 아니지만, 가볍고 안전해서 그대로 재사용한다.
const { auth } = NextAuth(authConfig);

/** 관리자 전용 경로(/admin, /api/admin) 접근 가드. */
function proxy(req: NextAuthRequest) {
  const { pathname } = req.nextUrl;
  const isAdmin = req.auth?.user?.role === 'admin';

  if (pathname.startsWith('/api/admin')) {
    if (!isAdmin) {
      return NextResponse.json(
        { error: req.auth ? 'forbidden' : 'unauthorized' },
        { status: req.auth ? 403 : 401 },
      );
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/admin') && !isAdmin) {
    const loginUrl = new URL('/login?error=admin', req.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith('/mypage') && !req.auth) {
    const loginUrl = new URL('/login', req.nextUrl.origin);
    loginUrl.searchParams.set('redirect', `${pathname}${req.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export default auth(proxy);

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/mypage/:path*'],
};
