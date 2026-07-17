import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import {
  defaultInsuranceContentConfig,
  type ConsentDoc,
  type InsuranceContentConfig,
  type InsuranceFaq,
} from '@/lib/insuranceContent/config';
import { getInsuranceContentConfig, saveInsuranceContentConfig } from '@/lib/insuranceContent/repo';
import { logServerError } from '@/lib/logServerError';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isConsentDoc(item: unknown): item is ConsentDoc {
  if (!item || typeof item !== 'object') return false;
  const doc = item as Partial<Record<keyof ConsentDoc, unknown>>;
  return (
    isNonEmptyString(doc.id) &&
    isNonEmptyString(doc.title) &&
    typeof doc.required === 'boolean' &&
    isNonEmptyString(doc.body)
  );
}

function isInsuranceFaq(item: unknown): item is InsuranceFaq {
  if (!item || typeof item !== 'object') return false;
  const faq = item as Partial<Record<keyof InsuranceFaq, unknown>>;
  return isNonEmptyString(faq.id) && isNonEmptyString(faq.q) && isNonEmptyString(faq.a);
}

/**
 * 법정 동의 문서 id — consents 에 이 id 들이 required 로 반드시 존재해야 한다(추가 문서는 자유).
 * 공개 신청 저장 API(saveInsuranceApplication)의 privacyAgree/thirdPartyAgree 법정 동의 플래그가
 * 이 두 id 에 매핑된다 — 삭제·id변경을 허용하면 동의 기록의 의미가 소실된다(codex 리뷰 F1).
 */
const REQUIRED_LEGAL_CONSENT_IDS = ['privacy', 'analysis'] as const;

/**
 * 본문이 InsuranceContentConfig 모양인지 검증한다.
 * consents 는 최소 1건 — 전부 삭제하면 공개 신청 폼의 동의 체크가 사라져 신청 플로우가 깨진다.
 * consents id 는 공개 폼 체크 상태 매핑 키라 중복도 거부한다. 법정 동의 문서('privacy'/'analysis')는
 * required 상태로 반드시 존재해야 한다. faqs 는 빈 배열을 허용한다.
 */
function isInsuranceContentConfig(body: unknown): body is InsuranceContentConfig {
  if (!body || typeof body !== 'object') return false;
  const { consents, faqs } = body as { consents?: unknown; faqs?: unknown };
  if (!Array.isArray(consents) || consents.length < 1 || !consents.every(isConsentDoc)) return false;
  const consentIds = consents.map((consent) => consent.id);
  if (new Set(consentIds).size !== consentIds.length) return false;
  const hasRequiredLegalConsents = REQUIRED_LEGAL_CONSENT_IDS.every((legalId) =>
    consents.some((consent) => consent.id === legalId && consent.required),
  );
  if (!hasRequiredLegalConsents) return false;
  return Array.isArray(faqs) && faqs.every(isInsuranceFaq);
}

/**
 * GET /api/admin/insurance-content — 관리자 보험 콘텐츠(동의 전문·FAQ) 조회.
 * 저장된 행이 있으면 그 값을, 없으면 defaultInsuranceContentConfig 를 반환한다. 조회 실패는 500 으로 드러낸다.
 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  let config: InsuranceContentConfig = defaultInsuranceContentConfig;
  try {
    const saved = await getInsuranceContentConfig();
    if (saved) config = saved;
  } catch (error) {
    logServerError('[GET /api/admin/insurance-content] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
  return NextResponse.json({ consents: config.consents, faqs: config.faqs }, { status: 200 });
}

/** PUT /api/admin/insurance-content — 관리자 보험 콘텐츠 저장. requireAdmin 이 role+DB 이중 가드. */
export async function PUT(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }
  if (!isInsuranceContentConfig(body)) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  try {
    await saveInsuranceContentConfig({ consents: body.consents, faqs: body.faqs });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logServerError('[PUT /api/admin/insurance-content] 저장 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
