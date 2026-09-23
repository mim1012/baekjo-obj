import { expect, test } from '@playwright/test';

const normalize = (text: string) => text.replace(/\s+/g, '');

for (const route of ['/about']) {
  test(`${route} keeps desktop copy and complete hero image on mobile`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(route);
    const desktopText = normalize(await page.locator('main').first().innerText());
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 900 });
      expect(normalize(await page.locator('main').first().innerText())).toBe(desktopText);
      const hero = page.locator(route === '/about' ? 'main header' : 'main section').first();
      const img = hero.locator('img').first();
      await img.evaluate((el) => (el as HTMLImageElement).decode());
      const bounds = (await img.boundingBox())!;
      expect(bounds.width / bounds.height).toBeCloseTo(1.5, 2);
      expect(await img.evaluate((el) => getComputedStyle(el).objectFit)).toBe('contain');
      const hiddenParagraphs = await page.locator('main p').evaluateAll((paragraphs) =>
        paragraphs.filter((el) => el.textContent?.trim() && el.getBoundingClientRect().height === 0).length,
      );
      expect(hiddenParagraphs).toBe(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
    }
  });
}
