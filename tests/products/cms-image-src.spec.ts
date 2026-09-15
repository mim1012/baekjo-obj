import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { resolveCmsImageProps } from '@/lib/cms/imageSrc';

// resolveCmsImageProps 순수 계약 — 브라우저·DB 불필요(products 프로젝트).
// 배경: CMS 이미지 필드(관리자가 자유 입력)에 쿼리스트링이 붙은 로컬 경로나 next.config.ts의
// remotePatterns에 없는 외부 URL이 들어오면 next/image가 즉시 throw해 공개 페이지 전체가
// 크래시한다(2026-09-15 /audit에서 실측). 이 스펙은 그 방어 헬퍼와, 여섯 소비자 전부가
// 그 헬퍼를 실제로 쓰는지를 함께 고정한다.

const root = path.resolve(__dirname, '..', '..');

function read(...segments: readonly string[]): string {
  return fs.readFileSync(path.join(root, ...segments), 'utf8');
}

test.describe('resolveCmsImageProps 헬퍼 계약', () => {
  test('빈 값/비문자열은 null을 반환한다', () => {
    expect(resolveCmsImageProps(undefined)).toBeNull();
    expect(resolveCmsImageProps(null)).toBeNull();
    expect(resolveCmsImageProps('')).toBeNull();
    expect(resolveCmsImageProps('   ')).toBeNull();
    expect(resolveCmsImageProps(123)).toBeNull();
    expect(resolveCmsImageProps({})).toBeNull();
    expect(resolveCmsImageProps(['/images/a.png'])).toBeNull();
  });

  test('쿼리·해시 없는 순수 로컬 경로는 최적화 유지(unoptimized: false)', () => {
    expect(resolveCmsImageProps('/images/brand-curation-hero.webp')).toEqual({
      src: '/images/brand-curation-hero.webp',
      unoptimized: false,
    });
    // 앞뒤 공백은 trim 되어야 관리자가 실수로 붙인 공백에도 안전하다.
    expect(resolveCmsImageProps('  /images/a.png  ')).toEqual({
      src: '/images/a.png',
      unoptimized: false,
    });
  });

  test('쿼리스트링이 붙은 로컬 경로는 unoptimized로 전환한다(실제 재현 케이스)', () => {
    const src = '/images/brand-curation-hero.webp?audit=11111111-1111-1111-1111-111111111111';
    expect(resolveCmsImageProps(src)).toEqual({ src, unoptimized: true });
  });

  test('해시가 붙은 로컬 경로도 unoptimized로 전환한다', () => {
    const src = '/images/a.png#section';
    expect(resolveCmsImageProps(src)).toEqual({ src, unoptimized: true });
  });

  test('remotePatterns에 없는 외부 URL은 unoptimized로 전환한다', () => {
    const src = 'https://cdn.example.com/foo.png';
    expect(resolveCmsImageProps(src)).toEqual({ src, unoptimized: true });
  });

  test('remotePatterns에 있는 Supabase Storage URL도 unoptimized로 전환한다(항상 안전한 쪽)', () => {
    const src = 'https://aeooyivfijthfcrfrnyk.supabase.co/storage/v1/object/public/brand-assets/logo.png';
    expect(resolveCmsImageProps(src)).toEqual({ src, unoptimized: true });
  });

  test('data URL은 unoptimized로 전환한다', () => {
    const src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAAAAAAAA';
    expect(resolveCmsImageProps(src)).toEqual({ src, unoptimized: true });
  });

  test('절대경로가 아닌 임의 문자열도 throw 없이 unoptimized로 처리한다', () => {
    expect(resolveCmsImageProps('images/relative.png')).toEqual({
      src: 'images/relative.png',
      unoptimized: true,
    });
    expect(() => resolveCmsImageProps('not a url at all ??')).not.toThrow();
  });
});

test.describe('CMS 이미지 소비자 6종이 resolveCmsImageProps를 실제로 쓴다', () => {
  const consumers: ReadonlyArray<{ file: readonly string[]; fields: readonly string[] }> = [
    { file: ['src', 'app', 'audit', 'page.tsx'], fields: ['content.hero.image'] },
    { file: ['src', 'app', 'b2b', 'page.tsx'], fields: ['content.hero.image'] },
    { file: ['src', 'app', 'concerns', 'page.tsx'], fields: ['content.hero.image', 'content.insurance.image'] },
    { file: ['src', 'app', 'experts', 'page.tsx'], fields: ['content.hero.image'] },
    { file: ['src', 'app', 'landing', 'care-kit', 'page.tsx'], fields: ['content.hero.image', 'content.body.partnerLogo'] },
    { file: ['src', 'components', 'brands', 'BrandsContent.tsx'], fields: ['content.hero.image', 'content.partnership.image'] },
  ];

  for (const { file, fields } of consumers) {
    const label = file.join('/');
    test(`${label} 은 resolveCmsImageProps를 import하고 각 CMS 이미지 필드에 적용한다`, () => {
      const source = read(...file);
      expect(source, `${label}에 resolveCmsImageProps import 누락`).toContain(
        "resolveCmsImageProps } from '@/lib/cms/imageSrc'",
      );
      for (const field of fields) {
        expect(source, `${label}에 ${field}를 넘기는 resolveCmsImageProps 호출 누락`).toContain(
          `resolveCmsImageProps(${field})`,
        );
      }
      // 소비자는 next/image에 넘기기 전에 항상 헬퍼가 반환한 unoptimized를 그대로 전달해야 한다 —
      // 원본 content.*.image 문자열을 다시 src로 직결하면 방어가 무력화된다.
      expect(source, `${label}에 unoptimized prop 전달 누락`).toMatch(/unoptimized=\{[a-zA-Z]+\.unoptimized\}/);
    });
  }
});
