// product_inquiries 테이블 접근 계층. 이 파일 밖에서는 Supabase를 직접 호출하지 않는다.
import { getSupabase } from '@/lib/supabase/server';
import type { ProductInquiry } from '@/types';

interface InquiryRow {
  id: string;
  member_id: string;
  product_id: string;
  brand_id: string | null;
  title: string;
  content: string;
  is_secret: boolean;
  status: 'waiting' | 'answered';
  answer: string | null;
  answered_by: string | null;
  answered_at: string | null;
  created_at: string;
  updated_at: string;
}

const SELECT_COLUMNS =
  'id, member_id, product_id, brand_id, title, content, is_secret, status, answer, answered_by, answered_at, created_at, updated_at';

function rowToInquiry(row: InquiryRow): ProductInquiry {
  return {
    id: row.id,
    userId: row.member_id,
    productId: row.product_id,
    brandId: row.brand_id ?? '',
    title: row.title,
    content: row.content,
    isSecret: row.is_secret,
    status: row.status,
    answer: row.answer ?? undefined,
    answeredBy: row.answered_by ?? undefined,
    answeredAt: row.answered_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const INQUIRIES_LIST_CAP = 1000;

/** 공개 상품상세용 — 특정 상품의 문의 전체(비밀글 포함, redaction은 라우트가 처리). */
export async function listInquiriesByProduct(productId: string): Promise<ProductInquiry[]> {
  const { data, error } = await getSupabase()
    .from('product_inquiries')
    .select(SELECT_COLUMNS)
    .eq('product_id', productId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as InquiryRow[]).map(rowToInquiry);
}

/** 마이페이지용 — 본인 문의 전체. */
export async function listInquiriesByMember(memberId: string): Promise<ProductInquiry[]> {
  const { data, error } = await getSupabase()
    .from('product_inquiries')
    .select(SELECT_COLUMNS)
    .eq('member_id', memberId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as InquiryRow[]).map(rowToInquiry);
}

/** 관리자 전용 — 전체 문의 목록(상한 적용, listAllOrders와 동일 방어). */
export async function listAllInquiries(): Promise<ProductInquiry[]> {
  const { data, error } = await getSupabase()
    .from('product_inquiries')
    .select(SELECT_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(INQUIRIES_LIST_CAP);
  if (error) throw error;
  return (data as InquiryRow[]).map(rowToInquiry);
}

/** 파트너 전용 — 자기 관리 브랜드 목록으로 좁힌 문의. brandIds가 비면 빈 배열(안전 폴백). */
export async function listInquiriesByBrandIds(brandIds: string[]): Promise<ProductInquiry[]> {
  if (brandIds.length === 0) return [];
  const { data, error } = await getSupabase()
    .from('product_inquiries')
    .select(SELECT_COLUMNS)
    .in('brand_id', brandIds)
    .order('created_at', { ascending: false })
    .limit(INQUIRIES_LIST_CAP);
  if (error) throw error;
  return (data as InquiryRow[]).map(rowToInquiry);
}

export type InsertInquiryInput = Pick<ProductInquiry, 'productId' | 'brandId' | 'title' | 'content' | 'isSecret'>;

export async function insertInquiry(memberId: string, input: InsertInquiryInput): Promise<ProductInquiry> {
  const { data, error } = await getSupabase()
    .from('product_inquiries')
    .insert({
      member_id: memberId,
      product_id: input.productId,
      brand_id: input.brandId || null,
      title: input.title,
      content: input.content,
      is_secret: input.isSecret ?? false,
    })
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw error;
  return rowToInquiry(data as InquiryRow);
}

export type InquiryPatch = Partial<Pick<ProductInquiry, 'title' | 'content' | 'isSecret'>>;

/** 소유자 본인 것만, status='waiting'일 때만 수정(답변 완료 후 수정 불가 — 기존 storage.ts 동작 보존).
 *  대상 없음/소유자 불일치/이미 답변완료 시 null. */
export async function updateInquiryByOwner(
  id: string,
  memberId: string,
  patch: InquiryPatch,
): Promise<ProductInquiry | null> {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.content !== undefined) update.content = patch.content;
  if (patch.isSecret !== undefined) update.is_secret = patch.isSecret;

  const { data, error } = await getSupabase()
    .from('product_inquiries')
    .update(update)
    .eq('id', id)
    .eq('member_id', memberId)
    .eq('status', 'waiting')
    .select(SELECT_COLUMNS)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToInquiry(data as InquiryRow) : null;
}

/** 소유자 본인 것만 삭제. 반환값 = 실제로 삭제됐는지. */
export async function deleteInquiryByOwner(id: string, memberId: string): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from('product_inquiries')
    .delete()
    .eq('id', id)
    .eq('member_id', memberId)
    .select('id');
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

/** 관리자·브랜드 담당자 — 답변 작성/수정. 대상 없으면 null. */
export async function answerInquiry(
  id: string,
  answer: string,
  answeredBy: string,
): Promise<ProductInquiry | null> {
  const { data, error } = await getSupabase()
    .from('product_inquiries')
    .update({
      answer,
      answered_by: answeredBy,
      answered_at: new Date().toISOString(),
      status: 'answered',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(SELECT_COLUMNS)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToInquiry(data as InquiryRow) : null;
}

export async function getInquiryById(id: string): Promise<ProductInquiry | null> {
  const { data, error } = await getSupabase()
    .from('product_inquiries')
    .select(SELECT_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToInquiry(data as InquiryRow) : null;
}
