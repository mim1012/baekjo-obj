import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { listInquiriesByProduct } from '@/lib/inquiries/repo';
import { logServerError } from '@/lib/logServerError';
import type { ProductInquiry } from '@/types';

/**
 * 비밀글의 content/answer/answeredBy를 열람 권한 없는 뷰어에게 숨긴다.
 * 열람 가능: 작성자 본인, admin. 파트너(자기 브랜드 담당자)는 브랜드 스코프가 아직
 * DB(members)에 저장되지 않아(§managedBrandIds는 현재 mock 전용) 서버에서 판별할 수
 * 없다 — TODO(RBAC): managedBrandIds가 members 테이블에 반영되면 여기서도 partner 예외를 추가한다.
 * title은 비밀글이어도 항상 공개(기존 storage.ts/ProductTabsClient 동작과 동일).
 */
function redactForViewer(inquiry: ProductInquiry, viewerId: string | null, isAdmin: boolean): ProductInquiry {
  if (!inquiry.isSecret) return inquiry;
  const canView = isAdmin || (viewerId !== null && viewerId === inquiry.userId);
  if (canView) return inquiry;
  return { ...inquiry, content: '', answer: undefined, answeredBy: undefined };
}

/** GET /api/products/[id]/inquiries — 공개 조회. 비밀글은 열람 권한 없으면 서버에서 redaction. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const session = await auth();
    const viewerId = session?.user?.memberId ?? null;
    const isAdmin = session?.user?.role === 'admin';

    const inquiries = await listInquiriesByProduct(id);
    const redacted = inquiries.map((inquiry) => redactForViewer(inquiry, viewerId, isAdmin));
    return NextResponse.json({ inquiries: redacted }, { status: 200 });
  } catch (error) {
    logServerError('[GET /api/products/[id]/inquiries] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
