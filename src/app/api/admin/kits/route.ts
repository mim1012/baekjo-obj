import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { resolvePublicKitsConfig, type KitsConfig } from '@/lib/kits/config';
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
    isStringArray(kit.items) &&
    isString(kit.purpose) &&
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
 * GET /api/admin/kits — 공개 케어키트와 완전히 같은 목록을 관리자에게 반환한다.
 * 과거 기본 자료가 남아 있어도 공개 화면과 같은 보정 결과를 보여 준다. 조회 실패는 500 으로 드러낸다.
 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  let config: KitsConfig;
  try {
    const saved = await getKitsConfig();
    config = resolvePublicKitsConfig(saved);
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
