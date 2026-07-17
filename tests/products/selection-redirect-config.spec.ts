import { test, expect } from '@playwright/test';

import nextConfig from '../../next.config';

test.describe('selection redirect contract', () => {
  test('/selection is a temporary redirect to /shop', async () => {
    expect(typeof nextConfig.redirects).toBe('function');

    const redirects = await nextConfig.redirects!();
    expect(redirects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: '/selection',
          destination: '/shop',
          permanent: false,
        }),
        expect.objectContaining({
          source: '/selection/:path*',
          destination: '/shop',
          permanent: false,
        }),
      ]),
    );
  });
});
