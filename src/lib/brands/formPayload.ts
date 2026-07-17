// BrandForm 이 실제로 편집하는 필드만 서버로 보내기 위한 순수 페이로드 빌더.
// React 컴포넌트에서 분리해 단위 테스트(tests/admin/brand-validate.spec.ts)가
// 브라우저 없이 payload 형태를 직접 검증할 수 있게 한다.
import type { Brand, BrandAuditReport, BrandShippingPolicy } from '@/types';

/**
 * BrandForm 화이트리스트 — 이 폼이 편집 UI를 가진 필드만 나열한다.
 * 폼은 자기가 편집하는 필드만 patch한다. `...formData`로 로드 시점 스냅샷을 통째로
 * 되보내면 상세 페이지·시드가 그 사이 저장한 auditReport·멀티셀렉트(representativeProductIds·
 * relatedConcernSlugs·auditPoints)·sourceUrls 값을 stale하게 덮어쓴다(S1 ProductForm 교훈).
 * updateBrand가 read-modify-write라, 화이트리스트 밖 필드를 안 보내면 기존 값이 그대로 보존된다.
 */
export const BRAND_FORM_FIELDS = [
  'name',
  'logo',
  'description',
  'philosophy',
  'auditGrade',
  'officialUrl',
  'isRecommended',
  'isVisible',
  'isNew',
  'displayOrder',
] as const;

/**
 * 폼 상태에서 화이트리스트 필드만 골라 명시적으로 payload를 구성한다(암묵적 스프레드 금지).
 * - create/update 둘 다 이 payload만 보낸다(create는 서버 validate가 requireAll로 필수를 확인).
 * - officialUrl은 빈 문자열을 그대로 실어 **지우기**를 지원한다. 서버 validate가 빈 문자열을
 *   허용하고(지우기 경로) read-modify-write가 기존 값을 ''로 덮어 URL이 실제로 삭제된다.
 *   빈 문자열을 payload에서 빼면 안 보내져 기존 URL이 보존돼 영영 못 지운다(그게 회귀였다).
 * - displayOrder는 값이 있을 때만 보낸다(미입력 = 서버 기본/기존값 유지).
 */
export function buildBrandPayload(formData: Partial<Brand>): Partial<Brand> {
  const payload: Partial<Brand> = {
    name: formData.name,
    logo: formData.logo,
    description: formData.description,
    philosophy: formData.philosophy,
    auditGrade: formData.auditGrade,
    officialUrl: formData.officialUrl?.trim() ?? '',
    isRecommended: formData.isRecommended ?? false,
    isVisible: formData.isVisible !== false,
    isNew: formData.isNew ?? false,
  };

  if (formData.displayOrder !== undefined) payload.displayOrder = formData.displayOrder;

  return payload;
}

/** 진열 순서 클라이언트 검증. 0 이상의 정수만 허용. 유효하면 null, 아니면 에러 메시지. */
export function validateDisplayOrder(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    return '진열 순서는 0 이상의 정수로 입력해주세요.';
  }
  return null;
}

/* ───────────────────────────────────────────────────────────────────────────
 * 브랜드 "상세 편집"(전 필드) payload — 모달 BrandForm 과 별개 화이트리스트.
 *
 * 모달은 기본 10필드만 patch 하고 대형 필드(auditReport·멀티셀렉트·배열)는 재전송하지
 * 않아 보존한다(BRAND_FORM_FIELDS). 상세 편집 화면은 그 대형 필드까지 편집 UI를 갖는
 * "전 필드" 에디터라, 기본 필드 + 대형 필드를 모두 명시적으로 담는다. 여기서도 `...formData`
 * 암묵 스프레드는 금지 — 편집 UI 밖 값이 새어 들어가지 않게 아래 화이트리스트로만 만든다.
 * ─────────────────────────────────────────────────────────────────────────── */

/** 상세 에디터의 auditReport 하위 폼 상태. BrandAuditReport 와 동형이나 빈 문자열을 허용한다. */
export interface AuditReportFormState {
  reportNo: string;
  auditedAt: string;
  status: string;
  headline: string;
  summaryTitle: string;
  summary: string;
  selectionReason: string;
  process: string[];
}

/** 빈 auditReport 폼(초기값·리셋용). */
export function emptyAuditReportForm(): AuditReportFormState {
  return {
    reportNo: '',
    auditedAt: '',
    status: '',
    headline: '',
    summaryTitle: '',
    summary: '',
    selectionReason: '',
    process: [],
  };
}

