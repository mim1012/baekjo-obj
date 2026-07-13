import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireBrandScoped } from '@/lib/admin/requireBrandScoped';
import { insertProduct, listProducts } from '@/lib/products/repo';
import { validateProductFields, toInsertInput } from '@/lib/products/validate';
import { logServerError } from '@/lib/logServerError';

function isForeignKeyViolation(error: { code?: string }): boolean {
  return error.code === '23503';
}

/**
 * GET /api/partner/products?brandId=... — 파트너/관리자 본인 관리 브랜드의 상품 목록(비노출 포함).
 * requireBrandScoped가 admin은 전체, partner는 managedBrandIds에 포함된 brandId만 통과시킨다.
 */
export async function GET(request: NextRequest) {
  const brandId = request.nextUrl.searchParams.get('brandId');
  if (!brandId) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  const scoped = await requireBrandScoped(brandId);
  if (!scoped.ok) return scoped.response;

  try {
    const products = await listProducts({ brandId, visibleOnly: false });
    return NextResponse.json({ products }, { status: 200 });
  } catch (error) {
    logServerError('[GET /api/partner/products] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}

/**
 * POST /api/partner/products — 파트너/관리자 상품 생성. body.brandId가 요청자의 관리 범위
 * 안에 있어야 한다(managedBrandIds 밖 브랜드로 상품을 만드는 것을 서버가 차단 — 클라이언트
 * 값만 믿지 않는다).
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  const fields = validateProductFields(body, true);
  const input = fields ? toInsertInput(fields) : null;
  if (!input) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  const scoped = await requireBrandScoped(input.brandId);
  if (!scoped.ok) return scoped.response;

  try {
    const product = await insertProduct(input);
    revalidatePath('/shop');
    revalidatePath(`/brands/${input.brandId}`);
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    if (error && typeof error === 'object' && isForeignKeyViolation(error as { code?: string })) {
      return NextResponse.json({ error: 'invalid-brand' }, { status: 400 });
    }
    logServerError('[POST /api/partner/products] 생성 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
