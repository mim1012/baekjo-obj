import { NextResponse } from 'next/server';
import { requireActiveMember } from '@/lib/members/requireActiveMember';
import { getMarketingPreferences, setMarketingPreferences } from '@/lib/members/marketingRepo';
import { logServerError } from '@/lib/logServerError';

export async function GET() {
  const member = await requireActiveMember();
  if (!member.ok) return member.response;
  try {
    return NextResponse.json({ preferences: await getMarketingPreferences(member.memberId) });
  } catch (error) {
    logServerError('[GET /api/members/me/marketing-preferences] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
export async function PATCH(request: Request) {
  const member = await requireActiveMember();
  if (!member.ok) return member.response;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.email !== 'boolean' || typeof body.sms !== 'boolean') {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }
  try {
    return NextResponse.json({ preferences: await setMarketingPreferences(member.memberId, body.email, body.sms) });
  } catch (error) {
    logServerError('[PATCH /api/members/me/marketing-preferences] 저장 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
