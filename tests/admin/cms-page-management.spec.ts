import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { CMS_PAGE_DEFINITIONS, getCmsPageDefinition } from '@/lib/cms/pageDefinitions';

const root = path.resolve(__dirname, '..', '..');
const read = (...segments: string[]) => fs.readFileSync(path.join(root, ...segments), 'utf8');

test.describe('비개발자용 페이지 관리 CMS', () => {
  test('공통·소개·서비스·정책 화면이 이름과 실제 주소로 등록돼 있다', () => {
    expect(CMS_PAGE_DEFINITIONS.map((page) => page.key)).toEqual([
      'site-shell',
      'shop',
      'brands',
      'reviews',
      'notices',
      'audit',
      'b2b',
      'concerns',
      'experts',
      'care-kit',
      'insurance-landing',
      'terms',
      'privacy',
      'refund-policy',
    ]);
    for (const page of CMS_PAGE_DEFINITIONS) {
      expect(page.title.length).toBeGreaterThan(1);
      expect(page.sections.length).toBeGreaterThan(0);
      expect(page.sections.every((section) => section.fields.length > 0)).toBe(true);
    }
  });

  test('사이트 공통 영역은 메뉴 CRUD, 기능 노출, 회사·SNS 정보를 포함한다', () => {
    const shell = getCmsPageDefinition('site-shell');
    expect(shell).not.toBeNull();
    const fields = shell!.sections.flatMap((section) => section.fields);
    expect(fields).toContainEqual(expect.objectContaining({ path: 'navigation.mainLinks', type: 'link-list' }));
    expect(fields).toContainEqual(expect.objectContaining({ path: 'features.insurance', type: 'boolean' }));
    expect(fields).toContainEqual(expect.objectContaining({ path: 'company.businessNumber' }));
    expect(fields).toContainEqual(expect.objectContaining({ path: 'social.instagramUrl', type: 'url' }));
  });

  test('편집기는 임시저장·게시·이전본 복구와 항목 추가·삭제·순서변경을 제공한다', () => {
    const editor = read('src', 'app', 'admin', 'pages', '[pageKey]', 'page.tsx');
    expect(editor).toContain("method: 'PATCH'");
    expect(editor).toContain("method: 'POST'");
    expect(editor).toContain('메뉴 추가');
    expect(editor).toContain('메뉴 삭제');
    expect(editor).toContain('move(index, -1)');
    expect(editor).toContain('고객 화면에 게시');
    expect(editor).toContain('이전 게시본 보기');
    expect(editor).toContain('항목 추가');
    expect(editor).toContain('항목 삭제');
  });

  test('DB 적용 상태와 관계없이 관리 버튼으로 편집 위치를 확인할 수 있다', () => {
    const pageList = read('src', 'app', 'admin', 'pages', 'page.tsx');
    const editor = read('src', 'app', 'admin', 'pages', '[pageKey]', 'page.tsx');

    expect(pageList).not.toContain('aria-disabled={unavailable}');
    expect(pageList).not.toContain("'pointer-events-none opacity-40'");
    expect(pageList).toContain('href={action.adminRoute}');
    expect(editor).toContain('지금은 이 화면을 수정할 수 없습니다');
    expect(editor).toContain('DB 적용 후 수정할 영역');
  });

  test('공개 화면은 CMS 게시본을 읽고, 마이그레이션은 전체 카탈로그를 초기 등록한다', () => {
    const migration = [
      read('supabase', 'migrations', '0149_cms_page_catalog.sql'),
      read('supabase', 'migrations', '0150_cms_concerns_page.sql'),
      read('supabase', 'migrations', '0151_cms_public_list_pages.sql'),
    ].join('\n');
    for (const page of CMS_PAGE_DEFINITIONS) {
      expect(migration).toContain(`'${page.key}'`);
    }
    for (const pagePath of [
      ['src', 'app', 'audit', 'page.tsx'],
      ['src', 'app', 'shop', 'page.tsx'],
      ['src', 'app', 'brands', 'page.tsx'],
      ['src', 'app', 'reviews', 'page.tsx'],
      ['src', 'app', 'notices', 'page.tsx'],
      ['src', 'app', 'b2b', 'page.tsx'],
      ['src', 'app', 'concerns', 'page.tsx'],
      ['src', 'app', 'experts', 'page.tsx'],
      ['src', 'app', 'landing', 'care-kit', 'page.tsx'],
      ['src', 'app', 'landing', 'insurance', 'page.tsx'],
      ['src', 'app', 'terms', 'page.tsx'],
      ['src', 'app', 'privacy', 'page.tsx'],
      ['src', 'app', 'refund-policy', 'page.tsx'],
    ]) {
      expect(read(...pagePath)).toContain('getPublishedPageContent');
    }
  });

  test('화면의 반복 카드는 실제 편집 가능한 항목 목록으로 연결된다', () => {
    for (const key of ['brands', 'reviews', 'audit', 'b2b', 'concerns', 'experts', 'insurance-landing', 'terms']) {
      const definition = getCmsPageDefinition(key);
      expect(definition?.sections.flatMap((section) => section.fields).some((field) => field.type === 'item-list')).toBe(true);
    }
  });

  test('화면 전용 입력칸이 다른 화면에 섞여 생기지 않는다', () => {
    const expertHero = getCmsPageDefinition('experts')!.sections[0].fields.map((field) => field.path);
    const careKitHero = getCmsPageDefinition('care-kit')!.sections[0].fields.map((field) => field.path);
    expect(expertHero).not.toContain('hero.overlayEyebrow');
    expect(expertHero).not.toContain('hero.overlayText');
    expect(careKitHero).toContain('hero.overlayEyebrow');
    expect(careKitHero).toContain('hero.overlayText');
  });

  test('CMS 표를 아직 적용하지 않은 배포도 기존 공개 화면으로 안전하게 폴백한다', () => {
    const repo = read('src', 'lib', 'cms', 'repo.ts');
    const content = read('src', 'lib', 'cms', 'content.ts');
    const settingsRepo = read('src', 'lib', 'settings', 'repo.ts');
    expect(repo).toContain("code === '42P01' || code === 'PGRST205'");
    expect(content).toContain('isCmsSchemaUnavailable(error)');
    expect(settingsRepo).toContain('isCmsSchemaUnavailable(error)');
  });

  test('홈 관리도 이미지·링크·노출·카드 CRUD를 제공한다', () => {
    const settings = read('src', 'app', 'admin', 'settings', 'page.tsx');
    const contract = read('src', 'data', 'homeContent.ts');
    expect(settings).toContain('ImageUploader');
    expect(settings).toContain('removeArrayItem');
    expect(settings).toContain('moveArrayItem');
    expect(settings).toContain('기본 버튼 연결 주소');
    expect(contract).toContain('desktopImage: string;');
    expect(contract).toContain('visible: boolean;');
  });
});
