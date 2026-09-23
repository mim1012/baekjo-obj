import { expect, test } from '@playwright/test';

const widths = [320, 390, 768, 1440] as const;
const imagePath = (src: string) => {
  const url = new URL(src, 'http://localhost:3000');
  return url.searchParams.get('url') ?? url.pathname;
};

for (const width of widths) {
  test(`login preserves all content and home branding at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    const homeLogo = imagePath((await page.getByTestId('site-header-logo').getAttribute('src'))!);
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: '다시 만나 반가워요.' })).toBeVisible();
    const story = page.getByRole('region', { name: '백조오브제와 함께하는 반려생활' });
    await expect(story.getByText(/함께한 오늘을/)).toBeVisible();
    await expect(story.getByText(/맞춤 케어 기록을 이어서 확인하세요/)).toBeVisible();
    await expect(page.getByLabel('이메일', { exact: true })).toBeVisible();
    await expect(page.getByLabel('비밀번호', { exact: true })).toBeVisible();
    await expect(page.getByLabel('로그인 상태 유지')).toBeVisible();
    for (const name of ['로그인', '카카오 로그인', '네이버 로그인']) {
      await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
    }
    for (const name of ['회원가입', '비밀번호 찾기']) {
      await expect(page.getByRole('link', { name, exact: true })).toBeVisible();
    }
    for (const img of await page.locator('img').all()) {
      const src = (await img.getAttribute('src'))!;
      if (!src.includes('login-cat-window')) expect(imagePath(src)).toBe(homeLogo);
    }
    const bounds = await page.locator('main > div').first().boundingBox();
    expect(bounds?.x).toBe(0);
    expect(bounds?.width).toBe(width);
    const photo = story.getByRole('img', { name: /잠든 고양이/ });
    await photo.evaluate((img) => (img as HTMLImageElement).decode());
    if (width < 1024) {
      const image = await photo.boundingBox();
      expect(image!.width).toBeCloseTo(image!.height, 0);
      expect(await photo.evaluate((img) => getComputedStyle(img).objectFit)).toBe('contain');
      const form = await page.getByRole('region', { name: '로그인', exact: true }).boundingBox();
      expect(form!.y + form!.height).toBeLessThanOrEqual(image!.y + 1);
      for (const input of await page.locator('input[type="email"], input[type="password"]').all()) {
        expect(await input.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
      }
    } else {
      expect((await photo.boundingBox())!.width).toBe(width / 2);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
    await page.screenshot({ path: testInfo.outputPath(`login-${width}.png`), fullPage: true });
  });
}
