import { test, expect } from '@playwright/test';
import {
  buildBrandDetailPayload,
  buildAuditReportPayload,
  buildBrandShippingPayload,
  auditReportFillState,
  validateAuditReportForm,
  emptyAuditReportForm,
  emptyAuditReportFields,
  canClearAuditReport,
  BRAND_DETAIL_FIELDS,
  type AuditReportFormState,
  type BrandDetailFormState,
} from '@/lib/brands/formPayload';

// 브랜드 "상세 편집"(전 필드) payload 회귀 스펙 — 순수 함수, 브라우저·DB 불필요.
// 모달(BRAND_FORM_FIELDS)과 달리 대형 필드(auditReport·멀티셀렉트·배열)까지 담되,
// 암묵 스프레드가 아니라 명시 화이트리스트로만 담는지 잠근다.

/** 완전히 채워진 auditReport 폼. */
function fullReport(over: Partial<AuditReportFormState> = {}): AuditReportFormState {
  return {
    reportNo: 'BOA-2026-001',
    auditedAt: '2026-01-15',
    status: '검증 완료',
    headline: '헤드라인',
    summaryTitle: '요약 제목',
    summary: '요약 본문',
    selectionReason: '선정 이유',
    process: ['성분 분석', '현장 실사'],
    ...over,
  };
}

/** 상세 폼 상태 기본값. */
function form(over: Partial<BrandDetailFormState> = {}): BrandDetailFormState {
  return {
    name: '지위픽',
    logo: '/brands/b1.webp',
    description: '한 줄 소개',
    philosophy: '브랜드 철학',
    auditGrade: 'A+',
    officialUrl: 'https://example.com',
    isRecommended: true,
    isVisible: true,
    isNew: false,
    displayOrder: 3,
    auditReport: fullReport(),
    representativeProductIds: ['p1', 'p2'],
    relatedConcernSlugs: ['tear'],
    auditPoints: ['무방부제'],
    sourceUrls: ['https://src.com'],
    ...over,
  };
}

/* ── auditReportFillState — 전무/완전/부분 판정 ── */

test('빈 폼은 empty(전무)', () => {
  expect(auditReportFillState(emptyAuditReportForm())).toBe('empty');
});

test('8필드(단계 포함) 전부 채우면 complete(완전)', () => {
  expect(auditReportFillState(fullReport())).toBe('complete');
});

test('일부만 채우면 partial(부분) — 텍스트 일부만', () => {
  expect(auditReportFillState(fullReport({ summary: '' }))).toBe('partial');
});

test('process(단계)만 비우면 partial — 나머지 텍스트는 다 있음', () => {
  expect(auditReportFillState(fullReport({ process: [] }))).toBe('partial');
});

test('process 항목이 공백뿐이면 채운 것으로 치지 않는다', () => {
  expect(auditReportFillState(fullReport({ process: ['   ', ''] }))).toBe('partial');
});

test('텍스트는 전무인데 process만 있으면 partial', () => {
  const onlyProcess = { ...emptyAuditReportForm(), process: ['단계'] };
  expect(auditReportFillState(onlyProcess)).toBe('partial');
});

/* ── validateAuditReportForm — 부분 입력 클라이언트 차단 ── */

test('부분 입력이면 안내 메시지를 반환한다(저장 차단)', () => {
  expect(validateAuditReportForm(fullReport({ headline: '' }))).not.toBeNull();
});

test('전부 채움/전부 비움은 통과(null)', () => {
  expect(validateAuditReportForm(fullReport())).toBeNull();
  expect(validateAuditReportForm(emptyAuditReportForm())).toBeNull();
});

/* ── emptyAuditReportFields — 부분 입력 시 어느 필드가 빈지 ── */

test('부분 입력이면 빈 필드 키 목록을 반환한다', () => {
  const empties = emptyAuditReportFields(fullReport({ summary: '', headline: '' }));
  expect(empties).toContain('summary');
  expect(empties).toContain('headline');
  expect(empties).not.toContain('reportNo');
});

test('process 가 공백뿐이면 빈 필드 목록에 process 가 포함된다', () => {
  expect(emptyAuditReportFields(fullReport({ process: ['   ', ''] }))).toContain('process');
});

test('완전이면 빈 필드가 없다', () => {
  expect(emptyAuditReportFields(fullReport())).toEqual([]);
});

