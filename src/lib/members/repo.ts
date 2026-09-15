// members 테이블 접근 계층. 이 파일 밖에서는 Supabase를 직접 호출하지 않는다.
import { getSupabase } from '@/lib/supabase/server';
import { isMemberProfileComplete } from '@/lib/members/profile';
import type { MemberListQuery } from '@/lib/members/listQuery';
import type { AdminMemberPage, User } from '@/types';

/** DB 레코드 + 내부 전용 필드(비밀번호 해시). toUser()를 거치지 않고는 클라이언트로 반환하지 않는다. */
export type MemberRecord = User & { passwordHash: string | null; sessionVersion: number };

/** 이메일 unique 제약(Postgres 23505) 위반 시 던지는 타입드 에러. */
export class DuplicateEmailError extends Error {
  constructor() {
    super('이미 가입된 이메일입니다.');
    this.name = 'DuplicateEmailError';
  }
}

interface MemberRow {
  id: string;
  email: string;
  name: string;
  phone: string;
  password_hash: string | null;
  provider: 'email' | 'kakao' | 'naver';
  provider_id: string | null;
  pet_type: string | null;
  breed: string | null;
  main_concern: string | null;
  role: 'user' | 'admin' | 'b2b' | 'insurance' | 'partner';
  status: 'active' | 'inactive' | 'pending' | 'rejected' | 'withdrawn';
  profile_image: string | null;
  email_verified: boolean;
  created_at: string;
  company_name: string | null;
  business_number: string | null;
  reject_reason: string | null;
  signup_data: Record<string, unknown>;
  managed_brand_ids: string[] | null;
  must_change_password: boolean;
  /** 0172 마이그레이션 적용 전까지 staging에는 컬럼이 없다 — SELECT_COLUMNS에는 아직 넣지 않으므로
   *  항상 undefined/null로 온다. rowToRecord가 ?? 0으로 흡수한다. */
  session_version: number | null;
}

/** 세션 무효화(F1)용 컬럼명. 0172 마이그레이션이 컬럼을 만들기 전까지는 SELECT_COLUMNS에
 *  넣지 않는다 — staging에 컬럼이 없는 상태로 SELECT하면 전 로그인이 500이 난다.
 *  U1이 마이그레이션 적용 후 memberSelectColumns(true)로 호출부를 전환한다. */
export const SESSION_VERSION_COLUMN = 'session_version';

const SELECT_COLUMNS =
  'id, email, name, phone, password_hash, provider, provider_id, pet_type, breed, main_concern, role, status, profile_image, email_verified, created_at, company_name, business_number, reject_reason, signup_data, managed_brand_ids, must_change_password';

/** DB에 session_version 컬럼이 존재하는 배포 이후에만 true로 호출한다. */
export function memberSelectColumns(withSessionVersion: boolean): string {
  return withSessionVersion ? `${SELECT_COLUMNS}, ${SESSION_VERSION_COLUMN}` : SELECT_COLUMNS;
}

function rowToRecord(row: MemberRow): MemberRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    petType: row.pet_type ?? undefined,
    breed: row.breed ?? undefined,
    mainConcern: row.main_concern ?? undefined,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
    provider: row.provider,
    profileImage: row.profile_image ?? undefined,
    emailVerified: row.email_verified,
    passwordHash: row.password_hash,
    sessionVersion: row.session_version ?? 0,
    companyName: row.company_name ?? undefined,
    businessNumber: row.business_number ?? undefined,
    rejectReason: row.reject_reason ?? undefined,
    signupData: row.signup_data,
    managedBrandIds: row.managed_brand_ids ?? undefined,
    mustChangePassword: row.must_change_password,
  };
}

