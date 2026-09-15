// product_tags_config 테이블 접근 계층. 이 파일 밖에서는 Supabase를 직접 호출하지 않는다.
// 상품 '고민' 태그 사전을 한 행(id='default')에 jsonb 로 통째로 저장/조회한다(category_settings와
// 동일한 싱글턴 패턴 — src/lib/categorySettings/repo.ts 참조).
import 'server-only';
import { getSupabase } from '@/lib/supabase/server';
import { listProducts } from '@/lib/products/repo';
import { logServerError } from '@/lib/logServerError';
import {
  defaultProductTagsConfig,
  isProductTagSlug,
  resolveProductTagsConfig,
  type AdminProductTagsConfig,
  type ProductTagDefinition,
  type ProductTagsConfig,
} from '@/lib/productTags/config';

const CONFIG_ROW_ID = 'default';

// slug 형식은 isProductTagSlug(단일 정의: src/lib/productTags/config.ts)로 검사한다 — 상품
// 검증기(src/lib/products/validate.ts)와 정규식을 공유해, PUT으로 형식에 안 맞는 slug가
// 사전에 저장된 뒤 그 태그를 고른 상품 저장이 400으로 막히는 계약 불일치를 막는다(리뷰 B2).
function isTag(value: unknown): value is ProductTagDefinition {
  if (!value || typeof value !== 'object') return false;
  const tag = value as Record<string, unknown>;
  return isProductTagSlug(tag.slug)
    && typeof tag.label === 'string'
    && tag.label.trim().length > 0
    && typeof tag.isVisible === 'boolean'
    && typeof tag.showInShopFilter === 'boolean';
}

export function isProductTagsConfig(value: unknown): value is ProductTagsConfig {
  if (!value || typeof value !== 'object') return false;
  const config = value as { items?: unknown; hiddenSlugs?: unknown };
  return Array.isArray(config.items)
    && config.items.every(isTag)
    && Array.isArray(config.hiddenSlugs)
    && config.hiddenSlugs.every((slug) => typeof slug === 'string');
}

export async function getProductTagsConfig(): Promise<ProductTagsConfig | null> {
  const { data, error } = await getSupabase()
    .from('product_tags_config')
    .select('value')
    .eq('id', CONFIG_ROW_ID)
    .maybeSingle();
  if (error) throw error;
  return data && isProductTagsConfig(data.value) ? data.value : null;
}

export async function saveProductTagsConfig(config: ProductTagsConfig): Promise<void> {
  const { error } = await getSupabase()
    .from('product_tags_config')
    .upsert({ id: CONFIG_ROW_ID, value: config, updated_at: new Date().toISOString() });
  if (error) throw error;
}

async function listCurrentProductTagValues(visibleOnly: boolean): Promise<string[]> {
  const products = await listProducts({ visibleOnly });
  return products.flatMap((product) => product.concernTags ?? []);
}

/** 고객 화면용. 표가 아직 없거나 조회가 실패해도 현재 홈페이지 기준값을 그대로 유지한다. */
export async function getPublicProductTagsConfig(): Promise<ProductTagsConfig> {
  try {
    const stored = await getProductTagsConfig();
    // 고객 화면에서는 태그 사전 한 행만 읽는다. 상품에 남은 미등록 과거 태그는 ProductCard가
    // 원문 그대로 보존하므로, 모든 공개 상품을 다시 조회할 필요가 없다.
    return resolveProductTagsConfig(stored, []);
  } catch (error) {
    logServerError('[productTags/repo] 공개 태그 조회 실패 — 현재 홈페이지 기본값 사용', error);
    return resolveProductTagsConfig(defaultProductTagsConfig, []);
  }
}

/** 관리자용. 숨긴 상품까지 읽어 기존 연결값을 빠짐없이 목록에 올린다. */
export async function getAdminProductTagsConfig(): Promise<AdminProductTagsConfig> {
  const values = await listCurrentProductTagValues(false);
  let stored: ProductTagsConfig | null = null;
  let persistenceReady = true;
  try {
    stored = await getProductTagsConfig();
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code !== '42P01' && code !== 'PGRST205') throw error;
    persistenceReady = false;
  }
  return { ...resolveProductTagsConfig(stored, values), persistenceReady };
}