/* ── canClearAuditReport — 기존 보고서 비우기 차단(적대 HIGH 회귀) ──
 * 안내문이 "전부 비우면 플레이스홀더"라 약속하는데 계약상 실제로 안 지워진다.
 * 기존 보고서가 있는데 폼을 전부 비운 경우만 차단(거짓 약속 제거). 이 순수 함수를 잠근다.
 * ⚠️ 한계(정직 고지): 이 스펙은 canClearAuditReport 순수 함수의 진리표만 고정한다.
 * "handleSubmit 이 실제로 이 함수를 호출한다"는 **배선**은 여기서 안 잡힌다 —
 * BrandDetailEditor 의 배선을 지워도 이 스펙은 전부 통과한다(§contract-project-gates:
 * 단위 테스트가 화면 회귀를 못 잡는 그 패턴). 배선 회귀는 §8-6 프리뷰 실구동(게이트3)이
 * 실제 저장을 구동해 잡는다.
 */

test('기존 보고서 O + 폼 전무 = 비울 수 없음(차단)', () => {
  expect(canClearAuditReport(true, auditReportFillState(emptyAuditReportForm()))).toBe(false);
});

test('기존 보고서 O + 폼 완전 = 허용(수정)', () => {
  expect(canClearAuditReport(true, auditReportFillState(fullReport()))).toBe(true);
});

test('기존 보고서 X + 폼 전무 = 허용(지우기 시도 아님, 신규 빈 폼)', () => {
  expect(canClearAuditReport(false, auditReportFillState(emptyAuditReportForm()))).toBe(true);
});

test('기존 보고서 X + 폼 완전 = 허용(신규 등록)', () => {
  expect(canClearAuditReport(false, auditReportFillState(fullReport()))).toBe(true);
});

/* ── buildAuditReportPayload ── */

test('완전이면 정규화된 BrandAuditReport 를 반환한다', () => {
  const out = buildAuditReportPayload(fullReport({ reportNo: '  BOA-9  ', process: ['a', '  ', 'b'] }));
  expect(out).not.toBeUndefined();
  expect(out?.reportNo).toBe('BOA-9'); // 트림
  expect(out?.process).toEqual(['a', 'b']); // 공백 항목 제거
});

test('전무면 undefined(플레이스홀더 복귀 신호)', () => {
  expect(buildAuditReportPayload(emptyAuditReportForm())).toBeUndefined();
});

test('부분이면 undefined(호출 전 검증이 막지만 방어적으로도 미전송)', () => {
  expect(buildAuditReportPayload(fullReport({ summary: '' }))).toBeUndefined();
});

/* ── buildBrandDetailPayload — 전 필드 화이트리스트 ── */

test('payload 키는 전부 BRAND_DETAIL_FIELDS 화이트리스트 안에만 있다(암묵 스프레드 없음)', () => {
  const allowed = new Set<string>(BRAND_DETAIL_FIELDS);
  const payload = buildBrandDetailPayload(form());
  for (const key of Object.keys(payload)) {
    expect(allowed.has(key), `예상 밖 키: ${key}`).toBe(true);
  }
});

test('payload 는 상세 폼이 편집하는 대형 필드를 담는다(모달과 달리)', () => {
  const payload = buildBrandDetailPayload(form());
  expect(payload.representativeProductIds).toEqual(['p1', 'p2']);
  expect(payload.relatedConcernSlugs).toEqual(['tear']);
  expect(payload.auditPoints).toEqual(['무방부제']);
  expect(payload.sourceUrls).toEqual(['https://src.com']);
  expect(payload.auditReport?.reportNo).toBe('BOA-2026-001');
});

test('입력을 그대로 참조하지 않는다 — 멀티셀렉트/배열은 새 배열로 복사', () => {
  const src = form();
  const payload = buildBrandDetailPayload(src);
  expect(payload.representativeProductIds).not.toBe(src.representativeProductIds);
  expect(payload.relatedConcernSlugs).not.toBe(src.relatedConcernSlugs);
});

test('멀티셀렉트/배열이 비면 빈 배열을 담는다(선택 해제 반영)', () => {
  const payload = buildBrandDetailPayload(
    form({ representativeProductIds: [], relatedConcernSlugs: [], auditPoints: [], sourceUrls: [] }),
  );
  expect(payload.representativeProductIds).toEqual([]);
  expect(payload.relatedConcernSlugs).toEqual([]);
  expect(payload.auditPoints).toEqual([]);
  expect(payload.sourceUrls).toEqual([]);
});

