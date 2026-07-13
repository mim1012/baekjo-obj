import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { setReviewStatus } from '@/lib/reviews/repo';
import { logServerError } from '@/lib/logServerError';

const ALLOWED_STATUSES = ['published', 'hidden'] as const;

function validate(body: unknown): 'published' | 'hidden' | null {
  if (!body || typeof body !== 'object') return null;
  const status = (body as Record<string, unknown>).status;
  if (typeof status !== 'string') return null;
  if (!ALLOWED_STATUSES.includes(status as (typeof ALLOWED_STATUSES)[number])) return null;
  return status as 'published' | 'hidden';
}

/** PATCH /api/admin/reviews/[id] — 관리자 전용, 구매평 노출 상태 변경. */
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  const status = validate(body);
  if (!status) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  try {
    const review = await setReviewStatus(id, status);
    if (!review) {
      return NextResponse.json({ error: 'not-found' }, { status: 404 });
    }
    return NextResponse.json({ review }, { status: 200 });
  } catch (error) {
    logServerError('[PATCH /api/admin/reviews/[id]] 상태 변경 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
