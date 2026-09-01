import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { deleteInquiryByAdmin } from '@/lib/inquiries/repo';
import { logServerError } from '@/lib/logServerError';

/** DELETE /api/admin/inquiries/[id] — 실제 고객 상품문의 삭제. */
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const { id } = await context.params;
  try {
    const deleted = await deleteInquiryByAdmin(id);
    if (!deleted) return NextResponse.json({ error: 'not-found' }, { status: 404 });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logServerError('[DELETE /api/admin/inquiries/[id]] 삭제 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
