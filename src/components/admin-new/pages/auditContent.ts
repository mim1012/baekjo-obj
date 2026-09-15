import { defaultPageTextSettings, type PageTextSettings } from '@/data/pageTextContent';

type AuditCard = {
  readonly number?: string;
  readonly title: string;
  readonly description: string;
  readonly bullets?: string;
  readonly visible: boolean;
};
type AuditSection = {
  readonly visible: boolean;
  readonly ariaLabel: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly items: readonly AuditCard[];
};
export type AuditContent = Record<string, unknown> & {
  readonly __managedVersion?: number;
  readonly hero: {
    readonly visible: boolean;
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
    readonly image: string;
    readonly imageAlt: string;
    readonly imageCaptionLine1: string;
    readonly imageCaptionLine2: string;
    readonly primaryCtaLabel: string;
    readonly primaryCtaHref: string;
    readonly secondaryCtaLabel: string;
    readonly secondaryCtaHref: string;
  };
  readonly checkpoints: AuditSection;
  readonly process: AuditSection;
  readonly status: AuditSection & {
    readonly notice: string;
    readonly disclaimer: string;
    readonly legalDisclaimer: string;
  };
  readonly closing: {
    readonly visible: boolean;
    readonly eyebrow: string;
    readonly title: string;
    readonly links: readonly { readonly label: string; readonly href: string; readonly visible: boolean }[];
  };
};

/** Pure import mapping. Activation is a separate, explicitly verified migration step. */
export function auditContentFromPageTexts(settings: PageTextSettings): AuditContent {
  const text = (id: string) => settings.values[`audit.${id}`] ?? defaultPageTextSettings.values[`audit.${id}`];
  return {
    hero: {
      visible: true,
      eyebrow: text('heroEyebrow'),
      title: [text('heroTitleLine1'), text('heroTitleLine2')].join('\n'),
      description: text('heroDescription'),
      image: '/images/brand-curation-hero.webp',
      imageAlt: text('heroImageAlt'),
      imageCaptionLine1: text('heroImageCaptionLine1'),
      imageCaptionLine2: text('heroImageCaptionLine2'),
      primaryCtaLabel: text('brandLink'), primaryCtaHref: '/brands',
      secondaryCtaLabel: '', secondaryCtaHref: '',
    },
    checkpoints: {
      ariaLabel: '백조오브제 Audit 네 가지 기준',
      visible: true, eyebrow: text('checkpointEyebrow'), title: text('checkpointTitle'),
      description: text('checkpointDescription'),
      items: [1, 2, 3, 4].map((index) => ({
        visible: true, number: text(`pillar${index}Number`), title: text(`pillar${index}Title`),
        description: text(`pillar${index}Description`),
        bullets: [1, 2, 3].map((check) => text(`pillar${index}Check${check}`)).join('\n'),
      })),
    },
    process: {
      ariaLabel: '백조오브제 Audit 검토 과정',
      visible: true, eyebrow: text('processEyebrow'), title: text('ongoingTitle'),
      description: text('ongoingDescription'),
      items: [1, 2, 3, 4].map((index) => ({
        visible: true, number: text(`process${index}Number`), title: text(`process${index}Title`),
        description: text(`process${index}Description`),
      })),
    },
    status: {
      ariaLabel: '백조오브제 Audit 안내',
      visible: true, eyebrow: text('howToReadEyebrow'), title: text('statusTitle'),
      description: text('statusDescription'),
      items: [1, 2, 3].map((index) => ({
        visible: true, title: text(`status${index}Label`), description: text(`status${index}Description`),
      })),
      notice: text('statusNote'), disclaimer: text('disclaimer'), legalDisclaimer: text('closingDescription'),
    },
    closing: {
      visible: true, eyebrow: text('closingEyebrow'), title: text('closingTitle'),
      links: [
        { label: text('closingBrand'), href: '/brands', visible: true },
        { label: text('closingShop'), href: '/shop', visible: true },
      ],
    },
  };
}

export function selectAuditContent(published: AuditContent | null, settings: PageTextSettings): AuditContent {
  return published ?? auditContentFromPageTexts(settings);
}
