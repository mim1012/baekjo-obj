import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const read = (filePath: string) => fs.readFileSync(path.resolve(__dirname, '../../', filePath), 'utf8');

test('파트너는 일반 마이페이지 대신 브랜드 주문 운영 화면으로 이동한다', () => {
  const header = read('src/components/common/Header.tsx');
  const mypage = read('src/app/mypage/page.tsx');
  const partnerOrders = read('src/components/partner/PartnerOrdersClient.tsx');

  expect(header).toContain("currentUser?.role === 'partner' ? '/partner/orders' : '/mypage'");
  expect(mypage).toContain("router.replace('/partner/orders')");
  expect(partnerOrders).toContain('주문 상세 보기');
  expect(partnerOrders).toContain('쇼핑몰로 돌아가기');
});
