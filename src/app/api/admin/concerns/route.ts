import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { defaultConcernsConfig, type ConcernsConfig } from '@/lib/concerns/config';
import { getConcernsConfig, saveConcernsConfig } from '@/lib/concerns/repo';
import type { Concern, FAQ } from '@/types';
import { logServerError } from '@/lib/logServerError';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function isFaq(item: unknown): item is FAQ {
  if (!item || typeof item !== 'object') return false;
  const faq = item as Partial<Record<keyof FAQ, unknown>>;
  return isNonEmptyString(faq.question) && isNonEmptyString(faq.answer);
}

function isConcern(item: unknown): item is Concern {
  if (!item || typeof item !== 'object') return false;
  const concern = item as Partial<Record<keyof Concern, unknown>>;
  return (
    isNonEmptyString(concern.slug) &&
    isNonEmptyString(concern.title) &&
    isNonEmptyString(concern.icon) &&
    isNonEmptyString(concern.shortDescription) &&
    isNonEmptyString(concern.description) &&
    isStringArray(concern.symptoms) &&
    isStringArray(concern.causes) &&
    isStringArray(concern.recommendedProductIds) &&
    isStringArray(concern.recommendedBrandIds) &&
    isNonEmptyString(concern.insuranceCta) &&
    Array.isArray(concern.faq) &&
    concern.faq.every(isFaq)
  );
}

/**
 * 본문이 ConcernsConfig 모양인지 검증한다.
 * items 는 최소 1건 — 전부 삭제하면 공개 케어 가이드·회원가입 관심사 select 가 통째로 빈다.
 * slug 는 상세 라우트(/concerns/[slug])·상점 필터의 식별 키라 중복을 거부한다.
 */
function isConcernsConfig(body: unknown): body is ConcernsConfig {
  if (!body || typeof body !== 'object') return false;
  const { items } = body as { items?: unknown };
  if (!Array.isArray(items) || items.length < 1 || !items.every(isConcern)) return false;
  const slugs = items.map((concern) => concern.slug);
  return new Set(slugs).size === slugs.length;
}

/**
 * GET /api/admin/concerns — 관리자 고민 config 조회.
 * 저장된 행이 있으면 그 값을, 없으면 defaultConcernsConfig 를 반환한다. 조회 실패는 500 으로 드러낸다.
 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  let config: ConcernsConfig = defaultConcernsConfig;
  try {
    const saved = await getConcernsConfig();
    if (saved) config = saved;
  } catch (error) {
    logServerError('[GET /api/admin/concerns] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
  return NextResponse.json({ items: config.items }, { status: 200 });
}

/** PUT /api/admin/concerns — 관리자 고민 config 저장. requireAdmin 이 role+DB 이중 가드. */
export async function PUT(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }
  if (!isConcernsConfig(body)) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  try {
    await saveConcernsConfig({ items: body.items });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logServerError('[PUT /api/admin/concerns] 저장 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
