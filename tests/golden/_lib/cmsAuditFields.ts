import { expect, type Page } from '@playwright/test';
import type { AuditContent } from '@/components/admin-new/pages/auditContent';

export function longText(label: string, token: string): string {
  return `${label} ${token}\n${'긴 문구 보존 '.repeat(90)}끝`;
}

export function phaseAAudit(token: string): AuditContent {
  return {
    hero: {
      visible: true,
      eyebrow: `hero-eyebrow-${token}`,
      title: `hero-title-a-${token}\nhero-title-b-${token}`,
      description: longText('hero-description', token),
      image: `/images/brand-curation-hero.webp?audit=${token}`,
      imageAlt: `hero-image-alt-${token}`,
      imageCaptionLine1: `hero-caption-1-${token}`,
      imageCaptionLine2: `hero-caption-2-${token}`,
      primaryCtaLabel: `hero-primary-${token}`,
      primaryCtaHref: `/brands?audit=${token}`,
      secondaryCtaLabel: `hero-secondary-${token}`,
      secondaryCtaHref: `/shop?audit=${token}`,
    },
    checkpoints: {
      visible: true,
      ariaLabel: `checkpoints-aria-${token}`,
      eyebrow: `checkpoints-eyebrow-${token}`,
      title: `checkpoints-title-${token}`,
      description: longText('checkpoints-description', token),
      items: [4, 3, 2, 1].map((index) => ({
        visible: true,
        number: `C${index}-${token}`,
        title: `checkpoint-title-${index}-${token}`,
        description: `checkpoint-description-${index}-${token}`,
        bullets: `checkpoint-bullet-${index}-a-${token}\ncheckpoint-bullet-${index}-b-${token}`,
      })),
    },
    process: {
      visible: true,
      ariaLabel: `process-aria-${token}`,
      eyebrow: `process-eyebrow-${token}`,
      title: `process-title-${token}`,
      description: longText('process-description', token),
      items: [4, 3, 2, 1].map((index) => ({
        visible: true,
        number: `P${index}-${token}`,
        title: `process-title-${index}-${token}`,
        description: `process-description-${index}-${token}`,
      })),
    },
    status: {
      visible: true,
      ariaLabel: `status-aria-${token}`,
      eyebrow: `status-eyebrow-${token}`,
      title: `status-title-${token}`,
      description: `status-description-${token}`,
      items: [3, 2, 1].map((index) => ({
        visible: true,
        title: `status-title-${index}-${token}`,
        description: `status-description-${index}-${token}`,
      })),
      notice: `status-notice-${token}`,
      disclaimer: longText('status-disclaimer', token),
      legalDisclaimer: `status-legal-${token}`,
    },
    closing: {
      visible: true,
      eyebrow: `closing-eyebrow-${token}`,
      title: `closing-title-${token}`,
      links: [
        { label: `closing-shop-${token}`, href: `/shop?audit=${token}`, visible: true },
        { label: `closing-reviews-${token}`, href: `/reviews?audit=${token}`, visible: true },
        { label: `closing-brands-${token}`, href: `/brands?audit=${token}`, visible: true },
      ],
    },
  };
}

export function phaseBAudit(token: string): AuditContent {
  const content = phaseAAudit(token);
  return {
    ...content,
    hero: {
      ...content.hero,
      secondaryCtaLabel: '',
      secondaryCtaHref: `/shop?audit-empty=${token}`,
    },
    checkpoints: {
      ...content.checkpoints,
      items: content.checkpoints.items.map((item, index) => ({ ...item, visible: index !== 1 })),
    },
    status: {
      ...content.status,
      items: content.status.items.map((item, index) => ({ ...item, visible: index !== 1 })),
      notice: '',
    },
    closing: {
      ...content.closing,
      links: content.closing.links.map((link, index) => ({ ...link, visible: index !== 1 })),
    },
  };
}

