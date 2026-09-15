import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  createProductTagSlug,
  defaultProductTagsConfig,
  isProductTagSlug,
  resolveProductTagsConfig,
} from '@/lib/productTags/config';

// 상품 '고민' 태그 사전 순수 함수 스펙 — DB/브라우저/네트워크 불필요.
// 배경: 관리자가 고민 태그를 편집·숨김 처리해도 concernTags 원문이 남아있는 기존 상품 데이터는
// 절대 지워지지 않아야 한다(§ PR3 U1). hiddenSlugs는 "다시 자동 등록하지 않는다"는 표시일 뿐,
// 이미 상품에 박힌 concernTags 값 자체를 지우거나 바꾸지 않는다.

const root = path.resolve(__dirname, '..', '..');
const migrationSql = fs.readFileSync(
  path.join(root, 'supabase', 'migrations', '0167_product_tags_config_reconcile.sql'),
  'utf8',
);

test.describe('defaultProductTagsConfig', () => {
  test('기본 태그 13개를 현재 홈페이지와 동일한 순서로 담는다', () => {
    expect(defaultProductTagsConfig.items).toHaveLength(13);
    expect(defaultProductTagsConfig.items.map((item) => item.slug)).toEqual([
      'skin', 'joint', 'obesity', 'oral', 'odor', 'tear', 'picky',
      'digestion', 'stress', 'senior', 'nutrition', 'grooming', 'living',
    ]);
    expect(defaultProductTagsConfig.hiddenSlugs).toEqual([]);
  });

  test('스토어 필터에 노출되는 태그는 skin/joint/obesity/oral/odor 5개뿐이다', () => {
    const shown = defaultProductTagsConfig.items
      .filter((item) => item.showInShopFilter)
      .map((item) => item.slug);
    expect(shown).toEqual(['skin', 'joint', 'obesity', 'oral', 'odor']);
  });
});

test.describe('resolveProductTagsConfig — 미등록 태그 자동 편입', () => {
  test('저장된 사전에 없는 상품 concernTags 값은 이름 그대로 visible 태그로 편입된다', () => {
    const resolved = resolveProductTagsConfig(defaultProductTagsConfig, ['legacy-only-tag']);
    const merged = resolved.items.find((item) => item.slug === 'legacy-only-tag');
    expect(merged).toBeTruthy();
    expect(merged?.isVisible).toBe(true);
    expect(merged?.label).toBe('legacy-only-tag');
    expect(merged?.showInShopFilter).toBe(false);
  });

  test('빈/공백 concernTags 값은 무시하고, 중복 값은 한 번만 편입한다', () => {
    const resolved = resolveProductTagsConfig(defaultProductTagsConfig, ['', '  ', 'dup', 'dup']);
    const dupCount = resolved.items.filter((item) => item.slug === 'dup').length;
    expect(dupCount).toBe(1);
    expect(resolved.items.some((item) => item.slug === '')).toBe(false);
  });

  test('저장된 사전이 없으면(null) 기본값을 기준으로 병합한다', () => {
    const resolved = resolveProductTagsConfig(null, []);
    expect(resolved.items.map((item) => item.slug)).toEqual(
      defaultProductTagsConfig.items.map((item) => item.slug),
    );
  });
});