/** MemberRecord → 화면에 내려줄 User (비밀번호 해시 제거). */
export function toUser(record: MemberRecord): User {
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    phone: record.phone,
    petType: record.petType,
    breed: record.breed,
    mainConcern: record.mainConcern,
    role: record.role,
    status: record.status,
    createdAt: record.createdAt,
    provider: record.provider,
    profileImage: record.profileImage,
    profileCompleted: isMemberProfileComplete(record),
    emailVerified: record.emailVerified,
    companyName: record.companyName,
    businessNumber: record.businessNumber,
    rejectReason: record.rejectReason,
    signupData: record.signupData,
    managedBrandIds: record.managedBrandIds,
    mustChangePassword: record.mustChangePassword,
  };
}

function isUniqueViolation(error: { code?: string }): boolean {
  return error.code === '23505';
}

export async function findMemberByEmail(email: string): Promise<MemberRecord | null> {
  const { data, error } = await getSupabase()
    .from('members')
    .select(SELECT_COLUMNS)
    .eq('email', email)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToRecord(data as MemberRow) : null;
}

export async function findMemberByProvider(
  provider: 'kakao' | 'naver',
  providerId: string,
): Promise<MemberRecord | null> {
  const { data, error } = await getSupabase()
    .from('members')
    .select(SELECT_COLUMNS)
    .eq('provider', provider)
    .eq('provider_id', providerId)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToRecord(data as MemberRow) : null;
}

