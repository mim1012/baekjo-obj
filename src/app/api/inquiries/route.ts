import { NextResponse, type NextRequest } from 'next/server';
import { requireActiveMember } from '@/lib/members/requireActiveMember';
import { getProductById } from '@/lib/products/repo';
import { insertInquiry, type InsertInquiryInput } from '@/lib/inquiries/repo';
import { logServerError } from '@/lib/logServerError';

const MAX_PRODUCT_ID = 100;
const MAX_TITLE = 200;
const MAX_CONTENT = 2000;

function isStr(v: unknown, min: number, max: number): v is string {
  return typeof v === 'string' && v.length >= min && v.length <= max;
}

interface ValidatedBody {
  productId: string;
  title: string;
  content: string;
  isSecret: boolean;
}

function validate(body: unknown): ValidatedBody | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;

  if (!isStr(b.productId, 1, MAX_PRODUCT_ID)) return null;
  if (!isStr(b.title, 1, MAX_TITLE)) return null;
  if (!isStr(b.content, 1, MAX_CONTENT)) return null;
  if (b.isSecret !== undefined && typeof b.isSecret !== 'boolean') return null;

  return {
    productId: b.productId,
    title: b.title,
    content: b.content,
    isSecret: b.isSecret === true,
  };
}

/**
 * POST /api/inquiries — 상품문의 작성(세션 필요). brandId는 본문을 신뢰하지 않고
 * productId로 조회한 실제 브랜드로 덮어쓴다(§4 — 잘못된 브랜드 배정 시 파트너 답변 인가가 깨진다).
 */
export async function POST(request: NextRequest) {
  const activeMember = await requireActiveMember();
  if (!activeMember.ok) {
    return activeMember.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  const validated = validate(body);
  if (!validated) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  try {
    const product = await getProductById(validated.productId, { includeHidden: true });
    if (!product) {
      return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
    }

    const input: InsertInquiryInput = {
      productId: validated.productId,
      brandId: product.brandId,
      title: validated.title,
      content: validated.content,
      isSecret: validated.isSecret,
    };

    const inquiry = await insertInquiry(activeMember.memberId, input);
    return NextResponse.json({ inquiry }, { status: 201 });
  } catch (error) {
    logServerError('[POST /api/inquiries] 작성 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
