import { NextResponse } from 'next/server';
import { defaultQnaConfig, type QnaConfig } from '@/lib/qna/config';
import { getQnaConfig } from '@/lib/qna/repo';
import { logServerError } from '@/lib/logServerError';

/**
 * GET /api/qna — 공개 Q&A config 조회(상품상세 /shop/[id] Q&A 탭·마이페이지가 읽는다).
 * 저장된 행이 있으면 그 값을, 없거나 조회에 실패하면 defaultQnaConfig 로 폴백한다.
 * 공개 화면(Golden Flow #2)이라 절대 500 을 내지 않는다 — 무슨 일이 있어도 items 배열이 있어야 한다.
 */
export async function GET() {
  let config: QnaConfig = defaultQnaConfig;
  try {
    const saved = await getQnaConfig();
    if (saved) config = saved;
  } catch (error) {
    logServerError('[GET /api/qna] 조회 실패 — defaultQnaConfig 로 폴백', error);
  }
  return NextResponse.json({ items: config.items }, { status: 200 });
}