// 2026-09-15 리뷰 B3: 레거시 concernTags 원문(형식 위반 값)이 검증 없이 items로 승격되면,
// 그 값이 그대로 관리자 PUT payload에 실려 isTag(productTags/repo.ts) 검증에 걸려 태그 화면의
// 모든 저장이 400으로 막히고, 어쩌다 저장돼도 다음 GET에서 isProductTagsConfig가 통째로 거부해
// 공개 사전이 조용히 기본값으로 되돌아간다. resolveProductTagsConfig는 이제 isProductTagSlug를
// 통과하지 못하는 원문을 items에 승격하지 않는다.
test.describe('resolveProductTagsConfig — 형식 위반 legacy concernTags는 승격하지 않는다(B3)', () => {
  test('공백·대문자·언더스코어가 섞인 legacy 값은 items에 편입되지 않는다', () => {
    const resolved = resolveProductTagsConfig(defaultProductTagsConfig, ['피부_관리', 'Skin', 'in valid']);
    expect(resolved.items.some((item) => item.slug === '피부_관리')).toBe(false);
    expect(resolved.items.some((item) => item.slug === 'Skin')).toBe(false);
    expect(resolved.items.some((item) => item.slug === 'in valid')).toBe(false);
  });

  test('형식 위반 값이 섞여 있어도 유효한 legacy 값은 그대로 편입되고, 결과 items는 PUT 계약(isProductTagSlug)을 전부 통과한다', () => {
    const resolved = resolveProductTagsConfig(defaultProductTagsConfig, ['피부_관리', 'legacy-valid-tag']);
    expect(resolved.items.some((item) => item.slug === 'legacy-valid-tag')).toBe(true);
    expect(resolved.items.every((item) => isProductTagSlug(item.slug))).toBe(true);
  });

  test('형식 위반 legacy 값만 있어도 나머지 사전 저장(PUT round-trip)이 막히지 않는다 — 위반 값은 조용히 제외된다', () => {
    // 위반 값 하나 때문에 resolve 결과 전체가 비거나 예외를 던지면 안 된다 — 관리자가 다른 태그를
    // 편집해 그대로 PUT해도(=resolve 결과를 payload로 재사용) 위반 값이 없으니 400이 나지 않는다.
    const resolved = resolveProductTagsConfig(defaultProductTagsConfig, ['ALL CAPS TAG']);
    expect(resolved.items.map((item) => item.slug)).toEqual(
      defaultProductTagsConfig.items.map((item) => item.slug),
    );
    expect(resolved.items.every((item) => isProductTagSlug(item.slug))).toBe(true);
  });
});

test.describe('resolveProductTagsConfig — 숨김은 삭제가 아니다', () => {
  test('hiddenSlugs에 등록된 태그는 사전에서 제외되지만 hiddenSlugs 기록에는 남는다', () => {
    const stored = {
      items: defaultProductTagsConfig.items,
      hiddenSlugs: ['picky'],
    };
    const resolved = resolveProductTagsConfig(stored, []);
    expect(resolved.items.some((item) => item.slug === 'picky')).toBe(false);
    expect(resolved.hiddenSlugs).toContain('picky');
  });

  test('숨긴 태그의 slug가 상품 concernTags에 여전히 남아 있어도 다시 자동 등록되지 않는다', () => {
    const stored = {
      items: defaultProductTagsConfig.items,
      hiddenSlugs: ['picky'],
    };
    // 상품 데이터(concernTags)는 그대로 'picky'를 갖고 있는 상태를 시뮬레이션한다 — 이 함수는
    // 상품 행을 지우거나 고치지 않으므로, 여기서 넘기는 productTagValues는 순수 조회 결과일 뿐이다.
    const resolved = resolveProductTagsConfig(stored, ['picky']);
    expect(resolved.items.some((item) => item.slug === 'picky')).toBe(false);
    expect(resolved.hiddenSlugs).toEqual(['picky']);
  });
});

test.describe('createProductTagSlug — slug 정규화 안정성', () => {
  test('한글 라벨은 정규화 결과가 비어 tag-N 형태로 안정적으로 생성된다', () => {
    const slug1 = createProductTagSlug('피부', []);
    const slug2 = createProductTagSlug('피부', []);
    expect(slug1).toBe(slug2);
    expect(slug1).toMatch(/^tag-\d+$/);
  });

  test('영문/숫자 라벨은 소문자·하이픈으로 정규화되고 같은 입력에 항상 같은 slug를 낸다', () => {
    expect(createProductTagSlug('New Tag', [])).toBe('new-tag');
    expect(createProductTagSlug('  New   Tag!!  ', [])).toBe('new-tag');
  });

  test('이미 존재하는 slug와 충돌하면 번호를 붙여 기존 상품 연결을 보존한다', () => {
    const existing = [{ slug: 'new-tag' }];
    expect(createProductTagSlug('New Tag', existing)).toBe('new-tag-2');
  });
});

test.describe('0167_product_tags_config_reconcile.sql — staging 재실행 안전성', () => {
  test('테이블 생성은 if not exists 이다', () => {
    expect(migrationSql).toContain('create table if not exists public.product_tags_config');
  });

  test('시드는 on conflict (id) do nothing 이다(운영자 편집 덮어쓰기 금지)', () => {
    expect(migrationSql).toContain('on conflict (id) do nothing');
  });

  test('RLS를 켜고 public/anon/authenticated 권한을 회수하고 service_role에만 부여한다', () => {
    expect(migrationSql).toContain('enable row level security');
    expect(migrationSql).toContain('revoke all on table public.product_tags_config from public, anon, authenticated');
    expect(migrationSql).toContain('grant all on table public.product_tags_config to service_role');
  });

  test('40001(serialization_failure) SQLSTATE를 쓰지 않는다', () => {
    expect(migrationSql).not.toContain('40001');
  });
});

