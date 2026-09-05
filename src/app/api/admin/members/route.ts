import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { listMemberPage } from '@/lib/members/repo';
import { parseMemberListQuery } from '@/lib/members/listQuery';
import { logServerError } from '@/lib/logServerError';

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  let query;
  try {
    query = parseMemberListQuery(new URL(request.url).searchParams);
  } catch {
    return NextResponse.json({ error: 'invalid-member-query' }, { status: 400 });
  }
  try {
    return NextResponse.json(await listMemberPage(query), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    logServerError('[GET /api/admin/members] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
