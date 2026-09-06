import type { Seller, SellerStatus } from '@/types';

const MAX_NAME = 200;
const MAX_TEXT = 500;
const MAX_NUMBER = 50;
const MAX_PHONE = 50;
const MAX_EMAIL = 254;
const MAX_PRICE = 100_000_000;
const STATUSES = new Set<SellerStatus>(['draft', 'verified', 'suspended']);

function text(value: unknown, max: number, required = false): string | undefined | null {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if ((required && trimmed.length === 0) || trimmed.length > max) return null;
  return trimmed;
}

export type SellerWriteInput = Omit<Seller, 'id' | 'createdAt' | 'updatedAt'>;
export type SellerPatchInput = Partial<SellerWriteInput>;

export function isSellerLegallyComplete(seller: Partial<Seller>): boolean {
  const requiredTextComplete = [
    seller.displayName,
    seller.legalName,
    seller.representativeName,
    seller.businessRegistrationNumber,
    seller.mailOrderRegistrationNumber,
    seller.businessAddress,
    seller.phone,
    seller.dispatchEstimate,
    seller.returnPolicy,
  ].every((value) => typeof value === 'string' && value.trim().length > 0);
  return requiredTextComplete
    && typeof seller.shippingFee === 'number'
    && Number.isSafeInteger(seller.shippingFee)
    && seller.shippingFee >= 0;
}

export function validateSellerInput(raw: unknown, requireAll: boolean): SellerPatchInput | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const body = raw as Record<string, unknown>;
  const out: SellerPatchInput = {};

  const requiredFields = [
    ['displayName', MAX_NAME],
    ['legalName', MAX_NAME],
    ['representativeName', MAX_NAME],
    ['businessRegistrationNumber', MAX_NUMBER],
    ['mailOrderRegistrationNumber', MAX_NUMBER],
    ['businessAddress', MAX_TEXT],
    ['phone', MAX_PHONE],
    ['dispatchEstimate', MAX_TEXT],
    ['returnPolicy', MAX_TEXT],
  ] as const;

  for (const [field, max] of requiredFields) {
    const value = text(body[field], max, requireAll);
    if (value === null || (requireAll && value === undefined)) return null;
    if (value !== undefined) out[field] = value;
  }

  for (const [field, max] of [['email', MAX_EMAIL], ['returnAddress', MAX_TEXT]] as const) {
    const value = text(body[field], max);
    if (value === null) return null;
    if (value !== undefined) out[field] = value;
  }

  if (body.shippingFee !== undefined) {
    if (typeof body.shippingFee !== 'number' || !Number.isSafeInteger(body.shippingFee)
      || body.shippingFee < 0 || body.shippingFee > MAX_PRICE) return null;
    out.shippingFee = body.shippingFee;
  } else if (requireAll) return null;

  if (body.freeShippingThreshold !== undefined && body.freeShippingThreshold !== null) {
    if (typeof body.freeShippingThreshold !== 'number' || !Number.isSafeInteger(body.freeShippingThreshold)
      || body.freeShippingThreshold < 0 || body.freeShippingThreshold > MAX_PRICE) return null;
    out.freeShippingThreshold = body.freeShippingThreshold;
  } else if (body.freeShippingThreshold === null) {
    out.freeShippingThreshold = undefined;
  }

  if (body.status !== undefined) {
    if (typeof body.status !== 'string' || !STATUSES.has(body.status as SellerStatus)) return null;
    out.status = body.status as SellerStatus;
  } else if (requireAll) {
    out.status = 'draft';
  }

  // 생성은 이 단계에서 완전성을 확인할 수 있다. PATCH는 일부 필드만 올 수 있으므로
  // 기존 DB 행과 합친 뒤 repo에서 검증한다.
  if (requireAll && out.status === 'verified' && !isSellerLegallyComplete(out)) return null;
  return out;
}
