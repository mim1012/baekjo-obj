import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { insertSeller, listSellers } from '@/lib/sellers/repo';
import { validateSellerInput, type SellerWriteInput } from '@/lib/sellers/validate';
import { logServerError } from '@/lib/logServerError';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  try {
    return NextResponse.json({ sellers: await listSellers() });
  } catch (error) {
    logServerError('[GET /api/admin/sellers] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  const body = await request.json().catch(() => null);
  const input = validateSellerInput(body, true);
  if (!input) return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  try {
    const seller = await insertSeller(input as SellerWriteInput);
    return NextResponse.json({ seller }, { status: 201 });
  } catch (error) {
    logServerError('[POST /api/admin/sellers] 생성 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