const AUDIT_REPORT_TEXT_KEYS = [
  'reportNo',
  'auditedAt',
  'status',
  'headline',
  'summaryTitle',
  'summary',
  'selectionReason',
] as const;

/** process 배열에서 공백 항목을 제거해 실제 입력된 단계만 남긴다. */
function cleanStringList(items: string[]): string[] {
  return items.map((s) => s.trim()).filter((s) => s.length > 0);
}

function cleanOptionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : undefined;
}

function cleanOptionalMoney(value: number | undefined): number | undefined {
  return value === undefined || !Number.isFinite(value) ? undefined : value;
}

export function buildBrandShippingPayload(form: BrandShippingPolicy): BrandShippingPolicy {
  const shipping: BrandShippingPolicy = {};

  if (form.defaultCarrier) shipping.defaultCarrier = form.defaultCarrier;
  shipping.shippingFee = cleanOptionalMoney(form.shippingFee);
  shipping.freeShippingThreshold = cleanOptionalMoney(form.freeShippingThreshold);
  shipping.returnShippingFee = cleanOptionalMoney(form.returnShippingFee);
  shipping.exchangeShippingFee = cleanOptionalMoney(form.exchangeShippingFee);
  shipping.dispatchEstimate = cleanOptionalText(form.dispatchEstimate);
  shipping.returnAddress = cleanOptionalText(form.returnAddress);
  shipping.asNotice = cleanOptionalText(form.asNotice);
  shipping.supportContact = cleanOptionalText(form.supportContact);
  shipping.supportHours = cleanOptionalText(form.supportHours);

  return shipping;
}

/**
 * auditReport 폼의 채움 상태 — '전무'(empty) | '완전'(complete) | '부분'(partial).
 * 서버 validate 가 8필드 전부를 요구하므로 "일부만 채움"은 400 이다. 그래서 클라이언트에서
 * 전부/전무만 유효로 강제한다. process 는 공백 제외 1개 이상이면 채워진 것으로 본다.
 */
export function auditReportFillState(form: AuditReportFormState): 'empty' | 'complete' | 'partial' {
  const filledTexts = AUDIT_REPORT_TEXT_KEYS.filter((k) => form[k].trim().length > 0).length;
  const hasProcess = cleanStringList(form.process).length > 0;
  const filledCount = filledTexts + (hasProcess ? 1 : 0);
  const totalSlots = AUDIT_REPORT_TEXT_KEYS.length + 1; // 7 텍스트 + process
  if (filledCount === 0) return 'empty';
  if (filledCount === totalSlots) return 'complete';
  return 'partial';
}

/**
 * auditReport 폼 클라이언트 검증. 부분 입력이면 안내 메시지, 전부/전무면 null(통과).
 * 이 검증이 사용자에게 "전부 채우거나 전부 비우세요"를 말로 안내해 서버 400 을 예방한다.
 */
export function validateAuditReportForm(form: AuditReportFormState): string | null {
  if (auditReportFillState(form) === 'partial') {
    return '감사 보고서는 8개 항목을 모두 채우거나 모두 비워주세요. 일부만 입력하면 저장할 수 없습니다.';
  }
  return null;
}

/**
 * auditReport 폼에서 비어 있는 항목 키 목록을 반환한다(부분 입력 시 어느 필드가 빈지 UI 표시용).
 * process 는 공백 제외 1개 이상이면 채운 것으로 본다. 전무·완전이면 per-field 표시가 불필요하므로
 * 호출부(BrandDetailEditor)는 fillState 가 'partial' 일 때만 이 목록을 쓴다.
 */
export function emptyAuditReportFields(
  form: AuditReportFormState,
): Array<keyof AuditReportFormState> {
  const empties: Array<keyof AuditReportFormState> = [];
  for (const k of AUDIT_REPORT_TEXT_KEYS) {
    if (form[k].trim().length === 0) empties.push(k);
  }
  if (cleanStringList(form.process).length === 0) empties.push('process');
  return empties;
}

/**
 * "기존 감사 보고서를 이 화면에서 비울 수 있는가" — 순수 판정(테스트 가능하게 추출).
 * 계약 한계(§4, validate 가 auditReport:null 을 400 처리 + JSON 에서 undefined 드롭 → read-modify-write
 * 가 기존 값 보존)로, **이미 보고서가 있는데 폼을 전부 비운** 경우는 실제로 지워지지 않는다.
 * 안내문이 "전부 비우면 플레이스홀더" 라고 약속하면 거짓말이 되므로 그 경우만 저장을 차단한다.
 * 신규(보고서 없던) 브랜드의 빈 폼은 지우기 시도가 아니므로 허용한다.
 * 완전 해법(validate 가 null 을 지우기로 수용)은 별도 contract PR.
 */
