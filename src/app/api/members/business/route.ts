import { NextResponse, type NextRequest } from 'next/server';
import { DuplicateEmailError, insertBusinessMember, toUser } from '@/lib/members/repo';
import { hashPassword } from '@/lib/members/password';
import { logServerError } from '@/lib/logServerError';

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

  return {
    role,
    name,
    email,
    password,
    phone,
    ...(companyName ? { companyName } : {}),
    ...(businessNumber ? { businessNumber } : {}),
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

    return NextResponse.json({ user: toUser(member) }, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateEmailError) {
      return NextResponse.json({ error: 'duplicate-email' }, { status: 409 });
    }
    logServerError('[POST /api/members/business] 사업자 회원가입 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
