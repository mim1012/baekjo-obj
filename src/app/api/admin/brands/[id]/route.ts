import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { updateBrand, deleteBrand } from '@/lib/brands/repo';
import { validateBrandFields, toPatchInput } from '@/lib/brands/validate';
import { logServerError } from '@/lib/logServerError';

/** PATCH /api/admin/brands/[id] — 관리자 브랜드 수정. 넘어온 필드만 반영한다(부분 업데이트). */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  const fields = validateBrandFields(body, false);
  if (!fields || Object.keys(fields).length === 0) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  try {
    const brand = await updateBrand(id, toPatchInput(fields));
    if (!brand) {
      return NextResponse.json({ error: 'not-found' }, { status: 404 });
    }
    revalidatePath('/brands');
    revalidatePath(`/brands/${id}`);
    return NextResponse.json({ brand }, { status: 200 });
  } catch (error) {
    logServerError('[PATCH /api/admin/brands/[id]] 수정 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}

/** DELETE /api/admin/brands/[id] — 관리자 브랜드 삭제. */
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const existed = await deleteBrand(id);
    if (!existed) {
      return NextResponse.json({ error: 'not-found' }, { status: 404 });
    }
    revalidatePath('/brands');
    revalidatePath(`/brands/${id}`);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logServerError('[DELETE /api/admin/brands/[id]] 삭제 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
