import { test, expect } from '@playwright/test';

import nextConfig from '../../next.config';

/**
 * 관리자 업로드(브랜드 로고·상품 이미지)는 ImageUploader 가 Supabase Storage 공개 버킷에 저장하고
 * https://<project-ref>.supabase.co/storage/v1/object/public/... URL 을 돌려준다. next/image 는
 * remotePatterns 에 없는 호스트를 만나면 렌더 대신 즉시 throw 하므로, 이 패턴이 없으면 그 이미지를
 * 쓰는 공개 상세 페이지(/brands/[id], /shop/[id])가 통째로 크래시한다 — 시드 이미지가 전부 로컬
 * /public 경로라 지금까지 안 걸렸을 뿐이다(2026-07-18 e2e 작업 중 발견).
 */
test.describe('next/image Supabase storage host contract', () => {
  test('Supabase Storage public object URL 호스트가 remotePatterns 에 허용되어 있다', () => {
    expect(nextConfig.images?.remotePatterns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          protocol: 'https',
          hostname: '*.supabase.co',
          pathname: '/storage/v1/object/public/**',
        }),
      ]),
    );
  });
});
