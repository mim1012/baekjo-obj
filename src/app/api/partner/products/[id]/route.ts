import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireBrandScoped } from '@/lib/admin/requireBrandScoped';
import { getProductById, updateProductScoped, deleteProductScoped } from '@/lib/products/repo';
import { validateProductFields, toPatchInput } from '@/lib/products/validate';
import { logServerError } from '@/lib/logServerError';

function isForeignKeyViolation(error: { code?: string }): boolean {
  return error.code === '23503';
}

/**
 * PATCH /api/partner/products/[id] — 파트너/관리자 상품 수정. 인가는 "이 상품이 지금 속한
 * 브랜드"를 기준으로 하고, body에 brandId(브랜드 이동)가 포함되면 이동 대상 브랜드도 요청자
 * 관리 범위 안에 있어야 통과시킨다(관리 밖 브랜드로 상품을 빼돌리는 것을 차단). 실제 쓰기는
 * updateProductScoped가 이 시점의 existing.brandId를 WHERE 조건으로 그대로 실어, 인가 확인과
 * 쓰기 사이(TOCTOU)에 브랜드가 바뀌면 0행 갱신 → 409로 되돌린다(체크-후-쓰기가 아니라 조건부 쓰기).
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
    const result = await updateProductScoped(id, toPatchInput(fields), existing.brandId);
    if (result.status === 'not-found') {
      return NextResponse.json({ error: 'not-found' }, { status: 404 });
    }
    if (result.status === 'conflict') {
      return NextResponse.json({ error: 'conflict' }, { status: 409 });
    }
    if (result.status === 'invalid') {
      return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
    }
    revalidatePath('/shop');
    revalidatePath(`/shop/${id}`);
    revalidatePath(`/brands/${existing.brandId}`);
    return NextResponse.json({ product: result.data }, { status: 200 });
  } catch (error) {
    if (error && typeof error === 'object' && isForeignKeyViolation(error as { code?: string })) {
      return NextResponse.json({ error: 'invalid-brand' }, { status: 400 });
    }
    logServerError('[PATCH /api/partner/products/[id]] 수정 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}

/**
 * DELETE /api/partner/products/[id] — 파트너/관리자 상품 삭제. PATCH와 동일하게 인가는 상품의
 * 현재 브랜드 기준이고, 실제 삭제는 deleteProductScoped가 그 브랜드를 WHERE 조건에 실어 원자적으로
 * 수행한다(TOCTOU 방지).
 */
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const existing = await getProductById(id, { includeHidden: true });
  if (!existing) {
    return NextResponse.json({ error: 'not-found' }, { status: 404 });
  }

  const scoped = await requireBrandScoped(existing.brandId);
  if (!scoped.ok) return scoped.response;

  try {
    const result = await deleteProductScoped(id, existing.brandId);
    if (result.status === 'not-found') {
      return NextResponse.json({ error: 'not-found' }, { status: 404 });
    }
    if (result.status === 'conflict') {
      return NextResponse.json({ error: 'conflict' }, { status: 409 });
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
