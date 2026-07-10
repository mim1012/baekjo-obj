import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { getSupabase } from '@/lib/supabase/server';
import { logServerError } from '@/lib/logServerError';

// upload route가 만드는 키 형태(partner/<uuid>-<sanitized 파일명, 최대 80자>)와 정확히 일치하는 것만 허용.
// '..'를 포함하거나 형태가 다른 경로는 임의 객체 접근으로 보고 거부한다.
const PARTNER_FILE_PATH_PATTERN = /^partner\/[0-9a-fA-F-]{36}-[A-Za-z0-9._-]{1,120}$/;

function isValidPartnerFilePath(path: string): boolean {
  return !path.includes('..') && PARTNER_FILE_PATH_PATTERN.test(path);
}

/**
 * GET /api/admin/members/file?path=... — 가입 신청 첨부서류를 관리자만 열람.
 * signup-docs는 private 버킷이라 직접 URL로 못 연다. path가 upload route가 만든 정규 키
 * 형태(partner/<uuid>-<파일명>)와 정확히 일치하는지 검증해 임의 객체 접근을 막고, 60초짜리
 * 서명 URL로 리다이렉트해 관리자 쿠키 세션 그대로 <a href>가 동작하게 한다. 다운로드를
 * 강제해(response-content-disposition=attachment) 브라우저가 관리자 세션에서 첨부파일을
 * 인라인 렌더(폴리글랏/스크립트 실행)하지 않게 한다.
 */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const path = request.nextUrl.searchParams.get('path');
  if (!path || !isValidPartnerFilePath(path)) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  try {
    const { data, error } = await getSupabase()
      .storage.from('signup-docs')
      .createSignedUrl(path, 60, { download: true });

    if (error || !data?.signedUrl) {
      if (error) logServerError('[GET /api/admin/members/file] 서명 URL 생성 실패', error);
      return NextResponse.json({ error: 'not-found' }, { status: 404 });
    }

    return NextResponse.redirect(data.signedUrl);
  } catch (error) {
    logServerError('[GET /api/admin/members/file] 처리 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
