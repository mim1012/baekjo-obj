import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { defaultKitsConfig, type KitsConfig } from '@/lib/kits/config';
import { getKitsConfig, saveKitsConfig } from '@/lib/kits/repo';
import type { CareKit } from '@/types';
import { logServerError } from '@/lib/logServerError';

const KIT_TYPES: CareKit['type'][] = ['hospital', 'vitality', 'funeral', 'welcome', 'sample'];

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function isCareKit(item: unknown): item is CareKit {
  if (!item || typeof item !== 'object') return false;
  const kit = item as Partial<Record<keyof CareKit, unknown>>;
  return (
    isString(kit.id) &&
    isString(kit.name) &&
    isString(kit.type) &&
    KIT_TYPES.includes(kit.type as CareKit['type']) &&
    isString(kit.target) &&
    isString(kit.location) &&
    isStringArray(kit.items) &&
    isString(kit.purpose) &&
    (kit.partnerId == null || isString(kit.partnerId)) &&
    (kit.stock == null || typeof kit.stock === 'number') &&
    typeof kit.isVisible === 'boolean' &&
    (kit.description == null || isString(kit.description))
  );
}

/**
 * 본문이 KitsConfig 모양인지 검증한다. 빈 배열은 유효하지만, 각 행은 관리자
 * 렌더링과 repo readback 이 기대하는 CareKit 모양이어야 한다.
 */
function isKitsConfig(body: unknown): body is KitsConfig {
  return (
    !!body &&
    typeof body === 'object' &&
    Array.isArray((body as { items?: unknown }).items) &&
    (body as { items: unknown[] }).items.every(isCareKit)
  );
}

/**
 * GET /api/admin/kits — 관리자 케어 키트 목록. 공개 소비자가 없어 관리자 전용이다.
 * 저장된 행이 있으면 그 값을, 없으면 defaultKitsConfig 를 반환한다. 조회 실패는 500 으로 드러낸다.
 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  let config: KitsConfig = defaultKitsConfig;
  try {
    const saved = await getKitsConfig();
    if (saved) config = saved;
  } catch (error) {
    logServerError('[GET /api/admin/kits] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
  return NextResponse.json({ items: config.items }, { status: 200 });
}

/** PUT /api/admin/kits — 관리자 케어 키트 config 저장. requireAdmin 이 role+DB 이중 가드. */
export async function PUT(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }
  if (!isKitsConfig(body)) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  try {
    await saveKitsConfig({ items: body.items });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logServerError('[PUT /api/admin/kits] 저장 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
