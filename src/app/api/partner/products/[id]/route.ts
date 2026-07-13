import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireBrandScoped } from '@/lib/admin/requireBrandScoped';
import { getProductById, updateProduct, deleteProduct } from '@/lib/products/repo';
import { validateProductFields, toPatchInput } from '@/lib/products/validate';
import { logServerError } from '@/lib/logServerError';

function isForeignKeyViolation(error: { code?: string }): boolean {
  return error.code === '23503';
}

/**
 * PATCH /api/partner/products/[id] — 파트너/관리자 상품 수정. 인가는 "이 상품이 지금 속한
 * 브랜드"를 기준으로 하고, body에 brandId(브랜드 이동)가 포함되면 이동 대상 브랜드도 요청자
 * 관리 범위 안에 있어야 통과시킨다(관리 밖 브랜드로 상품을 빼돌리는 것을 차단).
 */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const existing = await getProductById(id, { includeHidden: true });
  if (!existing) {
    return NextResponse.json({ error: 'not-found' }, { status: 404 });
  }

  const scoped = await requireBrandScoped(existing.brandId);
  if (!scoped.ok) return scoped.response;

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

  if (fields.brandId !== undefined && fields.brandId !== existing.brandId) {
    const targetScoped = await requireBrandScoped(fields.brandId);
    if (!targetScoped.ok) return targetScoped.response;
  }

  try {
    const product = await updateProduct(id, toPatchInput(fields));
    if (!product) {
      return NextResponse.json({ error: 'not-found' }, { status: 404 });
    }
    revalidatePath('/shop');
    revalidatePath(`/shop/${id}`);
    revalidatePath(`/brands/${existing.brandId}`);
    return NextResponse.json({ product }, { status: 200 });
  } catch (error) {
    if (error && typeof error === 'object' && isForeignKeyViolation(error as { code?: string })) {
      return NextResponse.json({ error: 'invalid-brand' }, { status: 400 });
    }
    logServerError('[PATCH /api/partner/products/[id]] 수정 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}

/** DELETE /api/partner/products/[id] — 파트너/관리자 상품 삭제. 인가는 상품의 현재 브랜드 기준. */
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const existing = await getProductById(id, { includeHidden: true });
  if (!existing) {
    return NextResponse.json({ error: 'not-found' }, { status: 404 });
  }

  const scoped = await requireBrandScoped(existing.brandId);
  if (!scoped.ok) return scoped.response;

  try {
    const existed = await deleteProduct(id);
    if (!existed) {
      return NextResponse.json({ error: 'not-found' }, { status: 404 });
    }
    revalidatePath('/shop');
    revalidatePath(`/shop/${id}`);
    revalidatePath(`/brands/${existing.brandId}`);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logServerError('[DELETE /api/partner/products/[id]] 삭제 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
