import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function source(...segments: string[]): string {
  return fs.readFileSync(path.join(root, ...segments), 'utf8');
}

test('제품 상세는 성분 안내와 브랜드 검토 구역 및 연결 탭을 노출하지 않는다', () => {
  const productPage = source('src', 'app', 'shop', '[id]', 'page.tsx');
  const tabsClient = source('src', 'components', 'shop', 'ProductTabsClient.tsx');
  const productDetailClient = source('src', 'components', 'shop', 'ProductDetailClient.tsx');
  const noticesConfig = source('src', 'lib', 'notices', 'config.ts');

  for (const removedCopy of [
    'id="details"',
    'id="standard"',
    '성분과 사용법',
    '아이에게 닿는 정보부터 확인해요.',
    '함께 확인하면 좋아요',
    '조금 더 주의해 주세요',
    '백조오브제가 살펴본 내용',
    '확인한 내용을 솔직하게 전해요.',
    '브랜드 이야기 더 보기',
    'AuditAccordion',
    'brandProducts',
    'productAuditPoints',
    'function InfoCard',
    'function ChipCard',
    'function ChecklistCard',
    'pointsRateLabel',
    'getProductPointsRateLabel',
    '적립금',
  ]) {
    expect(productPage, `${removedCopy}가 제품 상세 소스에 남아 있습니다.`).not.toContain(removedCopy);
  }

  expect(productPage).toContain('id="story"');
  expect(productPage).toContain('<ProductPurchaseInfo brandShipping={brand?.shipping} />');
  expect(productPage).toContain('<ProductTabsClient');

  expect(tabsClient).not.toContain("['성분·사용법', 'details']");
  expect(tabsClient).not.toContain("['살펴본 기준', 'standard']");
  expect(tabsClient).toContain("['상품 이야기', 'story']");
  expect(tabsClient).toContain("[`후기 ${reviews.length}`, 'reviews']");
  expect(tabsClient).toContain("[`문의 ${inquiries.length}`, 'qna']");
  expect(productDetailClient).not.toContain('pointsRateLabel');
  expect(productDetailClient).not.toContain('getProductPointsRateLabel');
  expect(productDetailClient).not.toContain('적립금');
  expect(noticesConfig).not.toContain('쿠폰');
  expect(noticesConfig).not.toContain('첫 구매 고객 무료 배송 혜택');
});
