// category_settings 테이블 접근 계층. 이 파일 밖에서는 Supabase를 직접 호출하지 않는다.
// 카테고리 설정(CategorySettings)을 한 행(id='default')에 jsonb 로 통째로 저장/조회한다(싱글턴).
import { getSupabase } from '@/lib/supabase/server';
import {
  defaultCategorySettings,
  normalizeStoredCategorySettings,
  type CategorySettings,
} from '@/lib/categorySettings/config';
import { logServerError } from '@/lib/logServerError';

const SETTINGS_ROW_ID = 'default';

/**
 * 저장된 카테고리 설정을 반환한다. 행이 없으면 null(→ 라우트가 defaultCategorySettings 로 폴백).
 * value jsonb 는 저장 시점의 CategorySettings 모양 그대로이므로 그대로 캐스팅해 돌려준다.
 */
export async function getCategorySettings(): Promise<CategorySettings | null> {
  const { data, error } = await getSupabase()
    .from('category_settings')
    .select('value')
    .eq('id', SETTINGS_ROW_ID)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizeStoredCategorySettings(data.value as CategorySettings) : null;
}

/** 카테고리 설정을 통째로 upsert(id='default') 한다. 없으면 생성, 있으면 덮어쓴다. */
export async function saveCategorySettings(value: CategorySettings): Promise<void> {
  const { error } = await getSupabase()
    .from('category_settings')
    .upsert({ id: SETTINGS_ROW_ID, value, updated_at: new Date().toISOString() });
  if (error) throw error;
}

/**
 * 관리자 상품 검증기(validateProductFields)가 petType 허용 id로 쓸 목록.
 * GET /api/category-settings와 동일한 정책 — 저장된 행이 있으면 그 petTypes id를, 없거나
 * 조회에 실패하면 defaultCategorySettings.petTypes id로 폴백한다(무제한 허용으로 열어두지 않음).
 */
export async function getProductPetTypeIds(): Promise<string[]> {
  try {
    const settings = await getCategorySettings();
    return (settings ?? defaultCategorySettings).petTypes.map((item) => item.id);
  } catch (error) {
    logServerError('[categorySettings/repo] petType id 조회 실패 — 기본값으로 폴백', error);
    return defaultCategorySettings.petTypes.map((item) => item.id);
  }
}
