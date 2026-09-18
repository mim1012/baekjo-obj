import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { AuditImportConflictError, parseAuditImportInput, publishAuditCmsFromSource } from '@/lib/cms/importPublished';
import { logServerError } from '@/lib/logServerError';

interface Context {
  readonly params: Promise<{ readonly pageKey: string }>;
}

export async function POST(request: Request, context: Context) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  const { pageKey } = await context.params;
  if (pageKey !== 'audit') return NextResponse.json({ error: 'not-found' }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }
  const input = parseAuditImportInput(body);
  if (!input) return NextResponse.json({ error: 'invalid-input' }, { status: 400 });

  try {
    const published = await publishAuditCmsFromSource({ ...input, actorId: admin.requester.id });
    revalidatePath('/audit');
    return NextResponse.json({ ok: true, ...published });
  } catch (error) {
    if (error instanceof AuditImportConflictError) {
      return NextResponse.json({ error: 'source-or-revision-conflict', message: '원본 문구 또는 CMS 상태가 변경되어 발행하지 않았습니다.' }, { status: 409 });
    }
    logServerError('[POST audit/import-publish] 발행 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
