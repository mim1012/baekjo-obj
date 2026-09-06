import { test, expect } from '@playwright/test';

test.describe('고객 법적 안내 화면', () => {
  test('홈·상품·브랜드 화면에 중개 및 큐레이션 안내가 보인다', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('marketplace-notice')).toHaveCount(2);
    await expect(page.getByText('통신판매의 당사자가 아닙니다', { exact: false }).first()).toBeVisible();

    await page.goto('/brands');
    await expect(page.getByText(/곳의 큐레이션 브랜드/)).toBeVisible();
    await expect(page.getByText('검증 브랜드 수', { exact: true })).toHaveCount(0);
    await expect(page.getByText('안심하고 선택할 수 있는 안전성을 갖춘 브랜드', { exact: true })).toHaveCount(0);

    await page.goto('/shop/p4');
    await expect(page.getByTestId('marketplace-notice')).toBeVisible();
    await expect(page.getByRole('link', { name: '백조 오브제 자체 큐레이션 기준 보기' }).first()).toHaveAttribute('href', '/audit');
  });

  test('케어가이드 두 위치에 의료 안내가 보인다', async ({ page }) => {
    await page.goto('/concerns/tear');

    await expect(page.getByTestId('care-guide-disclaimer')).toHaveCount(2);
    await expect(page.getByText('수의사의 진단·처방 또는 치료를 대신하지 않습니다', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('증상이 지속되거나 악화되는 경우 수의사와 상담', { exact: false }).last()).toBeVisible();
  });

  test('환불정책과 개인정보 연락처가 통일돼 보인다', async ({ page }) => {
    await page.goto('/refund-policy');
    await expect(page.getByTestId('marketplace-notice')).toBeVisible();
    await expect(page.getByText('시행일: 2026년 9월 1일')).toBeVisible();
    await expect(page.getByText('상품을 공급받은 날부터 3개월 이내', { exact: false })).toBeVisible();
    await expect(page.getByText('알 수 있었던 날부터 30일 이내', { exact: false })).toBeVisible();

    await page.goto('/privacy');
    await expect(page.getByText('· 전화: 1544-9883', { exact: false })).toBeVisible();
    await expect(page.getByText('010-5683-1725', { exact: false })).toHaveCount(0);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(hasHorizontalOverflow).toBe(false);
  });
});
