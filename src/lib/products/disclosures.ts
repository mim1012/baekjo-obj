import type { MadeToOrderPolicy, ProductDisclosure } from '@/types';

export const PRODUCT_DISCLOSURE_SCHEMA_VERSION = '2026-09-06';

export interface DisclosureFieldDefinition {
  key: string;
  label: string;
  placeholder: string;
}
export interface DisclosureCategoryDefinition {
  code: string;
  label: string;
  fields: DisclosureFieldDefinition[];
}

export const PRODUCT_DISCLOSURE_CATEGORIES: DisclosureCategoryDefinition[] = [
  {
    code: 'food',
    label: '푸드·간식',
    fields: [
      ['productName', '제품명', '포장에 적힌 정식 제품명'],
      ['foodType', '식품/사료의 유형', '예: 반려동물용 단미사료'],
      ['manufacturer', '제조업소·수입자', '상호와 소재지'],
      ['countryOfOrigin', '제조국', '예: 대한민국'],
      ['manufacturedAndExpiry', '제조일·소비기한', '표시 위치 또는 기준을 함께 입력'],
      ['content', '내용량', '예: 200g'],
      ['ingredients', '원재료명·성분', '포장 표기와 동일하게 입력'],
      ['feedingAndStorage', '급여·보관 방법', '권장 급여량과 보관 조건'],
      ['caution', '주의사항', '알레르기·연령 등 주의사항'],
      ['support', '소비자 상담 연락처', '판매자 고객센터'],
    ].map(([key, label, placeholder]) => ({ key, label, placeholder })),
  },
  {
    code: 'nutrition',
    label: '영양·건강관리',
    fields: [
      ['productName', '제품명', '정식 제품명'],
      ['feedType', '사료의 종류·용도', '예: 반려동물용 보조사료'],
      ['registeredComponents', '등록성분량', '등록 표기와 동일하게 입력'],
      ['ingredients', '사용 원료', '원료명과 배합 정보'],
      ['manufacturer', '제조업자·수입자', '상호와 소재지'],
      ['countryOfOrigin', '제조국', '예: 대한민국'],
      ['manufacturedAndExpiry', '제조일·유통기한', '표시 위치 또는 기준'],
      ['feedingMethod', '급여 방법', '체중별 권장량 등'],
      ['storageAndCaution', '보관·주의사항', '보관 조건과 섭취 주의'],
      ['support', '소비자 상담 연락처', '판매자 고객센터'],
    ].map(([key, label, placeholder]) => ({ key, label, placeholder })),
  },
  {
    code: 'care',
    label: '케어·위생용품',
    fields: [
      ['productName', '품명·모델명', '정식 품명과 모델명'],
      ['materialOrIngredients', '재질·성분', '전 성분 또는 주요 재질'],
      ['sizeOrVolume', '크기·용량', '예: 300ml / 20×30cm'],
      ['manufacturer', '제조자·수입자', '상호와 소재지'],
      ['countryOfOrigin', '제조국', '예: 대한민국'],
      ['manufacturedOrExpiry', '제조연월·사용기한', '해당 없으면 근거와 함께 해당 없음'],
      ['usage', '사용 방법', '안전한 사용 순서'],
      ['caution', '사용상 주의사항', '반려동물·보호자 주의사항'],
      ['qualityWarranty', '품질보증기준', '관련 법령 또는 판매자 기준'],
      ['support', 'A/S 책임자와 연락처', '판매자 고객센터'],
    ].map(([key, label, placeholder]) => ({ key, label, placeholder })),
  },
  {
    code: 'fashion',
    label: '패션·산책용품',
    fields: [
      ['productName', '품명·모델명', '정식 품명과 모델명'],
      ['material', '소재', '겉감·안감·부자재'],
      ['color', '색상', '실제 판매 색상'],
      ['size', '치수', '측정 기준과 오차 범위'],
      ['manufacturer', '제조자·수입자', '상호와 소재지'],
      ['countryOfOrigin', '제조국', '예: 대한민국'],
      ['manufacturedAt', '제조연월', '표시 위치 또는 해당 없음 근거'],
      ['careInstructions', '세탁·취급 방법', '손세탁 등'],
      ['caution', '사용상 주의사항', '사이즈·착용 주의'],
      ['qualityAndSupport', '품질보증·A/S', '기준과 연락처'],
    ].map(([key, label, placeholder]) => ({ key, label, placeholder })),
  },
  {
    code: 'pet-loss',
    label: '펫로스·기록상품',
    fields: [
      ['productName', '품명', '정식 품명'],
      ['material', '주요 소재', '종이·금속·목재 등'],
      ['size', '크기·구성', '완성 크기와 구성품'],
      ['manufacturer', '제조자·판매자', '상호와 소재지'],
      ['countryOfOrigin', '제조국', '예: 대한민국'],
      ['productionMethod', '제작 방식', '기성품 또는 주문제작'],
      ['handling', '취급 방법', '보관·관리 방법'],
      ['caution', '주의사항', '색상·각인·사진 등 유의사항'],
      ['qualityWarranty', '품질보증기준', '교환·재제작 기준'],
      ['support', 'A/S 책임자와 연락처', '판매자 고객센터'],
    ].map(([key, label, placeholder]) => ({ key, label, placeholder })),
  },
  {
    code: 'life',
    label: '라이프·가구·장난감',
    fields: [
      ['productName', '품명·모델명', '정식 품명과 모델명'],
      ['material', '재질', '주요 재질'],
      ['sizeAndWeight', '크기·중량', '가로×세로×높이, 중량'],
      ['color', '색상', '실제 판매 색상'],
      ['manufacturer', '제조자·수입자', '상호와 소재지'],
      ['countryOfOrigin', '제조국', '예: 대한민국'],
      ['manufacturedAt', '제조연월', '표시 위치 또는 해당 없음 근거'],
      ['safety', '안전인증·주의사항', '해당 인증과 안전 주의'],
      ['maintenance', '관리 방법', '세척·보관 방법'],
      ['qualityAndSupport', '품질보증·A/S', '기준과 연락처'],
    ].map(([key, label, placeholder]) => ({ key, label, placeholder })),
  },
];

