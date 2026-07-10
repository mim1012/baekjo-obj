import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { findMemberById, toUser, updateMemberStatus } from '@/lib/members/repo';
import { logServerError } from '@/lib/logServerError';

// 승인/반려 전환에서만 허용하는 목표 상태. 그 외 상태(active/inactive로의 임의 전환 등)는
// 이 엔드포인트의 책임 범위 밖이라 거부한다.
const TARGET_STATUSES = ['active', 'rejected'] as const;
type TargetMemberStatus = (typeof TARGET_STATUSES)[number];

function isValidTargetStatus(value: unknown): value is TargetMemberStatus {
  return typeof value === 'string' && (TARGET_STATUSES as readonly string[]).includes(value);
}

interface UpdateStatusBody {
  status?: unknown;
  rejectReason?: unknown;
}

/**
 * PATCH /api/admin/members/[id] — 회원 승인/반려/상태 변경.
 * proxy.ts가 /api/admin/* 을 이미 가드하지만 JWT의 role은 로그인 시점 스냅샷이라, DB에서
 * 강등되거나 비활성화돼도 세션이 만료되기 전까지는 그대로 admin 권한을 들고 있다. 그래서
 * requireAdmin()이 매 요청마다 DB에서 최신 상태를 재조회해 실제로도 admin이고 active인지 다시 확인한다.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { id } = await params;

    let body: UpdateStatusBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
    }

    if (!isValidTargetStatus(body.status)) {
      return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
    }
    if (body.rejectReason !== undefined && typeof body.rejectReason !== 'string') {
      return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
    }

    const target = await findMemberById(id);
    if (!target) {
      return NextResponse.json({ error: 'not-found' }, { status: 404 });
    }
    // 관리자 계정은 승인/반려 대상이 될 수 없다 — 관리자를 실수로/악의적으로 반려·재승인하는 것을 차단.
    if (target.role === 'admin') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    // 이미 결정된 건(active/rejected)을 다시 승인/반려하는 것은 충돌로 취급한다.
    if (target.status !== 'pending') {
      return NextResponse.json({ error: 'conflict' }, { status: 409 });
    }

    const rejectReason = body.status === 'rejected' ? body.rejectReason : undefined;
    const updated = await updateMemberStatus(id, body.status, rejectReason, 'pending');
    if (!updated) {
      // target.status !== 'pending' 체크 이후에도 null이면 동시 요청이 먼저 상태를 바꾼 것 —
      // 조건부 업데이트(.eq('status','pending'))가 막아낸 경쟁 상태다.
      return NextResponse.json({ error: 'conflict' }, { status: 409 });
    }

    return NextResponse.json({ user: toUser(updated) }, { status: 200 });
  } catch (error) {
    logServerError('[PATCH /api/admin/members/[id]] 상태 변경 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
