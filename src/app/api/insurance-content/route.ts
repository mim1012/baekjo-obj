import { NextResponse } from 'next/server';
import { defaultInsuranceContentConfig, type InsuranceContentConfig } from '@/lib/insuranceContent/config';
import { getInsuranceContentConfig } from '@/lib/insuranceContent/repo';
import { logServerError } from '@/lib/logServerError';

/**
 * GET /api/insurance-content — 공개 보험 콘텐츠 조회(보험 화면 /insurance 가 동의 전문·FAQ 를 읽는다).
 * 저장된 행이 있으면 그 값을, 없거나 조회에 실패하면 defaultInsuranceContentConfig 로 폴백한다.
 * 공개 화면(Golden Flow #3)이라 절대 500 을 내지 않는다 — 무슨 일이 있어도 동의 전문·FAQ가 있어야 한다.
 */
export async function GET() {
  let config: InsuranceContentConfig = defaultInsuranceContentConfig;
  try {
    const saved = await getInsuranceContentConfig();
    if (saved) config = saved;
  } catch (error) {
    logServerError('[GET /api/insurance-content] 조회 실패 — defaultInsuranceContentConfig 로 폴백', error);
  }
  return NextResponse.json({ consents: config.consents, faqs: config.faqs }, { status: 200 });
}