export async function expectPublicDom(page: Page, expected: AuditContent): Promise<void> {
  await expect(page.locator('[data-audit-content="cms"]')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('img', { name: expected.hero.imageAlt })).toBeVisible();
  for (const text of [
    expected.hero.eyebrow, ...expected.hero.title.split('\n'), textSentinel(expected.hero.description), expected.hero.imageCaptionLine1,
    expected.hero.imageCaptionLine2, expected.hero.primaryCtaLabel, expected.hero.secondaryCtaLabel,
    expected.checkpoints.eyebrow, expected.checkpoints.title, textSentinel(expected.checkpoints.description),
    expected.process.eyebrow, expected.process.title, textSentinel(expected.process.description), expected.status.eyebrow,
    expected.status.title, expected.status.description, expected.status.notice, expected.status.disclaimer,
    expected.status.legalDisclaimer, expected.closing.eyebrow, expected.closing.title,
  ].filter((text) => text.length > 0)) {
    await expect(page.getByText(text, { exact: false }).first(), `Missing public text: ${text.slice(0, 80)}`).toBeVisible();
  }
  await expect(page.getByRole('region', { name: expected.checkpoints.ariaLabel })).toBeVisible();
  await expect(page.locator('ol').filter({ hasText: expected.process.items[0]?.title ?? '' })).toHaveAttribute('aria-label', expected.process.ariaLabel);
  await expect(page.getByLabel(expected.status.ariaLabel)).toBeVisible();
  await expectItems(page, expected.checkpoints.items);
  await expectItems(page, expected.process.items);
  await expectItems(page, expected.status.items);
  await expectVisibleOrder(page, expected.checkpoints.items.filter((item) => item.visible).map((item) => item.title));
  await expectVisibleOrder(page, expected.process.items.filter((item) => item.visible).map((item) => item.title));
  await expect(page.getByRole('link', { name: expected.hero.primaryCtaLabel })).toHaveAttribute('href', expected.hero.primaryCtaHref);
  if (expected.hero.secondaryCtaLabel) {
    await expect(page.getByRole('link', { name: expected.hero.secondaryCtaLabel })).toHaveAttribute('href', expected.hero.secondaryCtaHref);
  } else {
    await expect(page.getByRole('link', { name: /hero-secondary-/u })).toHaveCount(0);
  }
  await expect(page.getByRole('link', { name: expected.closing.links[0]?.label ?? '' })).toHaveAttribute('href', expected.closing.links[0]?.href ?? '');
  for (const link of expected.closing.links.slice(1)) {
    if (link.visible) {
      await expect(page.getByRole('link', { name: link.label })).toHaveAttribute('href', link.href);
    } else {
      await expect(page.getByRole('link', { name: link.label })).toHaveCount(0);
    }
  }
}

function textSentinel(value: string): string {
  return value.split('\n')[0] ?? value;
}

async function expectItems(
  page: Page,
  items: readonly { readonly number?: string; readonly title: string; readonly description: string; readonly bullets?: string; readonly visible: boolean }[],
): Promise<void> {
  for (const item of items) {
    for (const text of [item.number, item.title, item.description, ...(item.bullets?.split('\n') ?? [])].filter((entry): entry is string => Boolean(entry))) {
      if (item.visible) {
        await expect(page.getByText(text, { exact: false }).first(), `Missing visible item text: ${text}`).toBeVisible();
      } else {
        await expect(page.getByText(text, { exact: false }), `Hidden item leaked: ${text}`).toHaveCount(0);
      }
    }
  }
}

async function expectVisibleOrder(page: Page, texts: readonly string[]): Promise<void> {
  let previous = -1;
  for (const text of texts) {
    const offset = await page.locator('body').evaluate((body, needle) => body.textContent?.indexOf(needle) ?? -1, text);
    expect(offset, `Text not found for order assertion: ${text}`).toBeGreaterThan(previous);
    previous = offset;
  }
}
