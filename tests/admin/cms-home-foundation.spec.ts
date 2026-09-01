import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  HOME_REQUIRED_SECTIONS,
  isHomeSettingsInput,
  normalizeCmsHomeContent,
} from '@/lib/cms/home';
import { defaultHomeSettings } from '@/data/homeContent';

const root = path.resolve(__dirname, '..', '..');

test.describe('CMS 홈 draft/published 기반', () => {
  test('홈 전체 섹션이 있어야 CMS 입력으로 인정한다', () => {
    expect(isHomeSettingsInput(defaultHomeSettings)).toBe(true);
    for (const section of HOME_REQUIRED_SECTIONS) {
      const input = { ...defaultHomeSettings } as Record<string, unknown>;
      delete input[section];
      expect(isHomeSettingsInput(input), `누락 섹션: ${section}`).toBe(false);
    }
  });

  test('유효 입력은 현재 HomeSettings 스키마로 정규화하고 잘못된 입력은 거부한다', () => {
    expect(normalizeCmsHomeContent(defaultHomeSettings)).toEqual(defaultHomeSettings);
    expect(normalizeCmsHomeContent(null)).toBeNull();
    expect(normalizeCmsHomeContent({ hero: {} })).toBeNull();
  });

  test('마이그레이션은 RLS, 홈 이관, 원자적 게시 이력을 포함한다', () => {
    const migration = fs.readFileSync(
      path.join(root, 'supabase', 'migrations', '0148_cms_page_versions.sql'),
      'utf8',
    );
    expect(migration).toContain('create table public.cms_pages');
    expect(migration).toContain('create table public.cms_page_versions');
    expect(migration).toContain('alter table public.cms_pages enable row level security');
    expect(migration).toContain("where id = 'home'");
    expect(migration).toContain('create or replace function public.publish_cms_page');
    expect(migration).toContain('for update');
    expect(migration).toContain('cms-revision-conflict');
    expect(migration).toContain('grant execute on function public.publish_cms_page');
  });

  test('공개 홈 조회는 CMS 게시본을 우선하고 구 site_settings는 이행기 폴백으로 유지한다', () => {
    const repo = fs.readFileSync(path.join(root, 'src', 'lib', 'settings', 'repo.ts'), 'utf8');
    expect(repo).toContain('getPublishedCmsPage');
    expect(repo.indexOf('getPublishedCmsPage')).toBeLessThan(repo.indexOf(".from('site_settings')"));
    expect(repo).toContain('isCmsSchemaUnavailable(error)');
  });
});
