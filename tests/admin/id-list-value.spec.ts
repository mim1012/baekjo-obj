import { test, expect } from '@playwright/test';
import { joinIdList, parseIdList, toggleId } from '@/components/admin/idListValue';

/**
 * AdminIdMultiPicker 의 저장 형식 변환(쉼표 문자열 ↔ id 배열)을 브라우저 없이 검증한다(admin project).
 * 계약·API 무변경의 핵심 — 이름 기반 선택 UI 를 써도 저장값은 기존 쉼표 구분 문자열 그대로여야 하고,
 * 선택 순서 = 저장 순서가 보존돼야 한다.
 */
test.describe('idListValue', () => {
  test('parseIdList 는 공백/빈 값을 제거하고 첫 등장 순서로 중복을 제거한다', () => {
    expect(parseIdList('p1, p2 , p3')).toEqual(['p1', 'p2', 'p3']);
    expect(parseIdList('  p1 ,, , p2 ,')).toEqual(['p1', 'p2']);
    expect(parseIdList('p2, p1, p2, p1')).toEqual(['p2', 'p1']);
    expect(parseIdList('')).toEqual([]);
    expect(parseIdList('   ')).toEqual([]);
  });

  test('joinIdList 는 기존 draft 형식(", " 구분)으로 되돌린다', () => {
    expect(joinIdList(['p1', 'p2', 'p3'])).toBe('p1, p2, p3');
    expect(joinIdList([])).toBe('');
  });

  test('parse → join 왕복은 정규화된 문자열을 안정적으로 재생산한다', () => {
    expect(joinIdList(parseIdList('p3 , p1,p1 , p2'))).toBe('p3, p1, p2');
  });

  test('toggleId 는 없으면 끝에 추가(순서 보존), 있으면 제거한다', () => {
    expect(toggleId(['p1', 'p2'], 'p3')).toEqual(['p1', 'p2', 'p3']);
    expect(toggleId(['p1', 'p2', 'p3'], 'p2')).toEqual(['p1', 'p3']);
    expect(toggleId([], 'p1')).toEqual(['p1']);
    // 같은 값을 두 번 토글하면 원상 복귀한다.
    expect(toggleId(toggleId(['p1'], 'p2'), 'p2')).toEqual(['p1']);
  });
});
