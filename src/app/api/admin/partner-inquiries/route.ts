import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { listPartnerInquiries } from '@/lib/partnerInquiries/repo';
import { logServerError } from '@/lib/logServerError';

/**
 * GET /api/admin/partner-inquiries — 관리자 B2B 제휴 문의 접수함 목록.
 * PII(연락처·이메일)를 담으므로 공개 GET 은 없다. requireAdmin 이 role+DB 이중 가드.
 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const inquiries = await listPartnerInquiries();
    return NextResponse.json({ inquiries }, { status: 200 });
  } catch (error) {
    logServerError('[GET /api/admin/partner-inquiries] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
