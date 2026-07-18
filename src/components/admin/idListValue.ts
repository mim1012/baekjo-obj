/**
 * 관리자 추천 상품/브랜드 필드의 저장 형식은 "쉼표 구분 id 문자열"이다(계약·API 무변경).
 * AdminIdMultiPicker 는 이 문자열을 편집하지만 내부에서는 id 배열로 다룬다 — 그 사이 변환을
 * 순수 함수로 분리해 브라우저 없이 검증한다(admin project 관례). 선택 순서 = 저장 순서를 보존한다.
 */

/** 쉼표 구분 문자열 → id 배열. 공백 제거·빈 값 제거·중복 제거(첫 등장 순서 유지). */
export function parseIdList(value: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of value.split(',')) {
    const id = raw.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

/** id 배열 → 쉼표 구분 문자열(기존 draft/state 형식과 동일). */
export function joinIdList(ids: string[]): string {
  return ids.join(', ');
}

/**
 * id 를 토글한다 — 없으면 배열 끝에 추가(선택 순서 = 저장 순서), 있으면 제거.
 * 체크박스 선택/해제와 chip × 제거 모두 이 함수 하나로 처리한다.
 */
export function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((existing) => existing !== id) : [...ids, id];
}
