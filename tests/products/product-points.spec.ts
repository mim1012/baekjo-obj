import { test, expect } from '@playwright/test';
import { getProductPointsRateLabel } from '@/lib/products/points';

// 적립금 설정은 저장 계약만 존재한다. PDP는 설정이 켜져 있고 0보다 큰 rate가 있을 때만
// 최소 안내 행을 렌더할 수 있도록 표시 조건을 순수 함수로 잠근다.
test.describe('상품 적립금 표시 조건', () => {
  test('pointsEnabled=true 이고 pointsRate>0 일 때만 라벨을 반환한다', () => {
    expect(getProductPointsRateLabel({ pointsEnabled: true, pointsRate: 5 })).toBe('5%');
    expect(getProductPointsRateLabel({ pointsEnabled: true, pointsRate: 2.5 })).toBe('2.5%');
  });

  test('비활성·미입력·0% 는 PDP 안내를 숨긴다', () => {
    expect(getProductPointsRateLabel({ pointsEnabled: false, pointsRate: 5 })).toBeNull();
    expect(getProductPointsRateLabel({ pointsEnabled: true, pointsRate: undefined })).toBeNull();
    expect(getProductPointsRateLabel({ pointsEnabled: true, pointsRate: 0 })).toBeNull();
  });
});
