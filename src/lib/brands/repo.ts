// brands 테이블 접근 계층. 이 파일 밖에서는 Supabase를 직접 호출하지 않는다.
import { randomUUID } from 'node:crypto';
import { getSupabase } from '@/lib/supabase/server';
import type { Brand, BrandAuditReport } from '@/types';

const AUDIT_GRADES = new Set(['A+', 'A', 'B+', 'B']);

/** DB detail.auditGrade 는 자유 text(jsonb) 라 유니온 밖 값이 들어올 수 있다. 미지값/누락은
 *  가장 낮은 등급으로 정규화해 admin 화면이 조용히 깨지지 않게 한다. */
function normalizeAuditGrade(raw: unknown): Brand['auditGrade'] {
  return typeof raw === 'string' && AUDIT_GRADES.has(raw) ? (raw as Brand['auditGrade']) : 'B';
}

function detailAuditReport(raw: unknown): BrandAuditReport | undefined {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw as BrandAuditReport;
  return undefined;
}

interface BrandRow {
  id: string;
  name: string;
  is_visible: boolean;
  detail: unknown;
  created_at: string;
}

const SELECT_COLUMNS = 'id, name, is_visible, detail, created_at';

/** jsonb detail을 안전하게 객체로 취급한다. 객체가 아니면 빈 객체로 방어한다. */
function detailOf(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>;
  return {};
}

function rowToBrand(row: BrandRow): Brand {
  const d = detailOf(row.detail);
  return {
    id: row.id,
    name: row.name,
    logo: typeof d.logo === 'string' ? d.logo : '',
    description: typeof d.description === 'string' ? d.description : '',
    philosophy: typeof d.philosophy === 'string' ? d.philosophy : '',
    auditGrade: normalizeAuditGrade(d.auditGrade),
    auditPoints: Array.isArray(d.auditPoints) ? (d.auditPoints as string[]) : [],
    auditReport: detailAuditReport(d.auditReport),
    representativeProductIds: Array.isArray(d.representativeProductIds)
      ? (d.representativeProductIds as string[])
      : [],
    relatedConcernSlugs: Array.isArray(d.relatedConcernSlugs) ? (d.relatedConcernSlugs as string[]) : [],
    isRecommended: typeof d.isRecommended === 'boolean' ? d.isRecommended : false,
    isNew: typeof d.isNew === 'boolean' ? d.isNew : undefined,
    isVisible: row.is_visible,
    displayOrder: typeof d.displayOrder === 'number' ? d.displayOrder : undefined,
  };
}

/** camelCase Brand 키 → snake_case 컬럼명. 여기 없는 키는 전부 detail jsonb로 들어간다. */
const BRAND_COLUMN_MAP: Partial<Record<keyof Brand, string>> = {
  name: 'name',
  isVisible: 'is_visible',
};

/** Brand(전체 또는 일부)를 컬럼 값과 detail jsonb 조각으로 분리한다. */
function splitBrandInput(input: Partial<Brand>): {
  columns: Record<string, unknown>;
  detail: Record<string, unknown>;
} {
  const columns: Record<string, unknown> = {};
  const detail: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || key === 'id') continue;
    const columnName = BRAND_COLUMN_MAP[key as keyof Brand];
    if (columnName) {
      columns[columnName] = value;
    } else {
      detail[key] = value;
    }
  }
  return { columns, detail };
}

/** 브랜드 목록 조회 상한. 집계 호출부의 절삭 감지(truncated)용으로 export한다. */
export const BRANDS_LIST_CAP = 500;

export async function listBrands(visibleOnly = true): Promise<Brand[]> {
  let query = getSupabase().from('brands').select(SELECT_COLUMNS);
  if (visibleOnly) query = query.eq('is_visible', true);

  const { data, error } = await query.order('created_at', { ascending: false }).limit(BRANDS_LIST_CAP);
  if (error) throw error;
  return (data as BrandRow[]).map(rowToBrand);
}

/** 공개 경로는 includeHidden 없이 호출해 비노출(is_visible: false) 브랜드가 단건 URL로도
 *  새 나가지 않게 한다. 관리자 수정 폼처럼 비노출 브랜드도 봐야 하는 곳만 includeHidden: true. */
export async function getBrandById(id: string, opts: { includeHidden?: boolean } = {}): Promise<Brand | null> {
  let query = getSupabase().from('brands').select(SELECT_COLUMNS).eq('id', id);
  if (!opts.includeHidden) query = query.eq('is_visible', true);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data ? rowToBrand(data as BrandRow) : null;
}

export async function listAllBrandsForAdmin(): Promise<Brand[]> {
  return listBrands(false);
}

/** 브랜드 생성 입력. id는 서버가 생성한다(mass-assignment 차단, seed 'b1' 스타일과 충돌 방지). */
export type BrandInsertInput = Omit<Brand, 'id'>;
export type BrandPatchInput = Partial<Omit<Brand, 'id'>>;

export async function insertBrand(input: BrandInsertInput): Promise<Brand> {
  const id = `brand_${randomUUID()}`;
  const { columns, detail } = splitBrandInput(input);
  const { data, error } = await getSupabase()
    .from('brands')
    .insert({ id, ...columns, detail })
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw error;
  return rowToBrand(data as BrandRow);
}

/**
 * 관리자 브랜드 수정. jsonb detail은 supabase update가 부분 병합을 지원하지 않으므로,
 * 기존 행을 Brand로 읽어 patch를 얹은 뒤 컬럼/디테일을 통째로 다시 나눠 쓴다
 * (read-modify-write, products/repo.ts updateProduct와 동일 패턴). 존재하지 않으면 null.
 */
export async function updateBrand(id: string, patch: BrandPatchInput): Promise<Brand | null> {
  const existing = await getBrandById(id, { includeHidden: true });
  if (!existing) return null;

  const merged: Brand = { ...existing, ...patch, id: existing.id };
  const { columns, detail } = splitBrandInput(merged);
  const { data, error } = await getSupabase()
    .from('brands')
    .update({ ...columns, detail })
    .eq('id', id)
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw error;
  return rowToBrand(data as BrandRow);
}

/** 삭제된 브랜드가 실제로 존재했는지 반환한다(라우트에서 404 판정에 사용). */
export async function deleteBrand(id: string): Promise<boolean> {
  const { data, error } = await getSupabase().from('brands').delete().eq('id', id).select('id');
  if (error) throw error;
  return Array.isArray(data) && data.length > 0;
}
