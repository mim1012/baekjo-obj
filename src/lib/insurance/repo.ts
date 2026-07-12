// insurance_applications 테이블 접근 계층. 이 파일 밖에서는 Supabase를 직접 호출하지 않는다.
import { getSupabase } from '@/lib/supabase/server';
import type { InsuranceApplication } from '@/types';

/**
 * 신청 생성 입력. id/createdAt/member_id 는 서버가 정하므로 여기서 받지 않는다(mass-assignment 차단).
 * status 는 라우트가 서버 정책으로 부여해서 넘긴다(orders 의 InsertOrderInput 과 동일 패턴).
 */
export type InsertInsuranceInput = Omit<InsuranceApplication, 'id' | 'createdAt'>;

/** 관리자 상태/메모/연락여부 변경. 허용 필드만 반영한다(라우트에서 화이트리스트 검증됨). */
export type InsurancePatch = {
  status?: InsuranceApplication['status'];
  memo?: string;
  contacted?: boolean;
};

interface InsuranceRow {
  id: string;
  member_id: string | null;
  name: string;
  phone: string;
  pet_name: string;
  pet_type: string;
  pet_age: number;
  status: string;
  contacted: boolean;
  memo: string | null;
  detail: unknown;
  created_at: string;
}

const SELECT_COLUMNS =
  'id, member_id, name, phone, pet_name, pet_type, pet_age, status, contacted, memo, detail, created_at';

const INSURANCE_LIST_CAP = 1000;

/** jsonb detail 을 안전하게 객체로 본다. 객체가 아니면 빈 객체로 방어한다. */
function asDetail(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

function asStringArray(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((v): v is string => typeof v === 'string') : [];
}

function optString(raw: unknown): string | undefined {
  return typeof raw === 'string' ? raw : undefined;
}

function optBool(raw: unknown): boolean | undefined {
  return typeof raw === 'boolean' ? raw : undefined;
}

/**
 * DB 행 → 화면 타입 InsuranceApplication. 핵심 컬럼은 열에서, 선택적 긴 꼬리는 detail jsonb 에서
 * 풀어 평평한 모양으로 되돌린다 → 소비자(화면) 입장에서 타입이 바뀌지 않는다(§4).
 */
function rowToApplication(row: InsuranceRow): InsuranceApplication {
  const detail = asDetail(row.detail);
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    petName: row.pet_name,
    petType: row.pet_type,
    petAge: row.pet_age,
    status: row.status as InsuranceApplication['status'],
    contacted: row.contacted,
    memo: row.memo ?? undefined,
    createdAt: row.created_at,
    // detail jsonb 에서 복원하는 선택적 꼬리들
    breed: optString(detail.breed) ?? '',
    coverageNeeds: asStringArray(detail.coverageNeeds),
    message: optString(detail.message) ?? '',
    privacyAgree: optBool(detail.privacyAgree) ?? false,
    thirdPartyAgree: optBool(detail.thirdPartyAgree) ?? false,
    petBreed: optString(detail.petBreed),
    hasCurrentInsurance: optBool(detail.hasCurrentInsurance),
    currentInsuranceName: optString(detail.currentInsuranceName),
    medicalHistory: optString(detail.medicalHistory),
    targetPremium: optString(detail.targetPremium),
    neutered: optBool(detail.neutered),
    gender: optString(detail.gender),
    concerns: optString(detail.concerns),
    ownerName: optString(detail.ownerName),
  };
}

/** 입력의 선택적 꼬리들을 detail jsonb 로 모은다(undefined 는 제외해 깨끗하게 저장). */
function toDetail(input: InsertInsuranceInput): Record<string, unknown> {
  const detail: Record<string, unknown> = {
    breed: input.breed,
    coverageNeeds: input.coverageNeeds,
    message: input.message,
    privacyAgree: input.privacyAgree,
    thirdPartyAgree: input.thirdPartyAgree,
  };
  const optionalEntries: Array<[string, unknown]> = [
    ['petBreed', input.petBreed],
    ['hasCurrentInsurance', input.hasCurrentInsurance],
    ['currentInsuranceName', input.currentInsuranceName],
    ['medicalHistory', input.medicalHistory],
    ['targetPremium', input.targetPremium],
    ['neutered', input.neutered],
    ['gender', input.gender],
    ['concerns', input.concerns],
    ['ownerName', input.ownerName],
  ];
  for (const [key, value] of optionalEntries) {
    if (value !== undefined) detail[key] = value;
  }
  return detail;
}

export async function insertInsuranceApplication(
  input: InsertInsuranceInput,
  memberId: string | null,
): Promise<InsuranceApplication> {
  const { data, error } = await getSupabase()
    .from('insurance_applications')
    .insert({
      member_id: memberId,
      name: input.name,
      phone: input.phone,
      pet_name: input.petName,
      pet_type: input.petType,
      pet_age: input.petAge,
      status: input.status,
      contacted: input.contacted ?? false,
      memo: input.memo ?? null,
      detail: toDetail(input),
    })
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw error;
  return rowToApplication(data as InsuranceRow);
}

export async function listInsuranceApplications(): Promise<InsuranceApplication[]> {
  const { data, error } = await getSupabase()
    .from('insurance_applications')
    .select(SELECT_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(INSURANCE_LIST_CAP);
  if (error) throw error;
  return (data as InsuranceRow[]).map(rowToApplication);
}

export async function listInsuranceApplicationsByMember(
  memberId: string,
): Promise<InsuranceApplication[]> {
  const { data, error } = await getSupabase()
    .from('insurance_applications')
    .select(SELECT_COLUMNS)
    .eq('member_id', memberId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as InsuranceRow[]).map(rowToApplication);
}

/** 관리자 상태/메모/연락여부 변경. 허용 필드만 patch 한다. 대상이 없으면 null. */
export async function updateInsuranceApplication(
  id: string,
  patch: InsurancePatch,
): Promise<InsuranceApplication | null> {
  const update: Record<string, string | boolean | null> = {};
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.memo !== undefined) update.memo = patch.memo;
  if (patch.contacted !== undefined) update.contacted = patch.contacted;
  if (Object.keys(update).length === 0) return null;

  const { data, error } = await getSupabase()
    .from('insurance_applications')
    .update(update)
    .eq('id', id)
    .select(SELECT_COLUMNS)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToApplication(data as InsuranceRow) : null;
}
