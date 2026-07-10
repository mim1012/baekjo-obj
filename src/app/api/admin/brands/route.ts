import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { insertBrand, listAllBrandsForAdmin } from '@/lib/brands/repo';
import { validateBrandFields, toInsertInput } from '@/lib/brands/validate';
import { logServerError } from '@/lib/logServerError';

/**
 * GET /api/admin/brands — 관리자 전체 브랜드 목록(비노출 포함).
 * 공개 GET /api/brands는 isVisible:false 브랜드를 걸러내므로, 관리자 화면(#7 골든플로우)은
 * 반드시 이 전용 목록을 써야 숨김 브랜드도 보이고 수정할 수 있다.
 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const brands = await listAllBrandsForAdmin();
    return NextResponse.json({ brands }, { status: 200 });
  } catch (error) {
    logServerError('[GET /api/admin/brands] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}

/** POST /api/admin/brands — 관리자 브랜드 생성. id/createdAt은 서버가 결정한다. */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  const fields = validateBrandFields(body, true);
  const input = fields ? toInsertInput(fields) : null;
  if (!input) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  try {
    const brand = await insertBrand(input);
    revalidatePath('/brands');
    return NextResponse.json({ brand }, { status: 201 });
  } catch (error) {
    logServerError('[POST /api/admin/brands] 생성 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
