import { test, expect } from '@playwright/test';

test('홈은 요청된 6개 쇼핑 카테고리 바로가기만 노출한다', async ({ page }) => {
  await page.goto('/');

  const quickShop = page.getByRole('navigation', { name: '쇼핑 카테고리 바로가기' });
  const expectedLinks = [
    { name: '강아지', href: '/shop?petType=dog' },
    { name: '고양이', href: '/shop?petType=cat' },
    { name: '소동물', href: '/shop?petType=small' },
    { name: '사료·간식', href: '/shop?category=dining-and-nourish' },
    { name: '위생·배변', href: '/shop?category=fragrance-and-hygiene' },
    { name: '건강관리', href: '/shop?category=wellness-and-care' },
  ];

  await expect(quickShop.getByRole('link')).toHaveCount(expectedLinks.length);
  await expect(page.getByText('빠른 쇼핑', { exact: true })).toHaveCount(0);

  for (const link of expectedLinks) {
    await expect(quickShop.getByRole('link', { name: link.name, exact: true })).toHaveAttribute('href', link.href);
  }
});
