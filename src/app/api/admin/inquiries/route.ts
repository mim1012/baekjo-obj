import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { listAllInquiries } from '@/lib/inquiries/repo';
import { logServerError } from '@/lib/logServerError';

/**
 * GET /api/admin/inquiries — 문의 목록. 현재는 admin 전용이다.
 * TODO(RBAC): 브리프상 partner(자기 브랜드로 좁힌 목록)도 지원할 예정이었으나, 세션 role 타입이
 * next-auth.d.ts에서 'user' | 'admin'만 선언돼 있어(§managedBrandIds 도 members 테이블에
 * 없는 mock 전용 필드) partner 세션 자체가 서버에 존재하지 않는다. partner RBAC은 next-auth.d.ts
 * role 유니온 확장 + members.managed_brand_ids 컬럼 추가가 선행돼야 하므로(다른 브랜치의 인가
 * 재작업과 겹치는 영역 — 이 PR 범위 밖) requireAdmin 그대로 사용한다.
 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const inquiries = await listAllInquiries();
    return NextResponse.json({ inquiries }, { status: 200 });
  } catch (error) {
    logServerError('[GET /api/admin/inquiries] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
