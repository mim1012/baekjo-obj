export function normalizeBrandAlias(value: string): string {
  return value.toLocaleLowerCase('ko-KR').trim().replace(/[\s()._-]+/g, '');
}
