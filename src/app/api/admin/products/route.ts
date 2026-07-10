import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { insertProduct, listAllProductsForAdmin } from '@/lib/products/repo';
import { validateProductFields, toInsertInput } from '@/lib/products/validate';
import { logServerError } from '@/lib/logServerError';

function isForeignKeyViolation(error: { code?: string }): boolean {
  return error.code === '23503';
}

/**
 * GET /api/admin/products — 관리자 전체 상품 목록(비노출 포함).
 * 공개 GET /api/products는 isVisible:false 상품을 걸러내므로, 관리자 화면(#7 골든플로우)은
 * 반드시 이 전용 목록을 써야 숨김 상품도 보이고 수정할 수 있다.
 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const products = await listAllProductsForAdmin();
    return NextResponse.json({ products }, { status: 200 });
  } catch (error) {
    logServerError('[GET /api/admin/products] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/products — 관리자 상품 생성.
 * id/createdAt은 서버가 결정한다(mass-assignment 차단). brandId가 실존 브랜드를 가리키지
 * 않으면 DB FK 제약이 막고, 여기서 400으로 매핑한다.
 */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

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

  try {
    const product = await insertProduct(input);
    revalidatePath('/shop');
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    if (error && typeof error === 'object' && isForeignKeyViolation(error as { code?: string })) {
      return NextResponse.json({ error: 'invalid-brand' }, { status: 400 });
    }
    logServerError('[POST /api/admin/products] 생성 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
