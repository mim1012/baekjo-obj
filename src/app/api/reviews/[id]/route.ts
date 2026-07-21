import { NextResponse, type NextRequest } from 'next/server';
import { requireActiveMember } from '@/lib/members/requireActiveMember';
import { updateReviewByOwner, deleteReviewByOwner, type ReviewPatch } from '@/lib/reviews/repo';
import { logServerError } from '@/lib/logServerError';

const MAX_TITLE = 200;
const MAX_CONTENT = 2000;

function isStr(v: unknown, min: number, max: number): v is string {
  return typeof v === 'string' && v.length >= min && v.length <= max;
}

/** 허용 필드(rating/title/content)만 추려낸다. 하나도 없으면 null. */
function validate(body: unknown): ReviewPatch | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const patch: ReviewPatch = {};

  if (b.rating !== undefined) {
    if (typeof b.rating !== 'number' || !Number.isInteger(b.rating) || b.rating < 1 || b.rating > 5) return null;
    patch.rating = b.rating;
  }
  if (b.title !== undefined) {
    if (!isStr(b.title, 0, MAX_TITLE)) return null;
    patch.title = b.title;
  }
  if (b.content !== undefined) {
    if (!isStr(b.content, 1, MAX_CONTENT)) return null;
    patch.content = b.content;
  }

  if (Object.keys(patch).length === 0) return null;
  return patch;
}

/** PATCH /api/reviews/[id] — 본인 구매평 수정(rating/title/content만). */
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const activeMember = await requireActiveMember();
  if (!activeMember.ok) {
    return activeMember.response;
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
    const review = await updateReviewByOwner(id, activeMember.memberId, patch);
    if (!review) {
      return NextResponse.json({ error: 'not-found' }, { status: 404 });
    }
    return NextResponse.json({ review }, { status: 200 });
  } catch (error) {
    logServerError('[PATCH /api/reviews/[id]] 수정 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}

/** DELETE /api/reviews/[id] — 본인 구매평 삭제. */
export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const activeMember = await requireActiveMember();
  if (!activeMember.ok) {
    return activeMember.response;
  }

  try {
    const deleted = await deleteReviewByOwner(id, activeMember.memberId);
    if (!deleted) {
      return NextResponse.json({ error: 'not-found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logServerError('[DELETE /api/reviews/[id]] 삭제 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
