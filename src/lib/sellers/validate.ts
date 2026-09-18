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

// 필수 4개(브랜드&상호명·대표자·사업자등록번호)만 검사한다. 통신판매업신고번호·사업장주소·전화·
// 출고안내·반품정책·배송비는 전자상거래법상 통신판매중개 고지 항목이지만, 요청에 따라 선택으로
// 완화한다(값이 있으면 공개, 없으면 공개 화면에서 해당 항목만 숨긴다).
export function isSellerLegallyComplete(seller: Partial<Seller>): boolean {
  return [
    seller.displayName,
    seller.legalName,
    seller.representativeName,
    seller.businessRegistrationNumber,
  ].every((value) => typeof value === 'string' && value.trim().length > 0);
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
  ] as const;

  for (const [field, max] of requiredFields) {
    const value = text(body[field], max, requireAll);
    if (value === null || (requireAll && value === undefined)) return null;
    if (value !== undefined) out[field] = value;
  }

  const optionalTextFields = [
    ['mailOrderRegistrationNumber', MAX_NUMBER],
    ['businessAddress', MAX_TEXT],
    ['phone', MAX_PHONE],
    ['dispatchEstimate', MAX_TEXT],
    ['returnPolicy', MAX_TEXT],
    ['email', MAX_EMAIL],
    ['returnAddress', MAX_TEXT],
  ] as const;

  for (const [field, max] of optionalTextFields) {
    const value = text(body[field], max);
    if (value === null) return null;
    if (value !== undefined) out[field] = value;
  }

  // 배송비는 선택이다 — 미입력이면 DB 기본값(3000원)에 맡긴다.
  if (body.shippingFee !== undefined) {
    if (typeof body.shippingFee !== 'number' || !Number.isSafeInteger(body.shippingFee)
      || body.shippingFee < 0 || body.shippingFee > MAX_PRICE) return null;
    out.shippingFee = body.shippingFee;
  }

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