export function disclosureDefinition(code?: string): DisclosureCategoryDefinition | undefined {
  return PRODUCT_DISCLOSURE_CATEGORIES.find((category) => category.code === code);
}

export function missingDisclosureFields(disclosure?: ProductDisclosure): DisclosureFieldDefinition[] {
  const definition = disclosureDefinition(disclosure?.categoryCode);
  if (!definition || disclosure?.schemaVersion !== PRODUCT_DISCLOSURE_SCHEMA_VERSION) {
    return definition?.fields ?? [{ key: 'categoryCode', label: '상품군', placeholder: '' }];
  }
  return definition.fields.filter((field) => !disclosure.values[field.key]?.trim());
}

export function isDisclosureComplete(disclosure?: ProductDisclosure): boolean {
  return Boolean(disclosureDefinition(disclosure?.categoryCode)) && missingDisclosureFields(disclosure).length === 0;
}

export function normalizeDisclosure(raw: unknown): ProductDisclosure | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  if (typeof value.categoryCode !== 'string' || !disclosureDefinition(value.categoryCode)) return null;
  if (value.schemaVersion !== PRODUCT_DISCLOSURE_SCHEMA_VERSION) return null;
  if (!value.values || typeof value.values !== 'object' || Array.isArray(value.values)) return null;
  const values: Record<string, string> = {};
  for (const [key, fieldValue] of Object.entries(value.values as Record<string, unknown>)) {
    if (typeof fieldValue !== 'string' || fieldValue.length > 1000) return null;
    values[key] = fieldValue.trim();
  }
  const definition = disclosureDefinition(value.categoryCode)!;
  if (Object.keys(values).some((key) => !definition.fields.some((field) => field.key === key))) return null;
  return { categoryCode: value.categoryCode, schemaVersion: PRODUCT_DISCLOSURE_SCHEMA_VERSION, values };
}

export const EMPTY_MADE_TO_ORDER_POLICY: MadeToOrderPolicy = {
  active: false,
  productionPeriod: '',
  proofMethod: '',
  revisionCount: '',
  revisionScope: '',
  photoPurpose: '',
  photoRetentionPeriod: '',
  photoDeletionMethod: '',
  cancellationRestriction: '',
  policyVersion: 'made-to-order-2026-09-06',
};

export function normalizeMadeToOrderPolicy(raw: unknown): MadeToOrderPolicy | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  if (typeof value.active !== 'boolean' || typeof value.policyVersion !== 'string') return null;
  const fields = ['productionPeriod', 'proofMethod', 'revisionCount', 'revisionScope', 'photoPurpose', 'photoRetentionPeriod', 'photoDeletionMethod', 'cancellationRestriction'] as const;
  const out = { active: value.active, policyVersion: value.policyVersion } as MadeToOrderPolicy;
  for (const field of fields) {
    if (typeof value[field] !== 'string' || value[field].length > 1000) return null;
    out[field] = value[field].trim();
  }
  if (out.active && fields.some((field) => !out[field])) return null;
  return out;
}
