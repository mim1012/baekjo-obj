import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  findMemberByEmail,
  findMemberById,
  toUser,
  updateMemberProfile,
  type UpdateMemberProfileInput,
} from '@/lib/members/repo';
import { logServerError } from '@/lib/logServerError';

/** GET /api/members/me — 로그인한 본인 회원 정보 조회. */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'no-session' }, { status: 401 });
  }

  try {
    const memberId = session.user.memberId;
    const member = memberId
      ? await findMemberById(memberId)
      : session.user.email
        ? await findMemberByEmail(session.user.email)
        : null;

    if (!member) {
      return NextResponse.json({ error: 'not-found' }, { status: 404 });
    }

    // role은 DB 원본이 아니라 세션 기준으로 덮어쓴다. 소셜 로그인이 이메일 일치로 기존
    // admin 레코드에 그대로 붙는 경우(upsertSocialMember ②)에도 세션 role(항상 'user')이
    // 우선하도록 해, 클라이언트가 실제로는 admin이 아닌데 admin으로 캐시되는 걸 막는다.
    const user = { ...toUser(member), role: session.user.role ?? 'user' };
    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    logServerError('[GET /api/members/me] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}

interface UpdateProfileBody {
  name?: unknown;
  phone?: unknown;
  petType?: unknown;
  breed?: unknown;
  mainConcern?: unknown;
}

/** 화이트리스트 필드만 통과시킨다 — role/status/email 은 body 에 있어도 절대 반영되지 않는다
 *  (updateMemberProfile 자체가 이 필드들을 컬럼으로 매핑하지 않으므로 이중 방어). */
function validateProfilePatch(body: UpdateProfileBody): UpdateMemberProfileInput | null {
  const { name, phone, petType, breed, mainConcern } = body;
  const patch: UpdateMemberProfileInput = {};

  if (name !== undefined) {
    if (typeof name !== 'string' || name.length < 1 || name.length > 50) return null;
    patch.name = name;
  }
  if (phone !== undefined) {
    if (typeof phone !== 'string') return null;
    patch.phone = phone;
  }
  if (petType !== undefined) {
    if (typeof petType !== 'string') return null;
    patch.petType = petType;
  }
  if (breed !== undefined) {
    if (typeof breed !== 'string') return null;
    patch.breed = breed;
  }
  if (mainConcern !== undefined) {
    if (typeof mainConcern !== 'string') return null;
    patch.mainConcern = mainConcern;
  }
  return patch;
}

/** PATCH /api/members/me — 로그인한 본인의 회원정보(이름/연락처/반려동물종·견종/주요고민) 저장.
 *  session 에서 조회한 본인 member.id 로만 업데이트해 self-only 를 보장한다(경로에 id 를 받지 않음). */
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'no-session' }, { status: 401 });
  }

  let body: UpdateProfileBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  const patch = validateProfilePatch(body);
  if (!patch) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  try {
    const memberId = session.user.memberId;
    const member = memberId
      ? await findMemberById(memberId)
      : session.user.email
        ? await findMemberByEmail(session.user.email)
        : null;

    if (!member) {
      return NextResponse.json({ error: 'not-found' }, { status: 404 });
    }

    const updated = await updateMemberProfile(member.id, patch);
    if (!updated) {
      return NextResponse.json({ error: 'not-found' }, { status: 404 });
    }

    // GET과 동일한 이유로 role은 세션 기준을 덮어쓴다(위 GET 핸들러 주석 참조).
    const user = { ...toUser(updated), role: session.user.role ?? 'user' };
    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    logServerError('[PATCH /api/members/me] 회원정보 저장 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
