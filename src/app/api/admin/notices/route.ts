import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { defaultNoticesConfig, type NoticesConfig } from '@/lib/notices/config';
import { getNoticesConfig, saveNoticesConfig } from '@/lib/notices/repo';
import { isNoticeShape, normalizeNotice } from '@/lib/notices/validate';
import { logServerError } from '@/lib/logServerError';

/**
 * 본문이 NoticesConfig 모양인지 검증한다. item 단위 형상은 repo 와 공용인
 * isNoticeShape(validate.ts)로 검사하고, 아래는 관리자 저장에만 있는 추가 규칙이다:
 * - items 는 최소 1건 — 전부 삭제하면 공개 공지 목록·홈 소식 4건이 통째로 빈다.
 * - id 는 상세 라우트(/notices/[id])의 식별 키라 중복을 거부한다.
 */
function isNoticesConfig(body: unknown): body is NoticesConfig {
  if (!body || typeof body !== 'object') return false;
  const { items } = body as { items?: unknown };
  if (!Array.isArray(items) || items.length < 1 || !items.every(isNoticeShape)) return false;
  const ids = items.map((notice) => notice.id);
  return new Set(ids).size === ids.length;
}

/**
 * GET /api/admin/notices — 관리자 공지 config 조회.
 * 저장된 행이 있으면 그 값을, 없으면 defaultNoticesConfig 를 반환한다. 조회 실패는 500 으로 드러낸다.
 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  let config: NoticesConfig = defaultNoticesConfig;
  try {
    const saved = await getNoticesConfig();
    if (saved) config = saved;
  } catch (error) {
    logServerError('[GET /api/admin/notices] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
  return NextResponse.json({ items: config.items }, { status: 200 });
}

/** PUT /api/admin/notices — 관리자 공지 config 저장. requireAdmin 이 role+DB 이중 가드. */
export async function PUT(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }
  if (!isNoticesConfig(body)) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  try {
    // category null 은 검증을 통과하므로 저장 전 undefined 로 정규화한다(validate.ts 주석).
    await saveNoticesConfig({ items: body.items.map(normalizeNotice) });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logServerError('[PUT /api/admin/notices] 저장 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
