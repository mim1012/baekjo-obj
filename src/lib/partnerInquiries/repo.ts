// partner_inquiries 테이블 접근 계층. 이 파일 밖에서는 Supabase를 직접 호출하지 않는다.
import { getSupabase } from '@/lib/supabase/server';
import type { PartnerInquiry, PartnerInquiryStatus } from '@/types';

/**
 * 문의 생성 입력. id/createdAt/status/memo 는 서버가 정하므로 여기서 받지 않는다
 * (mass-assignment 차단 — insurance 의 InsertInsuranceInput 과 동일 패턴).
 */
export type InsertPartnerInquiryInput = Omit<
  PartnerInquiry,
  'id' | 'createdAt' | 'status' | 'memo'
>;

interface PartnerInquiryRow {
  id: string;
  company_name: string;
  contact_person: string;
  phone: string;
  email: string;
  partner_type: string;
  message: string;
  status: string;
  memo: string | null;
  created_at: string;
}

const SELECT_COLUMNS =
  'id, company_name, contact_person, phone, email, partner_type, message, status, memo, created_at';

const PARTNER_INQUIRY_LIST_CAP = 1000;

/** DB 행 → 화면 타입 PartnerInquiry (snake_case → camelCase). */
function rowToPartnerInquiry(row: PartnerInquiryRow): PartnerInquiry {
  return {
    id: row.id,
    companyName: row.company_name,
    contactPerson: row.contact_person,
    phone: row.phone,
    email: row.email,
    partnerType: row.partner_type as PartnerInquiry['partnerType'],
    message: row.message,
    status: row.status as PartnerInquiryStatus,
    memo: row.memo ?? undefined,
    createdAt: row.created_at,
  };
}

/** 관리자 전체 문의 목록. 최신 접수 순(created_at desc). */
export async function listPartnerInquiries(): Promise<PartnerInquiry[]> {
  const { data, error } = await getSupabase()
    .from('partner_inquiries')
    .select(SELECT_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(PARTNER_INQUIRY_LIST_CAP);
  if (error) throw error;
  return (data as PartnerInquiryRow[]).map(rowToPartnerInquiry);
}

/** 문의 생성. status('접수')·id·created_at 은 DB default 로 서버가 결정한다. */
export async function createPartnerInquiry(
  input: InsertPartnerInquiryInput,
): Promise<PartnerInquiry> {
  const { data, error } = await getSupabase()
    .from('partner_inquiries')
    .insert({
      company_name: input.companyName,
      contact_person: input.contactPerson,
      phone: input.phone,
      email: input.email,
      partner_type: input.partnerType,
      message: input.message,
    })
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw error;
  return rowToPartnerInquiry(data as PartnerInquiryRow);
}

/** 관리자 상태/메모 변경. 허용 필드만 반영한다. 대상이 없으면 null. */
export async function updatePartnerInquiryStatus(
  id: string,
  status: PartnerInquiryStatus,
  memo?: string,
): Promise<PartnerInquiry | null> {
  const update: Record<string, string> = { status };
  if (memo !== undefined) update.memo = memo;

  const { data, error } = await getSupabase()
    .from('partner_inquiries')
    .update(update)
    .eq('id', id)
    .select(SELECT_COLUMNS)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToPartnerInquiry(data as PartnerInquiryRow) : null;
}
