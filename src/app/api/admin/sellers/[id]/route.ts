import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { deleteSeller, updateSeller } from '@/lib/sellers/repo';
import { validateSellerInput } from '@/lib/sellers/validate';
import { logServerError } from '@/lib/logServerError';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  const { id } = await context.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'not-found' }, { status: 404 });
  const body = await request.json().catch(() => null);
  const patch = validateSellerInput(body, false);
  if (!patch || Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }
  try {
    const seller = await updateSeller(id, patch);
    if (!seller) return NextResponse.json({ error: 'not-found' }, { status: 404 });
    return NextResponse.json({ seller });
  } catch (error) {
    if (error instanceof Error && error.message === 'seller-incomplete') {
      return NextResponse.json({ error: 'seller-incomplete' }, { status: 400 });
    }
    logServerError('[PATCH /api/admin/sellers/[id]] 수정 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  const { id } = await context.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'not-found' }, { status: 404 });
  try {
    const deleted = await deleteSeller(id);
    if (!deleted) return NextResponse.json({ error: 'not-found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error && typeof error === 'object' && (error as { code?: string }).code === '23503') {
      return NextResponse.json({ error: 'seller-in-use' }, { status: 409 });
    }
    logServerError('[DELETE /api/admin/sellers/[id]] 삭제 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
