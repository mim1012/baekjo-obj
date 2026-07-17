import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { updatePartnerInquiryStatus } from '@/lib/partnerInquiries/repo';
import { PARTNER_INQUIRY_STATUSES, type PartnerInquiryStatus } from '@/types';
import { logServerError } from '@/lib/logServerError';

const MAX_MEMO = 2000;

type PartnerInquiryPatch = { status: PartnerInquiryStatus; memo?: string };

const ALLOWED_PATCH_KEYS = new Set(['status', 'memo']);

/** status(필수, enum)와 memo(선택)만 허용한다. 그 외 필드가 섞이면 무시가 아니라 통째로 거부(400). */
function validate(body: unknown): PartnerInquiryPatch | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;

  if (Object.keys(b).some((key) => !ALLOWED_PATCH_KEYS.has(key))) return null;
  if (typeof b.status !== 'string') return null;
  if (!PARTNER_INQUIRY_STATUSES.includes(b.status as PartnerInquiryStatus)) return null;

  const patch: PartnerInquiryPatch = { status: b.status as PartnerInquiryStatus };
  if (b.memo !== undefined) {
    if (typeof b.memo !== 'string' || b.memo.length > MAX_MEMO) return null;
    patch.memo = b.memo;
  }
  return patch;
}

/**
 * PATCH /api/admin/partner-inquiries/[id] — 관리자 제휴 문의 상태/메모 변경.
 * proxy 1차 가드 + requireAdmin DB 재검증. 허용 필드(status/memo)만 반영한다.
 */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

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
    const inquiry = await updatePartnerInquiryStatus(id, patch.status, patch.memo);
    if (!inquiry) {
      return NextResponse.json({ error: 'not-found' }, { status: 404 });
    }
    return NextResponse.json({ inquiry }, { status: 200 });
  } catch (error) {
    logServerError('[PATCH /api/admin/partner-inquiries/[id]] 수정 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
