import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import type { QnaConfig } from '@/lib/qna/config';
import { saveQnaConfig } from '@/lib/qna/repo';
import { logServerError } from '@/lib/logServerError';

/**
 * 본문이 QnaConfig 모양인지 최소 검증한다. items 가 배열이면 통과(빈 배열 허용 — 관리자가
 * 전부 삭제하는 것도 유효한 상태). 통째로 jsonb 로 들어가므로 items 가 배열인지만 확인해
 * 깨진 페이로드가 저장돼 상품상세 Q&A 탭이 조용히 깨지는 것을 막는다(§4).
 */
function isQnaConfig(body: unknown): body is QnaConfig {
  return !!body && typeof body === 'object' && Array.isArray((body as { items?: unknown }).items);
}

/**
 * PUT /api/admin/qna — 관리자 Q&A config 저장. 공개 조회는 GET /api/qna 로 분리돼 있다.
 * requireAdmin 이 role+DB 이중 가드(admin/survey 와 동일 방어).
 */
export async function PUT(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }
  if (!isQnaConfig(body)) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  try {
    await saveQnaConfig({ items: body.items });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logServerError('[PUT /api/admin/qna] 저장 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
