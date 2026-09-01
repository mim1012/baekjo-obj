import { NextResponse, after, type NextRequest } from 'next/server';
import { DuplicateEmailError, insertBusinessMember, toUser } from '@/lib/members/repo';
import { hashPassword } from '@/lib/members/password';
import { logServerError } from '@/lib/logServerError';
import { checkAuthRateLimit, requestRateLimitKey } from '@/lib/security/authRateLimit';
import { sweepOrphanUploads } from '@/lib/members/sweepOrphanUploads';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BUSINESS_ROLES = ['b2b', 'insurance', 'partner'] as const;
type BusinessRole = (typeof BUSINESS_ROLES)[number];

interface BusinessSignupBody {
  role?: unknown;
  name?: unknown;
  email?: unknown;
  password?: unknown;
  phone?: unknown;
  companyName?: unknown;
  businessNumber?: unknown;
  signupData?: unknown;
}

interface ValidatedBusinessSignup {
  role: BusinessRole;
  name: string;
  email: string;
  password: string;
  phone: string;
  companyName?: string;
  businessNumber?: string;
  signupData: Record<string, unknown>;
}

function isBusinessRole(value: unknown): value is BusinessRole {
  return typeof value === 'string' && (BUSINESS_ROLES as readonly string[]).includes(value);
}

// 클라이언트 3종 폼(PartnerSignupForm/B2BSignupForm/InsuranceSignupForm)이 모두
// signupData.attachedFiles = [{ category, name, path }, ...] 형태로 보낸다. 서버는 지금까지
// 이 필드를 전혀 검사하지 않아, 폼 검증을 우회한 요청(직접 API 호출 등)이 첨부서류 없이도
// 가입될 수 있었다. 개수 상한(20)은 비정상적으로 큰 payload로 signup_data(jsonb)를
// 부풀리는 것을 막기 위함이다.
const MAX_ATTACHED_FILES = 20;
const MAX_ATTACHED_FILE_PATH_LENGTH = 500;
const MAX_ATTACHED_FILE_NAME_LENGTH = 200;

function isSaneAttachedFileEntry(value: unknown): boolean {
  if (typeof value === 'string') {
    return value.length > 0 && value.length <= MAX_ATTACHED_FILE_PATH_LENGTH;
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const { path, name } = value as Record<string, unknown>;
  if (typeof path !== 'string' || path.length === 0 || path.length > MAX_ATTACHED_FILE_PATH_LENGTH) {
    return false;
  }
  if (name !== undefined && (typeof name !== 'string' || name.length > MAX_ATTACHED_FILE_NAME_LENGTH)) {
    return false;
  }
  return true;
}

/** partner/b2b/insurance 세 역할 모두 첨부서류 최소 1건을 서버에서도 강제한다(클라이언트 검증 우회 방지). */
function hasRequiredDocuments(signupData: Record<string, unknown>): boolean {
  const attachedFiles = signupData.attachedFiles;
  if (!Array.isArray(attachedFiles)) return false;
  if (attachedFiles.length < 1 || attachedFiles.length > MAX_ATTACHED_FILES) return false;
  return attachedFiles.every(isSaneAttachedFileEntry);
}

function validate(body: BusinessSignupBody): ValidatedBusinessSignup | null {
  const { role, name, email, password, phone, companyName, businessNumber, signupData } = body;

  if (!isBusinessRole(role)) return null;
  if (typeof name !== 'string' || name.length < 1 || name.length > 50) return null;
  if (typeof email !== 'string' || !EMAIL_PATTERN.test(email) || email.length > 254) return null;
  // bcrypt는 72바이트까지만 본다 — 멀티바이트(한글 등) 비밀번호는 문자 수가 아니라
  // UTF-8 바이트 수로 제한을 걸어야 사용자가 입력한 만큼이 실제로 검증에 반영된다.
  if (
    typeof password !== 'string' ||
    password.length < 6 ||
    Buffer.byteLength(password, 'utf8') > 72
  )
    return null;
  if (typeof phone !== 'string' || phone.length > 30) return null;
  if (companyName !== undefined && (typeof companyName !== 'string' || companyName.length > 120))
    return null;
  if (
    businessNumber !== undefined &&
    (typeof businessNumber !== 'string' || businessNumber.length > 40)
  )
    return null;
  if (signupData !== undefined && (typeof signupData !== 'object' || signupData === null || Array.isArray(signupData)))
    return null;

  // 평문 비밀번호·토큰류가 signup_data(jsonb)에 저장되지 않도록 민감 키를 서버에서 제거한다.
  // 프론트가 폼 전체를 signupData로 보내도(dad 폼 구조) 여기서 방어적으로 걸러낸다.
  // 이름에 password/token/secret이 포함된 키는 전부 제거(대소문자 무관, 부분 일치).
  const rawSignup = (signupData as Record<string, unknown> | undefined) ?? {};
  const SENSITIVE_KEY_PATTERN = /password|token|secret/i;
  const safeSignupData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rawSignup)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) continue;
    safeSignupData[key] = value;
  }

  // signup_data(jsonb) 저장 크기 상한 — 과대 payload로 DB row를 부풀리는 것을 방지.
  if (JSON.stringify(safeSignupData).length > 20000) return null;

  // 보험사 탭은 별도 companyName/businessNumber 필드를 보내지 않고 signupData 안에
  // insuranceCompany/insuranceRegNumber로만 담아 보낸다. 매핑하지 않으면 company_name/
  // business_number 컬럼이 비어 관리자 회원 목록에서 소속 보험사 정보가 보이지 않는다.
  // signupData(jsonb)에는 원본 필드를 그대로 남겨 두어 기존 조회 경로도 계속 동작한다.
  let resolvedCompanyName = companyName;
  let resolvedBusinessNumber = businessNumber;
  if (role === 'insurance') {
    const insuranceCompany = safeSignupData.insuranceCompany;
    const insuranceRegNumber = safeSignupData.insuranceRegNumber;
    if (!resolvedCompanyName && typeof insuranceCompany === 'string' && insuranceCompany.length > 0) {
      resolvedCompanyName = insuranceCompany;
    }
    if (!resolvedBusinessNumber && typeof insuranceRegNumber === 'string' && insuranceRegNumber.length > 0) {
      resolvedBusinessNumber = insuranceRegNumber;
    }
  }

  return {
    role,
    name,
    email,
    password,
    phone,
    ...(resolvedCompanyName ? { companyName: resolvedCompanyName } : {}),
    ...(resolvedBusinessNumber ? { businessNumber: resolvedBusinessNumber } : {}),
    signupData: safeSignupData,
  };
}

