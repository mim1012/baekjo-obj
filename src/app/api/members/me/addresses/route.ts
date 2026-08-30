import { NextResponse } from 'next/server';
import { requireActiveMember } from '@/lib/members/requireActiveMember';
import {
  createMemberAddress,
  listMemberAddresses,
  type MemberAddressInput,
} from '@/lib/members/addressRepo';
import { logServerError } from '@/lib/logServerError';

const MAX_LABEL = 30;
const MAX_NAME = 50;
const MAX_PHONE = 40;
const MAX_POSTAL_CODE = 20;
const MAX_ADDRESS_LINE = 250;

interface AddressBody {
  label?: unknown;
  recipientName?: unknown;
  phone?: unknown;
  postalCode?: unknown;
  addressLine1?: unknown;
  addressLine2?: unknown;
  isDefault?: unknown;
}

function text(value: unknown, max: number, required: boolean): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (required && trimmed.length === 0) return null;
  if (trimmed.length > max) return null;
  return trimmed;
}

function parseAddressBody(body: unknown): MemberAddressInput | null {
  if (!body || typeof body !== 'object') return null;
  const value = body as AddressBody;
  const label = text(value.label, MAX_LABEL, true);
  const recipientName = text(value.recipientName, MAX_NAME, true);
  const phone = text(value.phone, MAX_PHONE, true);
  const postalCode = text(value.postalCode, MAX_POSTAL_CODE, true);
  const addressLine1 = text(value.addressLine1, MAX_ADDRESS_LINE, true);
  const addressLine2 = text(value.addressLine2 ?? '', MAX_ADDRESS_LINE, false);
  if (!label || !recipientName || !phone || !postalCode || !addressLine1 || addressLine2 === null) return null;
  if (value.isDefault !== undefined && typeof value.isDefault !== 'boolean') return null;
  return { label, recipientName, phone, postalCode, addressLine1, addressLine2, isDefault: value.isDefault === true };
}

export async function GET() {
  const activeMember = await requireActiveMember();
  if (!activeMember.ok) return activeMember.response;

  try {
    const addresses = await listMemberAddresses(activeMember.memberId);
    return NextResponse.json({ addresses }, { status: 200 });
  } catch (error) {
    logServerError('[GET /api/members/me/addresses] 배송지 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const activeMember = await requireActiveMember();
  if (!activeMember.ok) return activeMember.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }
  const input = parseAddressBody(body);
  if (!input) return NextResponse.json({ error: 'invalid-input' }, { status: 400 });

  try {
    const address = await createMemberAddress(activeMember.memberId, input);
    return NextResponse.json({ address }, { status: 201 });
  } catch (error) {
    logServerError('[POST /api/members/me/addresses] 배송지 저장 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
