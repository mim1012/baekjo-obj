import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { createProductTagSlug, defaultProductTagsConfig } from '@/lib/productTags/config';

const root = path.resolve(__dirname, '..', '..');
const source = (...segments: string[]) => fs.readFileSync(path.join(root, ...segments), 'utf8');

test.describe('현재 홈페이지 기준 상품 태그 관리자 연결', () => {
  test('초기 태그 이름과 스토어 필터는 기존 고객 화면 값·순서를 그대로 유지한다', () => {
    expect(defaultProductTagsConfig.items.map(({ slug, label }) => [slug, label])).toEqual([
      ['skin', '피부'],
      ['joint', '관절'],
      ['obesity', '체중'],
      ['oral', '구강'],
      ['odor', '냄새'],
      ['tear', '눈물'],
      ['picky', '편식'],
      ['digestion', '배변'],
      ['stress', '스트레스'],
      ['senior', '시니어'],
      ['nutrition', '영양'],
      ['grooming', '그루밍'],
      ['living', '생활'],
    ]);
    expect(
      defaultProductTagsConfig.items.filter((tag) => tag.showInShopFilter).map((tag) => tag.slug),
    ).toEqual(['skin', 'joint', 'obesity', 'oral', 'odor']);

    const migration = source('supabase', 'migrations', '0152_product_tags_config.sql');
    for (const tag of defaultProductTagsConfig.items) {
      expect(migration).toContain(`\"slug\":\"${tag.slug}\",\"label\":\"${tag.label}\"`);
    }
  });

  test('직원이 한글 이름만 입력해도 중복되지 않는 내부 연결값을 자동 생성한다', () => {
    expect(createProductTagSlug('알레르기', defaultProductTagsConfig.items)).toBe('tag-14');
    expect(createProductTagSlug('skin', defaultProductTagsConfig.items)).toBe('skin-2');
    expect(createProductTagSlug('new care', defaultProductTagsConfig.items)).toBe('new-care');
  });

  test('스토어 고민 필터는 별도 상품 태그 설정만 사용한다', () => {
    const page = source('src', 'app', 'shop', 'page.tsx');
    const shop = source('src', 'components', 'shop', 'ShopContent.tsx');
    expect(page).toContain("import { getPublicProductTagsConfig } from '@/lib/productTags/repo';");
    expect(page).toContain('getPublicProductTagsConfig(),');
    expect(page).toContain('productTags={productTagsConfig.items}');
    expect(shop).toContain('function ShopInner({ products, brands, productTags, content }: Props)');
    expect(shop).toContain('.filter((tag) => tag.isVisible && tag.showInShopFilter)');
    expect(shop).toContain('.map((tag) => ({ slug: tag.slug, title: tag.label }))');
  });

  test('상품 등록은 고객 상품 카드와 관련 상품에 실제로 쓰는 태그만 노출한다', () => {
    const form = source('src', 'components', 'admin-new', 'products', 'ProductForm.tsx');
    const storage = source('src', 'lib', 'storage.ts');
    expect(form).toContain('useProductTagSettings()');
    expect(form).toContain('suggestions={productTagSuggestions}');
    expect(form).toContain("handleChange('concernTags', next)");
    expect(form).not.toContain("handleChange('relatedConcernSlugs', next)");
    expect(form).toContain('목록에 없는 새 태그 등록');
    expect(form).toContain('등록하고 이 상품에 선택');
    expect(form).toContain('onCreateSuggestion={handleCreateConcernTag}');
    expect(form).toContain('상품 저장 버튼을 누르면 연결이 확정됩니다.');
    expect(form).toContain('전체 태그 이름 수정·삭제·순서 변경');
    expect(storage).toContain("fetch('/api/admin/product-tags', {");
    expect(storage).toContain("method: 'POST'");
    expect(form).toContain('전문가 콘텐츠 연결');
  });

  test('상품 카드 태그는 관리자 이름·표시 여부를 읽되 미등록 기존 값은 그대로 보존한다', () => {
    const layout = source('src', 'app', 'layout.tsx');
    const provider = source('src', 'components', 'providers', 'ProductTagSettingsProvider.tsx');
    const card = source('src', 'components', 'common', 'ProductCard.tsx');
    expect(layout).toContain('<ProductTagSettingsProvider>');
    expect(provider).toContain("fetch('/api/product-tags'");
    expect(card).toContain('useProductTagSettings()');
    expect(card).toContain('return knownSlugs.has(tag) ? visibleSlugs.has(tag) : true;');
    expect(card).toContain('labelBySlug[tag] ?? concernLabels[tag] ?? tag');
  });

  test('상품 태그 관리자에서 등록·수정·삭제·순서 변경이 모두 즉시 저장된다', () => {
    const admin = source('src', 'app', 'admin', 'products', 'tags', 'page.tsx');
    const route = source('src', 'app', 'api', 'admin', 'product-tags', 'route.ts');
    expect(admin).toContain('onCreateRow={ready ? handleCreate : undefined}');
    expect(admin).toContain('onUpdateRow={ready ? handleUpdate : undefined}');
    expect(admin).toContain('onDeleteRow={ready ? handleDelete : undefined}');
    expect(admin).toContain('onMoveRow={ready ? handleMove : undefined}');
    expect(admin).toContain('hiddenSlugs: Array.from(new Set([...previous.hiddenSlugs, slug]))');
    expect(route).toContain('await requireAdmin();');
    expect(route).toContain('export async function POST(request: NextRequest)');
    expect(route).toContain('createProductTagSlug(label, current.items)');
    expect(route).toContain('created: false');
    expect(route).toContain('await saveProductTagsConfig(body);');
  });

  test('케어키트 관리자와 고객 화면은 기존 공개 보정 결과를 같은 함수로 읽는다', () => {
    const config = source('src', 'lib', 'kits', 'config.ts');
    const careKit = source('src', 'app', 'landing', 'care-kit', 'page.tsx');
    const adminRoute = source('src', 'app', 'api', 'admin', 'kits', 'route.ts');
    expect(config).toContain('export function resolvePublicKitsConfig');
    expect(config).toContain('legacyDefaultKitNames');
    expect(careKit).toContain('resolvePublicKitsConfig(saved).items.filter((kit) => kit.isVisible)');
    expect(adminRoute).toContain('config = resolvePublicKitsConfig(saved);');
  });
});
