import { test, expect } from '@playwright/test';
import { validateBrandFields } from '@/lib/brands/validate';
import { buildBrandPayload, validateDisplayOrder } from '@/lib/brands/formPayload';
import type { Brand } from '@/types';

// 브랜드 관리자 입력 검증(§4 콘센트 계약) 회귀 스펙 — 순수 함수, 브라우저·DB 불필요.
// 생성=requireAll:true(필수 누락 시 실패), 수정=requireAll:false(넘어온 필드만 검증·병합).

/** 생성 통과에 필요한 최소 필수 필드 묶음. */
function base(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: '지위픽',
    logo: '/brands/b1.webp',
    description: '한 줄 소개',
    philosophy: '브랜드 철학',
    auditGrade: 'A+',
    ...over,
  };
}

/* ── officialUrl (버그 수정: 폼엔 있으나 validate가 안 받아 저장돼도 버려지던 필드) ── */

test('officialUrl 은 이제 검증을 통과하고 결과에 담긴다', () => {
  const out = validateBrandFields(base({ officialUrl: 'https://example.com' }), true);
  expect(out).not.toBeNull();
  expect(out?.officialUrl).toBe('https://example.com');
});

test('officialUrl 빈 문자열도 허용된다(폼에서 지우기 가능)', () => {
  const out = validateBrandFields({ officialUrl: '' }, false);
  expect(out).not.toBeNull();
  expect(out?.officialUrl).toBe('');
});

test('officialUrl 이 500자를 넘으면 거부한다', () => {
  const out = validateBrandFields({ officialUrl: 'h'.repeat(501) }, false);
  expect(out).toBeNull();
});

/* ── sourceUrls (계약만 개방 — 폼 UI는 후속) ── */

test('sourceUrls 배열이 통과하고 결과에 담긴다', () => {
  const urls = ['https://a.com', 'https://b.com'];
  const out = validateBrandFields({ sourceUrls: urls }, false);
  expect(out).not.toBeNull();
  expect(out?.sourceUrls).toEqual(urls);
});

test('sourceUrls 가 21개면 거부한다(≤20)', () => {
  const urls = Array.from({ length: 21 }, (_, i) => `https://s${i}.com`);
  const out = validateBrandFields({ sourceUrls: urls }, false);
  expect(out).toBeNull();
});

test('sourceUrls 항목이 500자를 넘으면 거부한다', () => {
  const out = validateBrandFields({ sourceUrls: ['h'.repeat(501)] }, false);
  expect(out).toBeNull();
});

test('sourceUrls 정확히 20개는 통과한다(경계값)', () => {
  const urls = Array.from({ length: 20 }, (_, i) => `https://s${i}.com`);
  const out = validateBrandFields({ sourceUrls: urls }, false);
  expect(out).not.toBeNull();
  expect(out?.sourceUrls).toHaveLength(20);
});

/* ── isVisible ── */

test('isVisible: false 가 통과한다(숨김 저장)', () => {
  const out = validateBrandFields({ isVisible: false }, false);
  expect(out).not.toBeNull();
  expect(out?.isVisible).toBe(false);
});

test('생성 시 isVisible 누락하면 true 로 기본을 채운다', () => {
  const out = validateBrandFields(base(), true); // isVisible 안 보냄
  expect(out).not.toBeNull();
  expect(out?.isVisible).toBe(true);
});

test('isVisible 이 boolean 이 아니면 거부한다', () => {
  const out = validateBrandFields({ isVisible: 'yes' }, false);
  expect(out).toBeNull();
});

/* ── displayOrder ── */

test('displayOrder 정수가 통과한다', () => {
  const out = validateBrandFields({ displayOrder: 3 }, false);
  expect(out).not.toBeNull();
  expect(out?.displayOrder).toBe(3);
});

test('displayOrder 음수는 거부한다', () => {
  expect(validateBrandFields({ displayOrder: -1 }, false)).toBeNull();
});

test('displayOrder 소수는 거부한다', () => {
  expect(validateBrandFields({ displayOrder: 1.5 }, false)).toBeNull();
});

