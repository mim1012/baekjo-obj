import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { findMemberById } from '@/lib/members/repo';
import { getInsuranceCertPath } from '@/lib/insurance/repo';
import { getSupabase } from '@/lib/supabase/server';
import { logServerError } from '@/lib/logServerError';

const CERT_BUCKET = 'insurance-docs';
const SIGNED_URL_TTL_SECONDS = 60;

/**
 * GET /api/admin/insurance/[id]/cert — 관리자 전용 증권 열람. 비공개 버킷이라 publicUrl이 없으므로
 * 60초짜리 signed URL을 그때그때 발급한다(§10-3 — 열쇠는 서버 밖으로 안 나가고, 손님도 이 경로로
 * signed URL을 만들지 못한다). 가드 블록은 같은 폴더 PATCH 핸들러와 동일하게 미러한다.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json(
      { error: session?.user ? 'forbidden' : 'unauthorized' },
      { status: session?.user ? 403 : 401 },
    );
  }

  try {
    const requester = session.user.memberId ? await findMemberById(session.user.memberId) : null;
    if (!requester || requester.role !== 'admin' || requester.status === 'inactive') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const certPath = await getInsuranceCertPath(id);
    if (!certPath) {
      return NextResponse.json({ error: 'not-found' }, { status: 404 });
    }

    const { data, error } = await getSupabase()
      .storage.from(CERT_BUCKET)
      .createSignedUrl(certPath, SIGNED_URL_TTL_SECONDS);

    if (error || !data) {
      logServerError('[GET /api/admin/insurance/[id]/cert] signed url 발급 실패', error);
      return NextResponse.json({ error: 'server-error' }, { status: 500 });
    }

    return NextResponse.json({ url: data.signedUrl }, { status: 200 });
  } catch (error) {
    logServerError('[GET /api/admin/insurance/[id]/cert] 증권 열람 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
