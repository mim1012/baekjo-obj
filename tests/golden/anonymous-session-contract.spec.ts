import { expect, test } from '@playwright/test';

test.describe('익명 세션 API 계약', () => {
  test('GET /api/members/me는 익명을 null 사용자로 반환한다', async ({ request }) => {
    const response = await request.get('/api/members/me');

    expect(response.status()).toBe(200);
    expect(response.headers()['cache-control']).toContain('no-store');
    expect(await response.json()).toEqual({ user: null });
  });

  test('GET /api/wishlist는 익명을 빈 찜 목록으로 반환한다', async ({ request }) => {
    const response = await request.get('/api/wishlist');

    expect(response.status()).toBe(200);
    expect(response.headers()['cache-control']).toContain('no-store');
    expect(await response.json()).toEqual({ productIds: [] });
  });

  const protectedWrites = [
    { method: 'PATCH', path: '/api/members/me', data: {} },
    { method: 'DELETE', path: '/api/members/me' },
    { method: 'POST', path: '/api/wishlist', data: { productId: 'p1' } },
    { method: 'DELETE', path: '/api/wishlist', data: { productId: 'p1' } },
  ] as const;

  for (const probe of protectedWrites) {
    test(`${probe.method} ${probe.path}는 익명 쓰기를 차단한다`, async ({ request }) => {
      const response = await request.fetch(probe.path, {
        method: probe.method,
        ...('data' in probe ? { data: probe.data } : {}),
      });

      expect(response.status()).toBe(401);
      expect(await response.json()).toEqual({ error: 'unauthorized' });
    });
  }
});
