// {{company.*}} 토큰 ↔ COMPANY(SSOT, src/data/company.ts) 값 상호 변환 헬퍼.
//
// CMS 정의·소스 매퍼는 회사 정보(전화·이메일 등)를 문자열로 바로 굳히지 않고 `{{company.tel}}`
// 같은 토큰으로 남긴다. 그래야 COMPANY 값이 바뀌어도 CMS 콘텐츠를 다시 게시하지 않고 화면에
// 최신 값이 반영된다. 실제 치환은 렌더링 시점(StaticLegalDocument 등)에서만 일어난다.
//
// tokenizeCompanyValues는 그 반대 방향 — legalContent.ts처럼 COMPANY 값이 이미 문자열에 그대로
// 구워진(baked-in) 원본 텍스트에서, 소스 매퍼가 다시 토큰 형태로 되돌릴 때 쓴다(D4: 정본화 시
// 문자열 그대로 복사하면 안 되는 필드에 한해 사용).
import { COMPANY } from '@/data/company';

const COMPANY_TOKEN_PATTERN = /\{\{company\.([a-zA-Z0-9_]+)\}\}/g;

type CompanyRecord = Record<string, string>;

const COMPANY_RECORD = COMPANY as unknown as CompanyRecord;

function resolveToken(key: string): string | undefined {
  return typeof COMPANY_RECORD[key] === 'string' ? COMPANY_RECORD[key] : undefined;
}

/** 문자열 안의 `{{company.<field>}}` 토큰을 COMPANY의 현재 값으로 바꾼다. 알 수 없는 필드는 그대로 둔다. */
export function substituteCompanyTokens(value: string): string {
  if (!value.includes('{{company.')) return value;
  return value.replace(COMPANY_TOKEN_PATTERN, (match, key: string) => resolveToken(key) ?? match);
}

/** 객체·배열을 재귀적으로 순회하며 모든 문자열 값에 substituteCompanyTokens를 적용한다. */
export function substituteCompanyTokensDeep<T>(value: T): T {
  if (typeof value === 'string') return substituteCompanyTokens(value) as unknown as T;
  if (Array.isArray(value)) return value.map((item) => substituteCompanyTokensDeep(item)) as unknown as T;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).map(
      ([key, val]) => [key, substituteCompanyTokensDeep(val)] as const,
    );
    return Object.fromEntries(entries) as T;
  }
  return value;
}

/**
 * 문자열 안에 이미 구워진(baked-in) COMPANY 값을 찾아 `{{company.<field>}}` 토큰으로 되돌린다.
 *
 * `fields`를 반드시 명시한다 — 전체 COMPANY 필드를 대상으로 부분 문자열을 찾으면, 화면이 실제로
 * 그 필드를 실시간 참조하지 않는데도 우연히 값이 같은 문구(예: 회사명이 고정 문구로 적힌 곳)까지
 * 잘못 토큰화한다. 화면이 실제로 `${COMPANY.xxx}`로 렌더링하는 필드만 골라서 넘겨야 한다.
 */
export function tokenizeCompanyValues(
  value: string,
  fields: readonly (keyof typeof COMPANY)[],
): string {
  let result = value;
  for (const key of fields) {
    const literal = COMPANY[key];
    if (typeof literal === 'string' && literal.length > 0 && result.includes(literal)) {
      result = result.split(literal).join(`{{company.${key}}}`);
    }
  }
  return result;
}