export function canClearAuditReport(
  hadReport: boolean,
  fillState: 'empty' | 'complete' | 'partial',
): boolean {
  return !(hadReport && fillState === 'empty');
}

/**
 * auditReport 폼 → payload. '완전'이면 정규화한 BrandAuditReport, 그 외(전무·부분)는 undefined.
 * 전무일 때 undefined 를 실어 "확인 중" 플레이스홀더로 되돌린다(부분은 호출 전 검증이 막는다).
 */
export function buildAuditReportPayload(form: AuditReportFormState): BrandAuditReport | undefined {
  if (auditReportFillState(form) !== 'complete') return undefined;
  return {
    reportNo: form.reportNo.trim(),
    auditedAt: form.auditedAt.trim(),
    status: form.status.trim(),
    headline: form.headline.trim(),
    summaryTitle: form.summaryTitle.trim(),
    summary: form.summary.trim(),
    selectionReason: form.selectionReason.trim(),
    process: cleanStringList(form.process),
  };
}

/** 상세 에디터의 전체 폼 상태(대형 필드 포함). */
export interface BrandDetailFormState {
  name?: string;
  logo?: string;
  description?: string;
  philosophy?: string;
  auditGrade?: Brand['auditGrade'];
  officialUrl?: string;
  isRecommended?: boolean;
  isVisible?: boolean;
  isNew?: boolean;
  displayOrder?: number;
  auditReport: AuditReportFormState;
  representativeProductIds: string[];
  relatedConcernSlugs: string[];
  auditPoints: string[];
  sourceUrls: string[];
  shipping?: BrandShippingPolicy;
}

/** 상세 에디터가 명시적으로 담는 전 필드 화이트리스트(문서·테스트용). */
export const BRAND_DETAIL_FIELDS = [
  'name',
  'logo',
  'description',
  'philosophy',
  'auditGrade',
  'officialUrl',
  'isRecommended',
  'isVisible',
  'isNew',
  'displayOrder',
  'auditReport',
  'representativeProductIds',
  'relatedConcernSlugs',
  'auditPoints',
  'sourceUrls',
  'shipping',
] as const;

/**
 * 상세 폼 상태 → 서버 payload(전 필드 명시 화이트리스트). `...formData` 금지.
 * - 기본 필드는 모달과 동일 규칙(officialUrl 은 빈 문자열 실어 지우기 지원, displayOrder 는 값 있을 때만).
 * - 멀티셀렉트·배열은 새 배열로 복사해 담고, auditPoints·sourceUrls 는 공백 항목을 제거한다.
 * - auditReport 는 항상 키를 담되 값은 buildAuditReportPayload 결과(완전=객체 / 전무=undefined).
 *   ⚠️ 계약 한계: undefined 는 JSON 직렬화에서 빠지고 서버는 read-modify-write 라 "안 보냄=보존".
 *   즉 없던 브랜드에 채우기·부분입력 차단은 완전 동작하나, 이미 있는 보고서를 비워
 *   플레이스홀더로 되돌리는 것은 현재 서버 계약(validate 가 auditReport:null 을 400 처리)으로는
 *   전달되지 않는다. 이 화면 범위에서 계약(validate/repo)은 건드리지 않는다.
 */
export function buildBrandDetailPayload(form: BrandDetailFormState): Partial<Brand> {
  const payload: Partial<Brand> = {
    name: form.name,
    logo: form.logo,
    description: form.description,
    philosophy: form.philosophy,
    auditGrade: form.auditGrade,
    officialUrl: form.officialUrl?.trim() ?? '',
    isRecommended: form.isRecommended ?? false,
    isVisible: form.isVisible !== false,
    isNew: form.isNew ?? false,
    representativeProductIds: [...form.representativeProductIds],
    relatedConcernSlugs: [...form.relatedConcernSlugs],
    auditPoints: cleanStringList(form.auditPoints),
    sourceUrls: cleanStringList(form.sourceUrls),
    shipping: buildBrandShippingPayload(form.shipping ?? {}),
    auditReport: buildAuditReportPayload(form.auditReport),
  };

  if (form.displayOrder !== undefined) payload.displayOrder = form.displayOrder;

  return payload;
}
