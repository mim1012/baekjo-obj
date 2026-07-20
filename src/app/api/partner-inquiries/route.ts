import { NextResponse, type NextRequest } from 'next/server';
import { createPartnerInquiry, type InsertPartnerInquiryInput } from '@/lib/partnerInquiries/repo';
import type { PartnerInquiry } from '@/types';
import { logServerError } from '@/lib/logServerError';

// 거대 페이로드 방어(공개·게스트 허용 엔드포인트라 상한이 필수 — App Router 는 기본 본문 크기 제한이 없다).
const MAX_NAME = 100;
const MAX_PHONE = 40;
const MAX_EMAIL = 200;
const MAX_TEXT = 2000;

const PARTNER_TYPES: PartnerInquiry['partnerType'][] = [
  'hospital',
  'funeral',
  'brand',
  'hotel',
  'etc',
];

function isStr(v: unknown, min: number, max: number): v is string {
  return typeof v === 'string' && v.length >= min && v.length <= max;
}

/**
 * 신뢰 가능한 입력만 검증해 뽑는다. id/createdAt/status/memo 는 본문을 무시하고 서버가 정한다
 * (mass-assignment·상태 위조 차단 — POST /api/insurance 와 동일 패턴).
 */
function isPartnerInquiryInput(body: unknown): body is InsertPartnerInquiryInput {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return (
    isStr(b.companyName, 1, MAX_NAME) &&
    isStr(b.contactPerson, 1, MAX_NAME) &&
    isStr(b.phone, 1, MAX_PHONE) &&
    isStr(b.email, 1, MAX_EMAIL) &&
    isStr(b.partnerType, 1, MAX_NAME) &&
    PARTNER_TYPES.includes(b.partnerType as PartnerInquiry['partnerType']) &&
    isStr(b.message, 1, MAX_TEXT)
  );
}

/**
 * POST /api/partner-inquiries — B2B 제휴 문의 생성(공개 — 게스트 제출 허용).
 * id/createdAt/status('접수')는 서버(DB default)가 정한다. 생성 성공 시 201.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  if (!isPartnerInquiryInput(body)) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  try {
    const inquiry = await createPartnerInquiry({
      companyName: body.companyName,
      contactPerson: body.contactPerson,
      phone: body.phone,
      email: body.email,
      partnerType: body.partnerType,
      message: body.message,
    });
    return NextResponse.json({ inquiry }, { status: 201 });
  } catch (error) {
    logServerError('[POST /api/partner-inquiries] 문의 생성 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
