export type OrderDateRange = {
  readonly createdFrom: string;
  readonly createdTo: string;
};

export type OrderDateRangeIso = {
  readonly createdFromIso?: string;
  readonly createdToExclusiveIso?: string;
};

export type OrderDateRangeParseError = 'invalid-date' | 'invalid-date-range';

export type OrderDateRangeParseResult =
  | { readonly ok: true; readonly range: OrderDateRange; readonly dbRange: OrderDateRangeIso }
  | { readonly ok: false; readonly error: OrderDateRangeParseError };

export type OrderQuickDateRange = 1 | 7 | 30 | 90 | 'clear';

const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const EMPTY_ORDER_DATE_RANGE: OrderDateRange = {
  createdFrom: '',
  createdTo: '',
};

function parseDateKey(value: string): string | null {
  if (!DATE_PATTERN.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10) === value ? value : null;
}

function kstStartToUtcIso(date: string): string {
  const utcTime = new Date(`${date}T00:00:00.000Z`).getTime() - KST_OFFSET_MS;
  return new Date(utcTime).toISOString();
}

function kstDateKey(value: string): string {
  return new Date(new Date(value).getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

export function addOrderDateDays(date: string, days: number): string {
  const time = new Date(`${date}T00:00:00.000Z`).getTime();
  return new Date(time + days * DAY_MS).toISOString().slice(0, 10);
}

export function countOrderDateDaysInclusive(from: string, to: string): number {
  const fromTime = new Date(`${from}T00:00:00.000Z`).getTime();
  const toTime = new Date(`${to}T00:00:00.000Z`).getTime();
  return Math.floor((toTime - fromTime) / DAY_MS) + 1;
}

export function toOrderDateRangeIso(range: OrderDateRange): OrderDateRangeIso {
  return {
    ...(range.createdFrom ? { createdFromIso: kstStartToUtcIso(range.createdFrom) } : {}),
    ...(range.createdTo ? { createdToExclusiveIso: kstStartToUtcIso(addOrderDateDays(range.createdTo, 1)) } : {}),
  };
}

export function parseOrderDateRange(range: OrderDateRange): OrderDateRangeParseResult {
  const createdFrom = range.createdFrom.trim();
  const createdTo = range.createdTo.trim();
  const fromKey = createdFrom ? parseDateKey(createdFrom) : null;
  const toKey = createdTo ? parseDateKey(createdTo) : null;

  if ((createdFrom && !fromKey) || (createdTo && !toKey)) return { ok: false, error: 'invalid-date' };
  if (fromKey && toKey && fromKey > toKey) return { ok: false, error: 'invalid-date-range' };

  const parsedRange = {
    createdFrom: fromKey ?? '',
    createdTo: toKey ?? '',
  };
  return { ok: true, range: parsedRange, dbRange: toOrderDateRangeIso(parsedRange) };
}

export function getQuickOrderDateRange(days: OrderQuickDateRange, now: Date = new Date()): OrderDateRange {
  if (days === 'clear') return EMPTY_ORDER_DATE_RANGE;
  const todayKey = new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
  return {
    createdFrom: addOrderDateDays(todayKey, -(days - 1)),
    createdTo: todayKey,
  };
}

export function matchesOrderDateRange(order: { readonly createdAt: string }, range: OrderDateRange): boolean {
  const createdDateKey = kstDateKey(order.createdAt);
  if (range.createdFrom && createdDateKey < range.createdFrom) return false;
  if (range.createdTo && createdDateKey > range.createdTo) return false;
  return true;
}