// 2026-09-15 리뷰 B2: PUT /api/admin/product-tags(태그 사전 저장)가 상품 검증기(validate.ts)보다
// 느슨한 slug 형식을 받아들여, 사전에는 저장되는데 그 태그를 고른 상품 저장은 400으로 막히는
// 계약 불일치가 있었다. isProductTagSlug(이 파일)를 단일 정의로 두고 validate.ts·
// productTags/repo.ts(isTag)·PUT 라우트가 모두 이걸 쓰도록 고쳤다.
// repo.ts는 'server-only'를 import하므로(위 39번째 줄 근처 주석과 동일한 이유) 이 spec 프로세스에서
// 그냥 require하면 항상 throw한다 — repo.ts/route.ts 쪽 검증은 소스 grep으로 잠근다.
test.describe('isProductTagSlug — 상품 검증기·태그 사전 저장이 공유하는 단일 slug 규칙(B2)', () => {
  test('createProductTagSlug가 만든 slug(한글 라벨의 tag-N 폴백 포함)는 항상 통과한다', () => {
    expect(isProductTagSlug(createProductTagSlug('피부 관리', []))).toBe(true);
    expect(isProductTagSlug(createProductTagSlug('New Tag', []))).toBe(true);
    expect(isProductTagSlug('skin')).toBe(true);
    expect(isProductTagSlug('tag-1')).toBe(true);
  });

  test('한글 자유 텍스트·대문자·공백이 섞인 slug는 거부된다(사전에만 저장되고 상품은 400 나던 값)', () => {
    expect(isProductTagSlug('피부_관리')).toBe(false);
    expect(isProductTagSlug('Skin')).toBe(false);
    expect(isProductTagSlug('in valid')).toBe(false);
  });

  test('앞뒤/연속 하이픈은 거부된다', () => {
    expect(isProductTagSlug('-skin')).toBe(false);
    expect(isProductTagSlug('skin-')).toBe(false);
    expect(isProductTagSlug('a--b')).toBe(false);
  });

  test('빈 문자열·비문자열은 거부된다', () => {
    expect(isProductTagSlug('')).toBe(false);
    expect(isProductTagSlug(undefined)).toBe(false);
    expect(isProductTagSlug(null)).toBe(false);
    expect(isProductTagSlug(123)).toBe(false);
  });
});

test.describe('B2 회귀 잠금 — 소스 grep (isTag·validate.ts·PUT 라우트가 같은 규칙을 쓴다)', () => {
  test('productTags/repo.ts의 isTag가 isProductTagSlug로 slug 형식을 검사한다', () => {
    const repoSrc = fs.readFileSync(
      path.join(root, 'src', 'lib', 'productTags', 'repo.ts'),
      'utf8',
    );
    expect(repoSrc).toContain("isProductTagSlug,");
    expect(repoSrc).toContain("from '@/lib/productTags/config'");
    expect(repoSrc).toContain('isProductTagSlug(tag.slug)');
    // 예전의 "공백만 아니면 통과" 체크로 되돌아가지 않았는지 잠근다.
    expect(repoSrc).not.toContain('tag.slug.trim().length > 0');
  });

  test('products/validate.ts가 자체 TAG_SLUG_RE 대신 productTags/config의 isProductTagSlug를 쓴다', () => {
    const validateSrc = fs.readFileSync(
      path.join(root, 'src', 'lib', 'products', 'validate.ts'),
      'utf8',
    );
    expect(validateSrc).toContain("import { isProductTagSlug } from '@/lib/productTags/config'");
    expect(validateSrc).not.toContain('const TAG_SLUG_RE');
  });

  test('PUT /api/admin/product-tags가 형식이 틀린 slug를 필드 단위 에러 코드로 거절한다', () => {
    const routeSrc = fs.readFileSync(
      path.join(root, 'src', 'app', 'api', 'admin', 'product-tags', 'route.ts'),
      'utf8',
    );
    expect(routeSrc).toContain('isProductTagSlug');
    expect(routeSrc).toContain("error: 'invalid-slug'");
    expect(routeSrc).toContain('items[');
  });
});
