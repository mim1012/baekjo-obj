import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { defaultKitsConfig, type KitsConfig } from '@/lib/kits/config';
import { getKitsConfig, saveKitsConfig } from '@/lib/kits/repo';
import { logServerError } from '@/lib/logServerError';

/**
 * 본문이 KitsConfig 모양인지 최소 검증한다. items 가 배열이면 통과(빈 배열 허용 — 관리자가
 * 전부 삭제하는 것도 유효한 상태). 통째로 jsonb 로 들어가므로 items 가 배열인지만 확인해
 * 깨진 페이로드가 저장되는 것을 막는다(§4).
 */
function isKitsConfig(body: unknown): body is KitsConfig {
  return !!body && typeof body === 'object' && Array.isArray((body as { items?: unknown }).items);
}

/**
 * GET /api/admin/kits — 관리자 케어 키트 목록. 공개 소비자가 없어 관리자 전용이다.
 * 저장된 행이 있으면 그 값을, 없거나 조회 실패 시 defaultKitsConfig 로 폴백한다.
 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  let config: KitsConfig = defaultKitsConfig;
  try {
    const saved = await getKitsConfig();
    if (saved) config = saved;
  } catch (error) {
    logServerError('[GET /api/admin/kits] 조회 실패 — defaultKitsConfig 로 폴백', error);
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