test('displayOrder 10만 초과는 거부한다', () => {
  expect(validateBrandFields({ displayOrder: 100_001 }, false)).toBeNull();
});

/* ── isNew ── */

test('isNew: true 가 통과한다(신규 뱃지)', () => {
  const out = validateBrandFields({ isNew: true }, false);
  expect(out).not.toBeNull();
  expect(out?.isNew).toBe(true);
});

test('shipping 정책은 택배사·금액·문구를 검증하고 정규화한다', () => {
  const out = validateBrandFields({
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
  }, false);

  expect(out).not.toBeNull();
  expect(out?.shipping).toEqual({
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

test('shipping 정책은 미지원 택배사와 음수 금액을 거부한다', () => {
  expect(validateBrandFields({ shipping: { defaultCarrier: 'bad-carrier' } }, false)).toBeNull();
  expect(validateBrandFields({ shipping: { shippingFee: -1 } }, false)).toBeNull();
  expect(validateBrandFields({ shipping: { freeShippingThreshold: Number.NaN } }, false)).toBeNull();
});

test('shipping 정책은 빈 텍스트와 빈 택배사를 제거 가능한 빈 객체로 허용한다', () => {
  const out = validateBrandFields({
    shipping: {
      defaultCarrier: '',
      dispatchEstimate: ' ',
      asNotice: '',
      returnShippingFee: '',
    },
  }, false);

  expect(out).not.toBeNull();
  expect(out?.shipping).toEqual({});
});

/* ── 수정 시 기존 값 보존(S1 detailBlocks 교훈의 브랜드판) ──
 * 수정(requireAll=false)에서 { name }만 보내면 결과에 auditReport·representativeProductIds
 * 키 자체가 없어야 한다 — validate 는 넘어온 키만 반환하고, repo.updateBrand 는
 * read-modify-write 로 기존 값을 병합하므로 폼 저장으로 감사보고서가 날아가지 않는다. */
test('수정 시 { name }만 보내면 auditReport·멀티셀렉트 키가 결과에 없다(기존 값 보존)', () => {
  const out = validateBrandFields({ name: '새이름' }, false);
  expect(out).not.toBeNull();
  expect(out).toEqual({ name: '새이름' });
  expect('auditReport' in out!).toBe(false);
  expect('representativeProductIds' in out!).toBe(false);
  expect('relatedConcernSlugs' in out!).toBe(false);
  expect('auditPoints' in out!).toBe(false);
});

/* ── buildBrandPayload — 폼의 실제 전송 payload 화이트리스트 (적대 MEDIUM-1) ──
 * validate 단위 테스트만으론 부족하다: 폼이 formData 전체를 스프레드로 되보내면
 * validate 는 통과하지만 auditReport·멀티셀렉트가 stale하게 재전송돼 상세 페이지·시드가
 * 저장한 값을 덮어쓴다. 그래서 폼 payload 빌더를 순수 함수로 뽑아 직접 잠근다. */

/** 로드 시점 스냅샷 — 폼이 편집하지 않는 필드까지 전부 채워진 formData. */
function loadedFormData(over: Partial<Brand> = {}): Partial<Brand> {
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
    // 폼이 편집하지 않는 필드 — 상세 페이지·시드가 소유. payload 에 절대 실려선 안 된다.
    auditReport: {
      reportNo: 'BOA-1',
      auditedAt: '2026-01-01',
      status: '완료',
      headline: 'h',
      summaryTitle: 's',
      summary: 'sum',
      selectionReason: 'why',
      process: ['a', 'b'],
    },
    representativeProductIds: ['p1', 'p2'],
    relatedConcernSlugs: ['skin'],
    auditPoints: ['point'],
    sourceUrls: ['https://src.com'],
    ...over,
  };
}

test('payload 는 폼이 편집하지 않는 auditReport·멀티셀렉트·sourceUrls 키를 담지 않는다(재전송 안 함=보존 보장)', () => {
  const payload = buildBrandPayload(loadedFormData());
  expect('auditReport' in payload).toBe(false);
  expect('representativeProductIds' in payload).toBe(false);
  expect('relatedConcernSlugs' in payload).toBe(false);
  expect('auditPoints' in payload).toBe(false);
  expect('sourceUrls' in payload).toBe(false);
});

test('payload 는 화이트리스트 필드만 담는다', () => {
  const payload = buildBrandPayload(loadedFormData());
  const allowed = new Set([
    'name', 'logo', 'description', 'philosophy', 'auditGrade',
    'officialUrl', 'isRecommended', 'isVisible', 'isNew', 'displayOrder',
  ]);
  for (const key of Object.keys(payload)) {
    expect(allowed.has(key)).toBe(true);
  }
  expect(payload.name).toBe('지위픽');
  expect(payload.auditGrade).toBe('A+');
});

test('payload: officialUrl 빈 문자열은 그대로 실어 지우기를 지원한다', () => {
  // 값이 있던 브랜드의 URL을 지우려면 payload에 ''가 실려야 한다. 제외하면(안 보내면)
  // read-modify-write가 기존 URL을 보존해 영영 못 지운다 — 그게 회귀였다.
  const cleared = buildBrandPayload(loadedFormData({ officialUrl: '' }));
  expect(cleared.officialUrl).toBe('');
  const blank = buildBrandPayload(loadedFormData({ officialUrl: '   ' }));
  expect(blank.officialUrl, '공백만 입력해도 지우기로 정규화').toBe('');
  const trimmed = buildBrandPayload(loadedFormData({ officialUrl: '  https://x.com  ' }));
  expect(trimmed.officialUrl).toBe('https://x.com');
});

test('payload: displayOrder 미입력(undefined)이면 키를 담지 않는다(기존/기본값 유지)', () => {
  const payload = buildBrandPayload(loadedFormData({ displayOrder: undefined }));
  expect('displayOrder' in payload).toBe(false);
});

test('payload: 불리언 기본값 — isVisible 은 false 가 아니면 노출, isNew/isRecommended 는 미지정 시 false', () => {
  const hidden = buildBrandPayload(loadedFormData({ isVisible: false }));
  expect(hidden.isVisible).toBe(false);
  const bare = buildBrandPayload({ name: '이름' });
  expect(bare.isVisible).toBe(true);
  expect(bare.isNew).toBe(false);
  expect(bare.isRecommended).toBe(false);
});

/* ── MEDIUM-2: 부분 auditReport 브랜드도 폼 저장이 막히지 않는다 ──
 * 화이트리스트가 auditReport를 아예 안 보내므로, formData에 (8필드 미충족)부분 auditReport가
 * 실려 있어도 payload→validate 경로가 통과한다(예전엔 재전송→validateAuditReport 실패→400). */
test('MEDIUM-2: formData에 부분 auditReport가 있어도 payload→validate 가 통과한다(400 해소)', () => {
  const partial = { reportNo: 'BOA-9' } as unknown as Brand['auditReport'];
  const payload = buildBrandPayload(loadedFormData({ auditReport: partial, isVisible: false }));
  expect('auditReport' in payload).toBe(false);
  // 수정 경로(requireAll=false)로 서버 검증 — 부분 auditReport가 없으니 null이 아니어야 한다.
  const validated = validateBrandFields(payload, false);
  expect(validated).not.toBeNull();
  expect(validated?.isVisible).toBe(false);
});

/* ── validateDisplayOrder — 폼 클라이언트 검증 (React M3) ── */

test('validateDisplayOrder: 0 이상 정수는 통과(null)', () => {
  expect(validateDisplayOrder(0)).toBeNull();
  expect(validateDisplayOrder(3)).toBeNull();
  expect(validateDisplayOrder(undefined)).toBeNull();
});

test('validateDisplayOrder: 음수·소수는 에러 메시지', () => {
  expect(validateDisplayOrder(-1)).not.toBeNull();
  expect(validateDisplayOrder(1.5)).not.toBeNull();
});
