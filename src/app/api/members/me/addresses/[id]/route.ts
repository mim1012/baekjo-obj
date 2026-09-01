import { NextResponse } from 'next/server';
import { requireActiveMember } from '@/lib/members/requireActiveMember';
import {
  deleteMemberAddress,
  updateMemberAddress,
  type MemberAddressPatch,
} from '@/lib/members/addressRepo';
import { logServerError } from '@/lib/logServerError';

const MAX_LABEL = 30;
const MAX_NAME = 50;
const MAX_PHONE = 40;
const MAX_POSTAL_CODE = 20;
const MAX_ADDRESS_LINE = 250;

interface AddressPatchBody {
  label?: unknown;
  recipientName?: unknown;
  phone?: unknown;
  postalCode?: unknown;
  addressLine1?: unknown;
  addressLine2?: unknown;
  isDefault?: unknown;
}

function optionalText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length <= max ? trimmed : null;
}

function parsePatchBody(body: unknown): MemberAddressPatch | null {
  if (!body || typeof body !== 'object') return null;
  const value = body as AddressPatchBody;
  const patch: MemberAddressPatch = {};
  if (value.label !== undefined) {
    const parsed = optionalText(value.label, MAX_LABEL);
    if (parsed === null || parsed.length === 0) return null;
    patch.label = parsed;
  }
  if (value.recipientName !== undefined) {
    const parsed = optionalText(value.recipientName, MAX_NAME);
    if (parsed === null || parsed.length === 0) return null;
    patch.recipientName = parsed;
  }
  if (value.phone !== undefined) {
    const parsed = optionalText(value.phone, MAX_PHONE);
    if (parsed === null || parsed.length === 0) return null;
    patch.phone = parsed;
  }
  if (value.postalCode !== undefined) {
    const parsed = optionalText(value.postalCode, MAX_POSTAL_CODE);
    if (parsed === null || parsed.length === 0) return null;
    patch.postalCode = parsed;
  }
  if (value.addressLine1 !== undefined) {
    const parsed = optionalText(value.addressLine1, MAX_ADDRESS_LINE);
    if (parsed === null || parsed.length === 0) return null;
    patch.addressLine1 = parsed;
  }
  if (value.addressLine2 !== undefined) {
    const parsed = optionalText(value.addressLine2, MAX_ADDRESS_LINE);
    if (parsed === null) return null;
    patch.addressLine2 = parsed;
  }
  if (value.isDefault !== undefined) {
    if (typeof value.isDefault !== 'boolean') return null;
    patch.isDefault = value.isDefault;
  }
  return Object.keys(patch).length > 0 ? patch : null;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const activeMember = await requireActiveMember();
  if (!activeMember.ok) return activeMember.response;
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }
  const patch = parsePatchBody(body);
  if (!patch) return NextResponse.json({ error: 'invalid-input' }, { status: 400 });

  try {
    const address = await updateMemberAddress(activeMember.memberId, id, patch);
    if (!address) return NextResponse.json({ error: 'not-found' }, { status: 404 });
    return NextResponse.json({ address }, { status: 200 });
  } catch (error) {
    logServerError('[PATCH /api/members/me/addresses/:id] 배송지 수정 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const activeMember = await requireActiveMember();
  if (!activeMember.ok) return activeMember.response;
  const { id } = await context.params;

  try {
    const deleted = await deleteMemberAddress(activeMember.memberId, id);
    if (!deleted) return NextResponse.json({ error: 'not-found' }, { status: 404 });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logServerError('[DELETE /api/members/me/addresses/:id] 배송지 삭제 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
