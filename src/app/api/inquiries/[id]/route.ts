import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { updateInquiryByOwner, deleteInquiryByOwner, type InquiryPatch } from '@/lib/inquiries/repo';
import { logServerError } from '@/lib/logServerError';

const MAX_TITLE = 200;
const MAX_CONTENT = 2000;

function isStr(v: unknown, min: number, max: number): v is string {
  return typeof v === 'string' && v.length >= min && v.length <= max;
}

/** 허용 필드(title/content/isSecret)만 추려낸다. 하나도 없으면 null. */
function validate(body: unknown): InquiryPatch | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const patch: InquiryPatch = {};

  if (b.title !== undefined) {
    if (!isStr(b.title, 1, MAX_TITLE)) return null;
    patch.title = b.title;
  }
  if (b.content !== undefined) {
    if (!isStr(b.content, 1, MAX_CONTENT)) return null;
    patch.content = b.content;
  }
  if (b.isSecret !== undefined) {
    if (typeof b.isSecret !== 'boolean') return null;
    patch.isSecret = b.isSecret;
  }

  if (Object.keys(patch).length === 0) return null;
  return patch;
}

/** PATCH /api/inquiries/[id] — 본인 문의 수정. status='waiting'일 때만 반영(답변완료 후 불가 —
 *  repo가 WHERE status='waiting'으로 조건부 업데이트하므로 이미 답변된 문의는 조용히 404가 된다). */
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const session = await auth();
  if (!session?.user?.memberId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  const patch = validate(body);
  if (!patch) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  try {
    const inquiry = await updateInquiryByOwner(id, session.user.memberId, patch);
    if (!inquiry) {
      return NextResponse.json({ error: 'not-found' }, { status: 404 });
    }
    return NextResponse.json({ inquiry }, { status: 200 });
  } catch (error) {
    logServerError('[PATCH /api/inquiries/[id]] 수정 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}

/** DELETE /api/inquiries/[id] — 본인 문의 삭제. */
export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const session = await auth();
  if (!session?.user?.memberId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const deleted = await deleteInquiryByOwner(id, session.user.memberId);
    if (!deleted) {
      return NextResponse.json({ error: 'not-found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logServerError('[DELETE /api/inquiries/[id]] 삭제 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
