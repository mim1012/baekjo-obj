import { NextResponse } from 'next/server';
import { DuplicateEmailError, insertEmailMember, toUser } from '@/lib/members/repo';
import { hashPassword } from '@/lib/members/password';
import { logServerError } from '@/lib/logServerError';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface SignupBody {
  name?: unknown;
  email?: unknown;
  password?: unknown;
  phone?: unknown;
  petType?: unknown;
  breed?: unknown;
  mainConcern?: unknown;
}

interface ValidatedSignup {
  name: string;
  email: string;
  password: string;
  phone: string;
  petType?: string;
  breed?: string;
  mainConcern?: string;
}

function validate(body: SignupBody): ValidatedSignup | null {
  const { name, email, password, phone, petType, breed, mainConcern } = body;

  if (typeof name !== 'string' || name.length < 1 || name.length > 50) return null;
  if (typeof email !== 'string' || !EMAIL_PATTERN.test(email)) return null;
  // bcrypt는 72바이트까지만 본다 — 멀티바이트(한글 등) 비밀번호는 문자 수가 아니라
  // UTF-8 바이트 수로 제한을 걸어야 사용자가 입력한 만큼이 실제로 검증에 반영된다.
  if (
    typeof password !== 'string' ||
    password.length < 6 ||
    Buffer.byteLength(password, 'utf8') > 72
  )
    return null;
  if (typeof phone !== 'string') return null;
  if (petType !== undefined && typeof petType !== 'string') return null;
  if (breed !== undefined && typeof breed !== 'string') return null;
  if (mainConcern !== undefined && typeof mainConcern !== 'string') return null;

  return {
    name,
    email,
    password,
    phone,
    ...(petType ? { petType } : {}),
    ...(breed ? { breed } : {}),
    ...(mainConcern ? { mainConcern } : {}),
  };
}

/** POST /api/members — 이메일/비밀번호 회원가입. */
export async function POST(request: Request) {
  let body: SignupBody;
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
    const member = await insertEmailMember({
      name: validated.name,
      email: validated.email,
      phone: validated.phone,
      passwordHash,
      petType: validated.petType,
      breed: validated.breed,
      mainConcern: validated.mainConcern,
    });
    return NextResponse.json({ user: toUser(member) }, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateEmailError) {
      return NextResponse.json({ error: 'duplicate-email' }, { status: 409 });
    }
    logServerError('[POST /api/members] 회원가입 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
