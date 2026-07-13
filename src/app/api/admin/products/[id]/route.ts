import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { updateProduct, deleteProduct } from '@/lib/products/repo';
import { validateProductFields, toPatchInput } from '@/lib/products/validate';
import { logServerError } from '@/lib/logServerError';

function isForeignKeyViolation(error: { code?: string }): boolean {
  return error.code === '23503';
}

/** PATCH /api/admin/products/[id] — 관리자 상품 수정. 넘어온 필드만 반영한다(부분 업데이트). */
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

  const fields = validateProductFields(body, false);
  if (!fields || Object.keys(fields).length === 0) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  try {
    const product = await updateProduct(id, toPatchInput(fields));
    if (!product) {
      return NextResponse.json({ error: 'not-found' }, { status: 404 });
    }
    revalidatePath('/shop');
    revalidatePath(`/shop/${id}`);
    return NextResponse.json({ product }, { status: 200 });
  } catch (error) {
    if (error && typeof error === 'object' && isForeignKeyViolation(error as { code?: string })) {
      return NextResponse.json({ error: 'invalid-brand' }, { status: 400 });
    }
    logServerError('[PATCH /api/admin/products/[id]] 수정 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/products/[id] — 관리자 상품 삭제.
 * product_reviews/product_inquiries.product_id는 on delete restrict(0029)라 구매평·문의가
 * 남아있는 상품을 삭제하면 23503으로 막힌다 — 물리 삭제 대신 숨김 처리를 유도하는 409로 매핑한다.
 */
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const existed = await deleteProduct(id);
    if (!existed) {
      return NextResponse.json({ error: 'not-found' }, { status: 404 });
    }
    revalidatePath('/shop');
    revalidatePath(`/shop/${id}`);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    if (error && typeof error === 'object' && isForeignKeyViolation(error as { code?: string })) {
      return NextResponse.json({ error: 'product-has-history' }, { status: 409 });
    }
    logServerError('[DELETE /api/admin/products/[id]] 삭제 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
