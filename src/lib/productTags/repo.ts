import 'server-only';
import { getSupabase } from '@/lib/supabase/server';
import { listProducts } from '@/lib/products/repo';
import { logServerError } from '@/lib/logServerError';
import {
  defaultProductTagsConfig,
  resolveProductTagsConfig,
  type AdminProductTagsConfig,
  type ProductTagDefinition,
  type ProductTagsConfig,
} from '@/lib/productTags/config';

const CONFIG_ROW_ID = 'default';

function isTag(value: unknown): value is ProductTagDefinition {
  if (!value || typeof value !== 'object') return false;
  const tag = value as Record<string, unknown>;
  return typeof tag.slug === 'string'
    && tag.slug.trim().length > 0
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