export async function findMemberById(id: string): Promise<MemberRecord | null> {
  const { data, error } = await getSupabase()
    .from('members')
    .select(SELECT_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToRecord(data as MemberRow) : null;
}

export interface InsertEmailMemberInput {
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  petType?: string;
  breed?: string;
  mainConcern?: string;
  termsAgreedAt: string;
  privacyAgreedAt: string;
  termsVersion: string;
  privacyVersion: string;
}

export async function insertEmailMember(input: InsertEmailMemberInput): Promise<MemberRecord> {
  const { data, error } = await getSupabase()
    .from('members')
    .insert({
      name: input.name,
      email: input.email,
      phone: input.phone,
      password_hash: input.passwordHash,
      provider: 'email',
      pet_type: input.petType ?? null,
      breed: input.breed ?? null,
      main_concern: input.mainConcern ?? null,
      terms_agreed_at: input.termsAgreedAt,
      privacy_agreed_at: input.privacyAgreedAt,
      terms_version: input.termsVersion,
      privacy_version: input.privacyVersion,
      role: 'user',
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error) {
    if (isUniqueViolation(error)) throw new DuplicateEmailError();
    throw error;
  }
  return rowToRecord(data as MemberRow);
}

export interface UpsertSocialMemberInput {
  provider: 'kakao' | 'naver';
  providerId: string;
  email: string | null;
  name: string | null;
  profileImage: string | null;
}

/**
 * 소셜 로그인 회원 upsert.
 * ① (provider, provider_id)로 기존 회원 조회 → 있으면 이름/프로필사진만 최신화.
 * ② 없고 이메일이 있으면 이메일로 기존 회원 조회 → 있으면 그대로 반환(계정 연동은 범위 밖 — provider/비밀번호 덮어쓰지 않음).
 * ③ 둘 다 없으면 신규 생성(role은 항상 'user').
 *
 * ⚠️ status !== 'active'(정지·탈퇴·대기·반려)인 기존 행은 이름/프로필사진을 절대 갱신하지 않고
 * 그대로 반환한다. 탈퇴 시 익명화한 이름('(탈퇴회원)')·프로필사진(null)을 카카오/네이버가 넘기는
 * 실명·사진으로 되돌리는 경로를 막는다(§CRITICAL-1 — opus 리뷰. withdrawMember가 provider_id를
 * null화하므로 사실 findMemberByProvider가 이 행을 다시 찾지도 못하지만, 방어적으로 이중 차단).
 * 이 함수를 호출하는 auth.ts의 signIn 콜백이 반환된 status를 보고 로그인 자체를 거부한다.
 */
export async function upsertSocialMember(input: UpsertSocialMemberInput): Promise<MemberRecord> {
  const existingByProvider = await findMemberByProvider(input.provider, input.providerId);
  if (existingByProvider) {
    if (existingByProvider.status !== 'active') {
      return existingByProvider;
    }

    const nextName = input.name ?? existingByProvider.name;
    const nextImage = input.profileImage ?? existingByProvider.profileImage ?? null;
    const changed =
      nextName !== existingByProvider.name ||
      nextImage !== (existingByProvider.profileImage ?? null);
    if (!changed) return existingByProvider;

    const { data, error } = await getSupabase()
      .from('members')
      .update({ name: nextName, profile_image: nextImage })
      .eq('id', existingByProvider.id)
      .select(SELECT_COLUMNS)
      .single();
    if (error) throw error;
    return rowToRecord(data as MemberRow);
  }

  if (input.email) {
    const existingByEmail = await findMemberByEmail(input.email);
    if (existingByEmail) return existingByEmail;
  }

  const fallbackEmail =
    input.email ?? `social-${input.provider}-${input.providerId}@placeholder.baekjo`;

  const { data, error } = await getSupabase()
    .from('members')
    .insert({
      email: fallbackEmail,
      name: input.name ?? '백조오브제 회원',
      phone: '',
      provider: input.provider,
      provider_id: input.providerId,
      profile_image: input.profileImage,
      role: 'user',
      // 소셜 제공자가 이미 검증한 실제 이메일이면 인증 완료 상태로 넣는다.
      // 플레이스홀더 이메일(이메일 미제공 소셜 계정)은 검증할 대상이 없으므로 false.
      email_verified: Boolean(input.email),
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error) {
    if (isUniqueViolation(error)) {
      // 동시 최초 소셜 로그인 레이스 — 진 쪽 요청이 여기로 온다. 승자가 이미 만든 행을
      // (provider, provider_id) 우선, 그다음 이메일로 재조회해 그대로 반환한다.
      // 에러를 던져 로그인 전체를 실패시키지 않는다.
      const winner =
        (await findMemberByProvider(input.provider, input.providerId)) ??
        (await findMemberByEmail(fallbackEmail));
      if (winner) return winner;
      throw new DuplicateEmailError();
    }
    throw error;
  }
  return rowToRecord(data as MemberRow);
}

export interface UpdateMemberProfileInput {
  name?: string;
  phone?: string;
  petType?: string;
  breed?: string;
  mainConcern?: string;
}

/** 본인 회원정보(이름/연락처/반려동물종·견종/주요고민) 수정. role·status·email 은 이 함수로 바꿀 수 없다 —
 *  호출부(마이페이지 자기 정보 저장)가 화이트리스트 필드만 넘기도록 타입으로 강제한다. */
export async function updateMemberProfile(
  id: string,
  patch: UpdateMemberProfileInput,
): Promise<MemberRecord | null> {
  const columns: Record<string, unknown> = {};
  if (patch.name !== undefined) columns.name = patch.name;
  if (patch.phone !== undefined) columns.phone = patch.phone;
  if (patch.petType !== undefined) columns.pet_type = patch.petType || null;
  if (patch.breed !== undefined) columns.breed = patch.breed || null;
  if (patch.mainConcern !== undefined) columns.main_concern = patch.mainConcern || null;

  const { data, error } = await getSupabase()
    .from('members')
    .update(columns)
    .eq('id', id)
    .select(SELECT_COLUMNS)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToRecord(data as MemberRow) : null;
}

/** 비밀번호 교체(본인 변경·재설정 공용). 운영자가 발급한 초기 비밀번호를 본인 것으로 바꾼
 *  시점이므로 must_change_password 유도 플래그도 함께 내린다. */
export async function updateMemberPassword(id: string, passwordHash: string): Promise<void> {
  const { error } = await getSupabase()
    .from('members')
    .update({ password_hash: passwordHash, must_change_password: false })
    .eq('id', id);
  if (error) throw error;
}

export async function markEmailVerified(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from('members')
    .update({ email_verified: true })
    .eq('id', id);
  if (error) throw error;
}

const MEMBERS_LIST_CAP = 500;

export async function listMembers(): Promise<MemberRecord[]> {
  const { data, error } = await getSupabase()
    .from('members')
    .select(SELECT_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(MEMBERS_LIST_CAP);
  if (error) throw error;
  return (data as MemberRow[]).map(rowToRecord);
}

export interface InsertBusinessMemberInput {
  role: 'b2b' | 'insurance' | 'partner';
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  companyName?: string;
  businessNumber?: string;
  signupData?: Record<string, unknown>;
}

/** B2B/보험/파트너 사업자 회원가입. 승인 전까지 status는 항상 'pending'으로 시작한다. */
export async function insertBusinessMember(input: InsertBusinessMemberInput): Promise<MemberRecord> {
  const { data, error } = await getSupabase()
    .from('members')
    .insert({
      name: input.name,
      email: input.email,
      phone: input.phone,
      password_hash: input.passwordHash,
      provider: 'email',
      role: input.role,
      status: 'pending',
      company_name: input.companyName ?? null,
      business_number: input.businessNumber ?? null,
      signup_data: input.signupData ?? {},
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error) {
    if (isUniqueViolation(error)) throw new DuplicateEmailError();
    throw error;
  }
  return rowToRecord(data as MemberRow);
}

/**
 * 관리자 승인/반려 처리. 대상이 없거나, 현재 상태가 expectedCurrentStatus와 다르면(동시 처리
 * 레이스) null을 반환한다 — `.eq('status', expectedCurrentStatus)`로 조건부 업데이트를 걸어
 * "이미 결정된 건을 또 뒤집는" 경쟁 상태를 DB 레벨에서 막는다.
 */
export async function updateMemberStatus(
  id: string,
  status: 'active' | 'inactive' | 'pending' | 'rejected',
  rejectReason: string | undefined,
  expectedCurrentStatus: 'active' | 'inactive' | 'pending' | 'rejected' | 'withdrawn',
): Promise<MemberRecord | null> {
  const { data, error } = await getSupabase()
    .from('members')
    .update({ status, reject_reason: rejectReason ?? null })
    .eq('id', id)
    .eq('status', expectedCurrentStatus)
    .select(SELECT_COLUMNS)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToRecord(data as MemberRow) : null;
}

export async function approvePartnerMember(
  id: string,
  expectedCurrentStatus: 'pending',
  normalizedBrandAlias: string,
): Promise<MemberRecord | null> {
  const { data, error } = await getSupabase().rpc('approve_partner_member', {
    p_member_id: id,
    p_expected_status: expectedCurrentStatus,
    p_normalized_brand_alias: normalizedBrandAlias,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row ? rowToRecord(row as MemberRow) : null;
}

/**
 * 본인 탈퇴(소프트 탈퇴). status='withdrawn' + PII 익명화(이름·연락처·이메일·프로필사진·가입폼 데이터·
 * 비밀번호 해시·소셜 provider_id·b2b 컬럼).
 * 주문 이력은 삭제하지 않는다 — 전자상거래법 등 거래기록 보존 의무 때문에 소프트 탈퇴로만 처리한다.
 * 이미 탈퇴한 회원(status가 이미 'withdrawn')을 다시 호출해도 멱등하게 true를 반환한다.
 * 이메일은 unique 제약이 있으므로 회원 id를 박아 재사용 불가능한 고정 문자열로 치환한다.
 *
 * withdraw_member RPC가 개인정보 익명화, member_tokens 삭제, 마케팅 수신 철회와 이력 기록을
 * 같은 트랜잭션에서 실행한다. 중간 단계가 실패하면 모두 롤백된다.
 */
export async function withdrawMember(id: string): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('withdraw_member', { p_member_id: id });
  if (error) throw error;
  return data === true;
}

/** 42703 = undefined_column. 0172 마이그레이션이 아직 적용되지 않아 session_version 컬럼이
 *  DB에 없는 상태에서 그 컬럼을 SELECT하면 Postgres가 이 코드로 에러를 낸다. */
function isUndefinedColumnError(error: { code?: string }): boolean {
  return error.code === '42703';
}

/**
 * 로그인(credentials authorize)·기존 토큰 재검증(jwt 콜백)에서만 쓰는 세션버전 인식 조회.
 * session_version 컬럼을 포함해 먼저 시도하고, 0172 미적용으로 컬럼이 없으면(42703) 레거시
 * 컬럼만으로 재조회해 폴백한다 — rowToRecord가 없는 session_version을 0으로 흡수하므로 이 경우
 * 모든 회원이 버전 0으로 취급된다(로그인은 막히지 않되, 세션 무효화 기능은 마이그레이션 적용
 * 이후에만 실제로 작동함). 코드/마이그레이션 배포 순서를 서로 강제하지 않기 위한 과도기 설계 —
 * U1이 마이그레이션을 먼저 적용하면 곧바로 정확한 버전을 읽기 시작한다.
 */
export async function findMemberByEmailWithSessionVersion(email: string): Promise<MemberRecord | null> {
  const { data, error } = await getSupabase()
    .from('members')
    .select(memberSelectColumns(true))
    .eq('email', email)
    .maybeSingle();
  if (error) {
    if (isUndefinedColumnError(error)) return findMemberByEmail(email);
    throw error;
  }
  // memberSelectColumns()는 위젠된 string을 반환해 supabase-js가 리터럴 오버로드로 컬럼을
  // 추론하지 못한다(SELECT_COLUMNS 상수를 직접 넘기는 기존 함수들과의 차이) — unknown을 거쳐 캐스팅한다.
  return data ? rowToRecord(data as unknown as MemberRow) : null;
}

/** id 기반 버전. src/lib/auth.ts의 jwt 콜백이 기존 토큰 재검증(else 분기)에 사용한다. */
export async function findMemberByIdWithSessionVersion(id: string): Promise<MemberRecord | null> {
  const { data, error } = await getSupabase()
    .from('members')
    .select(memberSelectColumns(true))
    .eq('id', id)
    .maybeSingle();
  if (error) {
    if (isUndefinedColumnError(error)) return findMemberById(id);
    throw error;
  }
  return data ? rowToRecord(data as unknown as MemberRow) : null;
}

/** listMemberPage()가 list_admin_member_page RPC(0173)의 검증 실패(SQLSTATE PT409,
 *  'INVALID_MEMBER_QUERY')를 매핑해 던지는 타입드 에러. 정상 동작에서는 발생하지 않는다 —
 *  parseMemberListQuery(listQuery.ts)가 이미 같은 화이트리스트로 라우트 진입 전에 걸러내고,
 *  이건 DB 쪽 이중 방어가 걸렸을 때만 나온다. */
export class InvalidMemberQueryError extends Error {
  constructor() {
    super('invalid-member-query');
    this.name = 'InvalidMemberQueryError';
  }
}

function isInvalidMemberQuery(error: { code?: string; message?: string }): boolean {
  return error.code === 'PT409' || (typeof error.message === 'string' && error.message.includes('INVALID_MEMBER_QUERY'));
}

/**
 * 관리자 회원 목록(서버 페이지네이션·검색·역할/상태 필터). list_admin_member_page RPC(0173)가
 * 이미 password_hash를 뺀 화이트리스트 컬럼만 담아 행을 돌려준다 — rowToRecord는 없는
 * password_hash를 그냥 undefined로 흡수하고, toUser()가 클라이언트로 나가기 전 마지막
 * 차단선을 한 번 더 긋는다(§R3 — 이중 방어).
 */
export async function listMemberPage(query: MemberListQuery): Promise<AdminMemberPage> {
  const { data, error } = await getSupabase().rpc('list_admin_member_page', {
    p_page: query.page,
    p_page_size: query.pageSize,
    p_search: query.search,
    p_role: query.role,
    p_status: query.status,
  });
  if (error) {
    if (isInvalidMemberQuery(error)) throw new InvalidMemberQueryError();
    throw error;
  }
  const result = data as Omit<AdminMemberPage, 'users'> & { users: MemberRow[] };
  return { ...result, users: result.users.map((row) => toUser(rowToRecord(row))) };
}
