import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { defaultPageTextSettings } from '@/data/pageTextContent';
import { auditContentFromPageTexts } from '@/components/admin-new/pages/auditContent';
import { normalizeCmsPageContent } from '@/lib/cms/normalize';
import { CMS_PAGE_DEFINITIONS, getCmsPageDefinition } from '@/lib/cms/pageDefinitions';
import { CMS_SOURCE_REGISTRY, getCmsSourceBuilder } from '@/lib/cms/source/registry';

// 범용 소스 결속 활성화(D1)의 순수 계약 스펙 — 브라우저·DB 불필요.
// U1 시점에는 audit만 실 매퍼(bootstrapReady:true)이고 나머지 14개는 U3~U9가 교체할 placeholder
// (bootstrapReady:false, defaultContent 그대로 반환)다. 이 스펙은 그 경계 자체를 계약으로 고정한다:
// 매퍼가 하나라도 빠지면(신규 CMS 페이지 추가 시 흔한 실수) CI가 즉시 잡는다.

const root = path.resolve(__dirname, '..', '..');

function read(...segments: readonly string[]): string {
  return fs.readFileSync(path.join(root, ...segments), 'utf8');
}

test('every CMS_PAGE_DEFINITIONS key has a CMS_SOURCE_REGISTRY entry', () => {
  for (const definition of CMS_PAGE_DEFINITIONS) {
    const builder = getCmsSourceBuilder(definition.key);
    expect(builder, `${definition.key} 소스 매퍼 누락`).not.toBeNull();
  }
  expect(Object.keys(CMS_SOURCE_REGISTRY).sort()).toEqual(
    CMS_PAGE_DEFINITIONS.map((definition) => definition.key).sort(),
  );
});

test('audit source mapper reproduces auditContentFromPageTexts exactly from the locked page-texts row', () => {
  const definition = getCmsPageDefinition('audit');
  expect(definition).not.toBeNull();
  if (!definition) return;
  const builder = getCmsSourceBuilder('audit');
  expect(builder).not.toBeNull();
  if (!builder) return;

  expect(builder.bootstrapReady).toBe(true);
  expect(builder.siteSettingIds).toEqual(['page-texts']);

  const built = builder.build({
    'page-texts': { value: defaultPageTextSettings, updated_at: '2026-09-15T00:00:00.000Z' },
  });
  expect(normalizeCmsPageContent(definition, built)).toEqual(
    normalizeCmsPageContent(definition, auditContentFromPageTexts(defaultPageTextSettings)),
  );
});

test('placeholder (bootstrapReady:false) source mappers return defaultContent unchanged and never touch a real source', () => {
  for (const definition of CMS_PAGE_DEFINITIONS) {
    if (definition.key === 'audit') continue; // U1 시점 유일한 실 매퍼 — 위 테스트가 별도로 검증한다.
    const builder = getCmsSourceBuilder(definition.key);
    expect(builder, definition.key).not.toBeNull();
    if (!builder) continue;
    if (builder.bootstrapReady) continue; // U3~U9가 실 매퍼로 교체한 페이지 — 아래 별도 테스트가 검증한다.

    expect(builder.siteSettingIds, `${definition.key} placeholder 는 아직 잠글 소스가 없다`).toEqual([]);

    const built = builder.build({});
    expect(normalizeCmsPageContent(definition, built), definition.key).toEqual(
      normalizeCmsPageContent(definition, definition.defaultContent),
    );
  }
});

test('real (bootstrapReady:true, non-audit) source mappers reproduce defaultContent from default sources', () => {
  // siteSettingIds가 페이지마다 다르다(page-texts / home / [] 없음 — refund-policy는 DB 소스가
  // 없다). 각 매퍼는 선언한 소스 행이 없을 때 자신의 기본값으로 폴백하도록 이미 작성돼 있으므로
  // (audit.build/home.build 등과 동일한 패턴), 빈 sources로 호출해 그 폴백 경로 자체를 검증한다.
  for (const definition of CMS_PAGE_DEFINITIONS) {
    if (definition.key === 'audit') continue; // 위 전용 테스트가 별도로 검증한다.
    const builder = getCmsSourceBuilder(definition.key);
    if (!builder || !builder.bootstrapReady) continue; // 아직 교체하지 않은 placeholder는 위에서 검증했다.

    const built = builder.build({});
    expect(normalizeCmsPageContent(definition, built), definition.key).toEqual(
      normalizeCmsPageContent(definition, definition.defaultContent),
    );
  }
});

test('0166 locks every declared source row before the cms_pages row, and the content check before archiving', () => {
  const sql = read('supabase', 'migrations', '0166_cms_source_bound_activation.sql');

  const sourcesLoop = sql.indexOf('for r in select key, value from jsonb_each(p_expected_sources)');
  const sourceLock = sql.indexOf('where id = r.key\n    for update;');
  const sourceConflict = sql.indexOf("raise exception 'cms-source-conflict'");
  const pageLock = sql.indexOf('where page_key = p_page_key\n  for update;');
  const revisionCheck = sql.indexOf('v_page.draft_revision is distinct from p_expected_revision');
  const managedCheck = sql.indexOf("raise exception 'cms-already-managed'");
  const contentCheck = sql.indexOf('v_page.draft_content is distinct from p_expected_content');
  const archive = sql.indexOf('insert into public.cms_page_versions');

  for (const index of [sourcesLoop, sourceLock, sourceConflict, pageLock, revisionCheck, managedCheck, contentCheck, archive]) {
    expect(index).toBeGreaterThan(-1);
  }
  expect([sourcesLoop, sourceLock, sourceConflict, pageLock, revisionCheck, managedCheck, contentCheck, archive]).toEqual(
    [sourcesLoop, sourceLock, sourceConflict, pageLock, revisionCheck, managedCheck, contentCheck, archive].toSorted((a, b) => a - b),
  );

  expect(sql).toContain('order by key loop');
  expect(sql).not.toContain('from public.publish_cms_page(');
  expect(sql).toContain('on conflict (page_key, revision) do nothing');
  expect(sql).toContain('v_existing_version.content <> v_published_content');
  expect(sql).not.toMatch(/(?:update|delete from)\s+public\.cms_page_versions/i);
});

test('0166 raises every conflict as PT409 (never the retryable 40001) and restates the revoke/grant contract', () => {
  const sql = read('supabase', 'migrations', '0166_cms_source_bound_activation.sql');

  expect(sql).not.toContain("'40001'");
  const pt409Raises = sql.match(/errcode = 'PT409'/g) ?? [];
  expect(pt409Raises.length).toBeGreaterThanOrEqual(4);
  expect(sql).toMatch(
    /revoke all on function public\.publish_cms_page_from_source\(text, bigint, jsonb, uuid, jsonb\)\s+from public, anon, authenticated;/,
  );
  expect(sql).toMatch(
    /grant execute on function public\.publish_cms_page_from_source\(text, bigint, jsonb, uuid, jsonb\)\s+to service_role;/,
  );
  expect(sql).toContain("raise exception 'invalid-cms-source-import-input' using errcode = '22023'");
});
