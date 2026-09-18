import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import {
  normalizePageTextSettings,
  pageTextDefinitions,
  validatePageTextSettings,
} from '@/data/pageTextContent';
import { savePageTextSettings } from '@/lib/page-texts/repo';
import { EXPIRE_PUBLIC_READ_CACHE, PUBLIC_READ_CACHE_TAGS } from '@/lib/public-read-cache';
import { logServerError } from '@/lib/logServerError';

/** PUT /api/admin/page-texts — 환경설정의 전체 공개 페이지 문구 저장. */
export async function PUT(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }
  if (!validatePageTextSettings(body)) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  try {
    await savePageTextSettings(normalizePageTextSettings(body));
    revalidateTag(PUBLIC_READ_CACHE_TAGS.pageTexts, EXPIRE_PUBLIC_READ_CACHE);
    for (const page of pageTextDefinitions) {
      if (page.path === '*' || page.path.includes('[')) continue;
      revalidatePath(page.path);
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logServerError('[PUT /api/admin/page-texts] 저장 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
