import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { insertInsuranceApplication, type InsertInsuranceInput } from '@/lib/insurance/repo';
import { logServerError } from '@/lib/logServerError';

// 거대 페이로드 방어(공개·게스트 허용 엔드포인트라 상한이 필수 — App Router 는 기본 본문 크기 제한이 없다).
const MAX_NAME = 100;
const MAX_PHONE = 40;
const MAX_SHORT = 200;
const MAX_TEXT = 2000;
const MAX_COVERAGE = 20;

function isStr(v: unknown, min: number, max: number): v is string {
  return typeof v === 'string' && v.length >= min && v.length <= max;
}

function optStr(v: unknown, max: number): string | undefined {
  return typeof v === 'string' && v.length <= max ? v : undefined;
}

function optBool(v: unknown): boolean | undefined {
  return typeof v === 'boolean' ? v : undefined;
}

/**
 * 신뢰 가능한 입력만 검증해 뽑는다. id/createdAt/member_id 는 서버가 정하고, status 는 항상
 * '신청완료'로 고정한다(상담완료 위조 차단). memo 는 관리자 전용이라 생성 시 받지 않는다.
 */
function validate(body: unknown): InsertInsuranceInput | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;

  if (!isStr(b.name, 1, MAX_NAME)) return null;
  if (!isStr(b.phone, 1, MAX_PHONE)) return null;
  if (!isStr(b.petName, 1, MAX_SHORT)) return null;
  if (!isStr(b.petType, 1, MAX_SHORT)) return null;
  if (!isStr(b.breed, 0, MAX_SHORT)) return null;
  if (
    typeof b.petAge !== 'number' ||
    !Number.isInteger(b.petAge) ||
    b.petAge < 0 ||
    b.petAge > 100
  )
    return null;
  if (!Array.isArray(b.coverageNeeds) || b.coverageNeeds.length > MAX_COVERAGE) return null;
  const coverageNeeds = b.coverageNeeds.filter(
    (v): v is string => typeof v === 'string' && v.length <= MAX_SHORT,
  );
  if (coverageNeeds.length !== b.coverageNeeds.length) return null;
  if (b.message !== undefined && !isStr(b.message, 0, MAX_TEXT)) return null;

  return {
    name: b.name,
    phone: b.phone,
    petName: b.petName,
    petType: b.petType,
    breed: b.breed,
    petAge: b.petAge,
    coverageNeeds,
    message: typeof b.message === 'string' ? b.message : '',
    privacyAgree: optBool(b.privacyAgree) ?? false,
    thirdPartyAgree: optBool(b.thirdPartyAgree) ?? false,
    // 서버 고정 — 신규 신청은 항상 '신청완료'로 접수된다.
    status: '신청완료',
    contacted: false,
    ...(optStr(b.petBreed, MAX_SHORT) !== undefined ? { petBreed: optStr(b.petBreed, MAX_SHORT) } : {}),
    ...(optBool(b.hasCurrentInsurance) !== undefined
      ? { hasCurrentInsurance: optBool(b.hasCurrentInsurance) }
      : {}),
    ...(optStr(b.currentInsuranceName, MAX_SHORT) !== undefined
      ? { currentInsuranceName: optStr(b.currentInsuranceName, MAX_SHORT) }
      : {}),
    ...(optStr(b.medicalHistory, MAX_TEXT) !== undefined
      ? { medicalHistory: optStr(b.medicalHistory, MAX_TEXT) }
      : {}),
    ...(optStr(b.targetPremium, MAX_SHORT) !== undefined
      ? { targetPremium: optStr(b.targetPremium, MAX_SHORT) }
      : {}),
    ...(optBool(b.neutered) !== undefined ? { neutered: optBool(b.neutered) } : {}),
    ...(optStr(b.gender, MAX_SHORT) !== undefined ? { gender: optStr(b.gender, MAX_SHORT) } : {}),
    ...(optStr(b.concerns, MAX_TEXT) !== undefined ? { concerns: optStr(b.concerns, MAX_TEXT) } : {}),
    ...(optStr(b.ownerName, MAX_NAME) !== undefined ? { ownerName: optStr(b.ownerName, MAX_NAME) } : {}),
  };
}

/**
 * POST /api/insurance — 보험 분석 신청 생성(공개, 게스트 신청 허용).
 * 세션이 있으면 member_id를 서버가 부여하고, 없으면 게스트(null). id/createdAt/member_id 및
 * status는 본문을 신뢰하지 않고 서버가 정한다(mass-assignment·상태 위조 차단).
 */
export async function POST(request: NextRequest) {
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
    const session = await auth();
    const memberId = session?.user?.memberId ?? null;
    const application = await insertInsuranceApplication(validated, memberId);
    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    logServerError('[POST /api/insurance] 신청 생성 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
