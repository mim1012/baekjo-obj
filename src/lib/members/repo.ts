// members 테이블 접근 계층. 이 파일 밖에서는 Supabase를 직접 호출하지 않는다.
import { getSupabase } from '@/lib/supabase/server';
import type { User } from '@/types';

/** DB 레코드 + 내부 전용 필드(비밀번호 해시). toUser()를 거치지 않고는 클라이언트로 반환하지 않는다. */
export type MemberRecord = User & { passwordHash: string | null };

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
  status: 'active' | 'inactive' | 'pending' | 'rejected';
  profile_image: string | null;
  email_verified: boolean;
  created_at: string;
  company_name: string | null;
  business_number: string | null;
  reject_reason: string | null;
  signup_data: Record<string, unknown>;
  managed_brand_ids: string[] | null;
}

const SELECT_COLUMNS =
  'id, email, name, phone, password_hash, provider, provider_id, pet_type, breed, main_concern, role, status, profile_image, email_verified, created_at, company_name, business_number, reject_reason, signup_data, managed_brand_ids';

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
    companyName: row.company_name ?? undefined,
    businessNumber: row.business_number ?? undefined,
    rejectReason: row.reject_reason ?? undefined,
    signupData: row.signup_data,
    managedBrandIds: row.managed_brand_ids ?? undefined,
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
    emailVerified: record.emailVerified,
    companyName: record.companyName,
    businessNumber: record.businessNumber,
    rejectReason: record.rejectReason,
    signupData: record.signupData,
    managedBrandIds: record.managedBrandIds,
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
 */
export async function upsertSocialMember(input: UpsertSocialMemberInput): Promise<MemberRecord> {
  const existingByProvider = await findMemberByProvider(input.provider, input.providerId);
  if (existingByProvider) {
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
      name: input.name ?? '백조회원',
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

export async function updateMemberPassword(id: string, passwordHash: string): Promise<void> {
  const { error } = await getSupabase()
    .from('members')
    .update({ password_hash: passwordHash })
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
  expectedCurrentStatus: 'active' | 'inactive' | 'pending' | 'rejected',
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
