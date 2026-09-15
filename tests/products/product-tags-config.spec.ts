import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  createProductTagSlug,
  defaultProductTagsConfig,
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
