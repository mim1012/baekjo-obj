import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import {
  defaultOrderPolicyConfig,
  normalizeOrderPolicyConfig,
  type OrderPolicyConfig,
} from '@/lib/orderPolicy/config';
import { getOrderPolicyConfig, saveOrderPolicyConfig } from '@/lib/orderPolicy/repo';
import { logServerError } from '@/lib/logServerError';

/**
 * 본문이 OrderPolicyConfig 모양인지 검증한다. normalize 는 절대 throw 하지 않고 무엇이든
 * 기본값으로 접어버리므로, 관리자 저장 경로에서는 명백히 깨진 페이로드(비객체·필드 누락·
 * 비수치)를 조용히 72h 로 둔갑시켜 저장하지 않도록 여기서 400 으로 먼저 거른다(§4).
 * 범위 밖 숫자는 거부 대신 normalize 클램프에 맡긴다(입력 UI 의 min/max 와 이중 방어).
 */
function isOrderPolicyShape(body: unknown): body is OrderPolicyConfig {
  if (!body || typeof body !== 'object') return false;
  const raw = (body as Record<string, unknown>).bankTransferTtlHours;
  return typeof raw === 'number' && Number.isFinite(raw);
}

/**
 * GET /api/admin/order-policy — 관리자 주문 정책(무통장 TTL) 조회.
 * 저장된 행이 있으면 그 값을, 없으면 defaultOrderPolicyConfig 를 반환한다. 조회 실패는 500 으로 드러낸다
 * (주문 생성 경로의 폴백과 달리, 관리자 화면은 장애를 숨기면 기본값을 실값으로 오인해 저장할 위험이 있다).
 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const saved = await getOrderPolicyConfig();
    return NextResponse.json(saved ?? defaultOrderPolicyConfig, { status: 200 });
  } catch (error) {
    logServerError('[GET /api/admin/order-policy] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}

/** PUT /api/admin/order-policy — 관리자 주문 정책 저장. requireAdmin 이 role+DB 이중 가드. */
export async function PUT(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }
  if (!isOrderPolicyShape(body)) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  try {
    // 저장은 항상 normalize 를 거친다 — 정수 반올림·[1,720] 클램프된 값만 DB 에 남겨
    // 주문 생성 경로가 깨진 값을 읽을 일 자체를 없앤다.
    await saveOrderPolicyConfig(normalizeOrderPolicyConfig(body));
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logServerError('[PUT /api/admin/order-policy] 저장 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
