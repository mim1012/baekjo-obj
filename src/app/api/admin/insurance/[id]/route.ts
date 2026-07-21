import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { findMemberById } from '@/lib/members/repo';
import {
  updateInsuranceApplication,
  deleteInsuranceApplicationById,
  type InsurancePatch,
} from '@/lib/insurance/repo';
import { logServerError } from '@/lib/logServerError';

// status는 InsuranceStatus 유니온 전체가 아니라 admin 화면 select가 실제 쓰는 값만 허용한다.
const ALLOWED_STATUSES = ['신청완료', '분석중', '분석완료', '접수', '상담중', '완료', '보류'] as const;
const MAX_MEMO = 2000;

/** 허용 필드(status/memo/contacted)만 추려낸다. 하나도 없으면 null. */
function validate(body: unknown): InsurancePatch | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const patch: InsurancePatch = {};

  if (b.status !== undefined) {
    if (typeof b.status !== 'string') return null;
    if (!ALLOWED_STATUSES.includes(b.status as (typeof ALLOWED_STATUSES)[number])) return null;
    patch.status = b.status as InsurancePatch['status'];
  }
  if (b.memo !== undefined) {
    if (typeof b.memo !== 'string' || b.memo.length > MAX_MEMO) return null;
    patch.memo = b.memo;
  }
  if (b.contacted !== undefined) {
    if (typeof b.contacted !== 'boolean') return null;
    patch.contacted = b.contacted;
  }

  if (Object.keys(patch).length === 0) return null;
  return patch;
}

/**
 * PATCH /api/admin/insurance/[id] — 관리자 보험 신청 상태/메모/연락여부 변경.
 * proxy 1차 가드 + 라우트 내부 DB 재검증(admin && !inactive). 허용 필드만 반영한다.
 */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json(
      { error: session?.user ? 'forbidden' : 'unauthorized' },
      { status: session?.user ? 403 : 401 },
    );
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
    const requester = session.user.memberId ? await findMemberById(session.user.memberId) : null;
    if (!requester || requester.role !== 'admin' || requester.status === 'inactive') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const application = await updateInsuranceApplication(id, patch);
    if (!application) {
      return NextResponse.json({ error: 'not-found' }, { status: 404 });
    }
    return NextResponse.json({ application }, { status: 200 });
  } catch (error) {
    logServerError('[PATCH /api/admin/insurance/[id]] 수정 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/insurance/[id] — 관리자 보험 신청 삭제(PII 파기).
 * PATCH와 동일한 가드 블록(proxy 1차 가드 + 라우트 내부 DB 재검증). 증권 파일이 있으면
 * deleteInsuranceApplicationById가 비공개 버킷에서도 함께 지운다(파기 완결, repo.ts 참고).
 */
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json(
      { error: session?.user ? 'forbidden' : 'unauthorized' },
      { status: session?.user ? 403 : 401 },
    );
  }

  try {
    const requester = session.user.memberId ? await findMemberById(session.user.memberId) : null;
    if (!requester || requester.role !== 'admin' || requester.status === 'inactive') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const deleted = await deleteInsuranceApplicationById(id);
    if (!deleted) {
      return NextResponse.json({ error: 'not-found' }, { status: 404 });
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logServerError('[DELETE /api/admin/insurance/[id]] 삭제 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
