import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { defaultPartnersConfig, type PartnersConfig } from '@/lib/partners/config';
import { getPartnersConfig, savePartnersConfig } from '@/lib/partners/repo';
import type { Partner } from '@/types';
import { logServerError } from '@/lib/logServerError';

const PARTNER_TYPES: Partner['type'][] = ['hospital', 'funeral', 'brand', 'hotel', 'etc'];
const PARTNER_STATUSES: Partner['status'][] = ['문의', '상담중', '제안서 발송', '계약 검토', '계약 완료', '납품 준비', '운영중', '보류', '종료'];

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function isPartner(item: unknown): item is Partner {
  if (!item || typeof item !== 'object') return false;
  const partner = item as Partial<Record<keyof Partner, unknown>>;
  return (
    isString(partner.id) &&
    isString(partner.name) &&
    isString(partner.type) &&
    PARTNER_TYPES.includes(partner.type as Partner['type']) &&
    isString(partner.contactPerson) &&
    isString(partner.phone) &&
    isString(partner.address) &&
    isString(partner.cooperationType) &&
    isStringArray(partner.providedKits) &&
    isString(partner.status) &&
    PARTNER_STATUSES.includes(partner.status as Partner['status']) &&
    (partner.memo == null || isString(partner.memo)) &&
    typeof partner.isContracted === 'boolean' &&
    typeof partner.isDelivered === 'boolean'
  );
}

/**
 * 본문이 PartnersConfig 모양인지 검증한다. 빈 배열은 유효하지만, 각 행은 관리자
 * 렌더링과 repo readback 이 기대하는 Partner 모양이어야 한다.
 */
function isPartnersConfig(body: unknown): body is PartnersConfig {
  return (
    !!body &&
    typeof body === 'object' &&
    Array.isArray((body as { items?: unknown }).items) &&
    (body as { items: unknown[] }).items.every(isPartner)
  );
}

/**
 * GET /api/admin/partners — 관리자 B2B 제휴처 목록. 공개 소비자가 없어 관리자 전용이다.
 * 저장된 행이 있으면 그 값을, 없으면 defaultPartnersConfig 를 반환한다. 조회 실패는 500 으로 드러낸다.
 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  let config: PartnersConfig = defaultPartnersConfig;
  try {
    const saved = await getPartnersConfig();
    if (saved) config = saved;
  } catch (error) {
    logServerError('[GET /api/admin/partners] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
  return NextResponse.json({ items: config.items }, { status: 200 });
}

/** PUT /api/admin/partners — 관리자 제휴처 config 저장. requireAdmin 이 role+DB 이중 가드. */
export async function PUT(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }
  if (!isPartnersConfig(body)) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  try {
    await savePartnersConfig({ items: body.items });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logServerError('[PUT /api/admin/partners] 저장 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
