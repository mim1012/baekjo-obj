import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { findMemberById, toUser, updateMemberStatus } from '@/lib/members/repo';
import {
  isAllowedMemberStatusTransition,
  type AdminSettableMemberStatus,
} from '@/lib/members/statusTransitions';
import { logServerError } from '@/lib/logServerError';

// 이 엔드포인트가 허용하는 목표 상태. 승인/반려(pending→active|rejected)에 더해
// 정지/재활성(active→inactive, inactive→active)도 다룬다. 'withdrawn'은 회원 본인만
// (members/me DELETE → withdrawMember) 진입 가능한 상태라 관리자 전환 대상이 아니다.
// 실제 현재→목표 허용 표는 statusTransitions.ts(공용, UI와 공유)를 참조한다.
const TARGET_STATUSES = ['active', 'inactive', 'rejected'] as const satisfies readonly AdminSettableMemberStatus[];
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
    // 관리자 계정은 정지·승인·반려 대상이 될 수 없다 — 자기 자신을 포함해 관리자를 실수로/악의적으로
    // 정지하면 콘솔이 잠기는 사고를 차단한다.
    if (target.role === 'admin') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    // members.status는 DB에서 not-null(기본값 'active')이라 실질적으로 항상 채워져 있다 —
    // User.status가 타입상 optional인 건 다른 문맥(예: 소셜 upsert 응답)의 일반화 때문이다.
    const currentStatus = target.status ?? 'pending';

    // 현재 상태에서 허용되지 않은 전이는 충돌로 취급한다(예: pending이 아닌데 승인/반려 요청,
    // withdrawn/rejected 상태를 관리자가 되살리려는 시도 등). statusTransitions.ts에 없는 조합은 전부 거부.
    if (!isAllowedMemberStatusTransition(currentStatus, body.status)) {
      return NextResponse.json({ error: 'conflict' }, { status: 409 });
    }

    const rejectReason = body.status === 'rejected' ? body.rejectReason : undefined;
    const updated = await updateMemberStatus(id, body.status, rejectReason, currentStatus);
    if (!updated) {
      // 위 allowedTargets 체크 이후에도 null이면 동시 요청이 먼저 상태를 바꾼 것 —
      // 조건부 업데이트(.eq('status', target.status))가 막아낸 경쟁 상태다.
      return NextResponse.json({ error: 'conflict' }, { status: 409 });
    }

    return NextResponse.json({ user: toUser(updated) }, { status: 200 });
  } catch (error) {
    logServerError('[PATCH /api/admin/members/[id]] 상태 변경 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