test('auditPoints·sourceUrls 의 공백 항목은 payload 에서 제거된다', () => {
  const payload = buildBrandDetailPayload(
    form({ auditPoints: ['유효', '  ', ''], sourceUrls: ['https://a.com', '   '] }),
  );
  expect(payload.auditPoints).toEqual(['유효']);
  expect(payload.sourceUrls).toEqual(['https://a.com']);
});

test('shipping payload 는 기본 택배사·금액·정책 문구를 정규화한다', () => {
  const payload = buildBrandDetailPayload(
    form({
      shipping: {
        carrierLabel: '  자체 배송 운영  ',
        defaultCarrier: 'cj',
        shippingFee: 3000,
        shippingFeeLabel: '  배송비 3,000원  ',
        freeShippingThreshold: 50000,
        extraFeeNotice: '  제주 +4,000원  ',
        returnShippingFee: 3000,
        exchangeShippingFee: 6000,
        dispatchEstimate: '  결제 후 1~2영업일  ',
        returnAddress: '  서울시 반품로 1  ',
        returnPolicy: '  7일 이내 접수  ',
        returnExclusions: '  사용 흔적 제한  ',
        asNotice: '  하자 접수 안내  ',
        supportContact: '  help@example.com  ',
        supportHours: '  평일 10:00~17:00  ',
      },
    }),
  );

  expect(payload.shipping).toEqual({
    carrierLabel: '자체 배송 운영',
    defaultCarrier: 'cj',
    shippingFee: 3000,
    shippingFeeLabel: '배송비 3,000원',
    freeShippingThreshold: 50000,
    extraFeeNotice: '제주 +4,000원',
    returnShippingFee: 3000,
    exchangeShippingFee: 6000,
    dispatchEstimate: '결제 후 1~2영업일',
    returnAddress: '서울시 반품로 1',
    returnPolicy: '7일 이내 접수',
    returnExclusions: '사용 흔적 제한',
    asNotice: '하자 접수 안내',
    supportContact: 'help@example.com',
    supportHours: '평일 10:00~17:00',
  });
});

test('shipping payload 는 빈 텍스트와 미입력 숫자를 제거한다', () => {
  const shipping = buildBrandShippingPayload({
    defaultCarrier: undefined,
    shippingFee: undefined,
    freeShippingThreshold: Number.NaN,
    returnShippingFee: 0,
    exchangeShippingFee: undefined,
    carrierLabel: '',
    shippingFeeLabel: '  ',
    extraFeeNotice: undefined,
    dispatchEstimate: '   ',
    returnAddress: '',
    returnPolicy: '',
    returnExclusions: '  ',
    asNotice: 'A/S 안내',
    supportContact: undefined,
    supportHours: '  ',
  });

  expect(shipping).toEqual({
    returnShippingFee: 0,
    asNotice: 'A/S 안내',
  });
});

test('auditReport 전무면 payload.auditReport 는 undefined(플레이스백)', () => {
  const payload = buildBrandDetailPayload(form({ auditReport: emptyAuditReportForm() }));
  expect(payload.auditReport).toBeUndefined();
});

test('officialUrl 빈 문자열/공백은 지우기로 정규화(모달과 동일 규칙)', () => {
  expect(buildBrandDetailPayload(form({ officialUrl: '' })).officialUrl).toBe('');
  expect(buildBrandDetailPayload(form({ officialUrl: '   ' })).officialUrl).toBe('');
  expect(buildBrandDetailPayload(form({ officialUrl: '  https://x.com  ' })).officialUrl).toBe('https://x.com');
});

test('displayOrder 미입력(undefined)이면 키를 담지 않는다(기존/기본값 유지)', () => {
  const payload = buildBrandDetailPayload(form({ displayOrder: undefined }));
  expect('displayOrder' in payload).toBe(false);
});

test('불리언 기본값 — isVisible 은 false 아니면 노출, isRecommended/isNew 미지정 시 false', () => {
  const hidden = buildBrandDetailPayload(form({ isVisible: false }));
  expect(hidden.isVisible).toBe(false);
  const bare = buildBrandDetailPayload(
    form({ isVisible: undefined, isRecommended: undefined, isNew: undefined }),
  );
  expect(bare.isVisible).toBe(true);
  expect(bare.isRecommended).toBe(false);
  expect(bare.isNew).toBe(false);
});
