// BrandForm 이 실제로 편집하는 필드만 서버로 보내기 위한 순수 페이로드 빌더.
// React 컴포넌트에서 분리해 단위 테스트(tests/admin/brand-validate.spec.ts)가
// 브라우저 없이 payload 형태를 직접 검증할 수 있게 한다.
import type { Brand } from '@/types';

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
