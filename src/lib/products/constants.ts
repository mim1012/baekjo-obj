export const CATALOG_STATUS_META = {
  ready: {
    label: "판매 준비",
    tone: "warning",
  },
  draft: {
    label: "초안",
    tone: "neutral",
  },
  sold_out: {
    label: "품절",
    tone: "neutral",
  },
} as const;

export const VISIBILITY_META = {
  true: {
    label: "노출",
    tone: "success",
  },
  false: {
    label: "숨김",
    tone: "neutral",
  },
} as const;

export type PriceState = "UNSET" | "ZERO" | "VALID";

export function getPriceState(value: unknown): PriceState {
  if (value === null || value === undefined || value === "") {
    return "UNSET";
  }

  const price = Number(value);

  if (!Number.isFinite(price)) {
    return "UNSET";
  }

  if (price === 0) {
    return "ZERO";
  }

  return "VALID";
}