/**
 * POST /api/members/business — B2B/보험/파트너 사업자 회원가입.
 * 승인 전까지 status는 'pending'으로 시작하며, 관리자 승인 전이므로 인증 메일은 보내지 않는다.
 */
export async function POST(request: NextRequest) {
  let body: BusinessSignupBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  const validated = validate(body);
  if (!validated) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  // 세 역할(partner/b2b/insurance) 모두 첨부서류 최소 1건이 필수다. 지금까지는 클라이언트
  // 폼만 이를 검증했고 서버는 signupData를 그대로 저장했다 — 폼을 거치지 않은 직접 요청은
  // 첨부서류 없이도 가입될 수 있었다.
  if (!hasRequiredDocuments(validated.signupData)) {
    return NextResponse.json({ error: 'missing-documents' }, { status: 400 });
  }

  if (!checkAuthRateLimit('business-signup', requestRateLimitKey(request))) {
    return NextResponse.json({ error: 'too-many-requests' }, { status: 429 });
  }

  try {
    const passwordHash = await hashPassword(validated.password);
    const member = await insertBusinessMember({
      role: validated.role,
      name: validated.name,
      email: validated.email,
      phone: validated.phone,
      passwordHash,
      companyName: validated.companyName,
      businessNumber: validated.businessNumber,
      signupData: validated.signupData,
    });

    // 업로드는 회원 row 생성 전에 먼저 signup-docs에 저장되므로, 중도 이탈/실패한 이전
    // 시도들이 참조 없는 고아 파일을 남길 수 있다. 새 크론을 만들지 않고(Vercel Hobby 크론
    // 예산 협소) 가입이 하나 성공할 때마다 응답 이후 기회적으로만 정리를 시도한다.
    // sweepOrphanUploads()는 내부에서 모든 실패를 삼키므로 이 응답에는 영향을 주지 않는다.
    after(() => sweepOrphanUploads());

    return NextResponse.json({ user: toUser(member) }, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateEmailError) {
      return NextResponse.json({ error: 'duplicate-email' }, { status: 409 });
    }
    logServerError('[POST /api/members/business] 사업자 회원가입 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
