import { NextResponse } from 'next/server';
import { getConcernsConfigWithFallback } from '@/lib/concerns/repo';

/**
 * GET /api/concerns — 공개 고민 config 조회(회원가입 관심사 select 등 클라이언트 화면이 읽는다).
 * 저장된 행이 있으면 그 값을, 없거나 조회에 실패하면 defaultConcernsConfig 로 폴백한다.
 * 공개 화면이라 절대 500 을 내지 않는다 — 무슨 일이 있어도 고민 목록이 있어야 한다(survey 패턴).
 */
export async function GET() {
  const config = await getConcernsConfigWithFallback();
  return NextResponse.json({ items: config.items }, { status: 200 });
}
