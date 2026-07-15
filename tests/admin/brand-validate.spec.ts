import { test, expect } from '@playwright/test';
import { validateBrandFields } from '@/lib/brands/validate';

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
