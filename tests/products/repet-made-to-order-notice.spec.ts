import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { COMPANY } from '@/data/company';
import { isRepetMadeToOrderProduct } from '@/components/shop/RepetMadeToOrderNotice';

const ROOT = path.resolve(__dirname, '..', '..');
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

test.describe('RE:펫 주문제작 안내 계약', () => {
  test('RE:펫 브랜드에만 주문제작 안내 조건을 적용한다', () => {
    expect(isRepetMadeToOrderProduct('b6')).toBe(true);
    expect(isRepetMadeToOrderProduct('b1')).toBe(false);
    expect(isRepetMadeToOrderProduct('')).toBe(false);
  });

  test('상품 상세와 주문/결제 화면에서 동일한 안내를 사용한다', () => {
    const notice = read('src/components/shop/RepetMadeToOrderNotice.tsx');
    const detail = read('src/components/shop/ProductDetailClient.tsx');
    const checkout = read('src/app/checkout/page.tsx');

    for (const copy of [
      '주문제작 안내',
      '본 상품은 주문 후 제작자와의 확인 과정이 필요한 주문제작 상품입니다.',
      '본 상품은 1:1 주문제작 상품으로, 제작이 시작된 이후에는 주문 취소가 어렵습니다. 제작 일정에 따라 최대 3개월까지 소요될 수 있으니 충분히 확인하신 후 주문해주세요.',
      '주문 완료 후 원활한 제작 진행을 위해',
      '‘백조오브제 주문제작’ 카카오톡 채널',
      '주문자명과 주문번호를 남겨주세요.',
      '사진 전달 및 제작 관련 세부사항은 해당 채널을 통해 안내됩니다.',
    ]) {
      expect(notice).toContain(copy);
    }
    expect(detail).toContain('isRepetMadeToOrder && <RepetMadeToOrderNotice');
    expect(checkout).toContain('hasRepetMadeToOrderItem && <RepetMadeToOrderNotice');
    expect(COMPANY.kakaoTalkUrl).toBe('https://pf.kakao.com/_KYWxon');
  });
});
