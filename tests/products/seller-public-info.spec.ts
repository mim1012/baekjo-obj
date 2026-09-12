import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');
const read = (...parts: string[]) => fs.readFileSync(path.join(root, ...parts), 'utf8');

test.describe('고객 상품의 실제 판매자 정보 공개', () => {
  test('검증 완료·법정정보 완성 판매자만 공개 조회한다', () => {
    const repo = read('src', 'lib', 'sellers', 'repo.ts');
    const api = read('src', 'app', 'api', 'sellers', 'route.ts');
    expect(repo).toContain(".eq('status', 'verified')");
    expect(repo).toContain('isSellerLegallyComplete');
    expect(api).toContain('listVerifiedSellers()');
  });

  test('상품 상세에서 관리자 입력 판매자 정보를 한 자리에서 열고 닫는다', () => {
    const detail = read('src', 'components', 'shop', 'ProductDetailClient.tsx');
    const disclosure = read('src', 'components', 'shop', 'SellerDisclosure.tsx');
    expect(detail).toContain('<SellerDisclosure seller={product.seller}');
    expect(disclosure).toContain('<details');
    expect(disclosure).toContain('<summary');
    expect(disclosure).toContain('정보 열기');
    expect(disclosure).toContain('정보 닫기');
    for (const copy of ['상호', '대표자', '사업자등록번호', '통신판매업 신고번호', '사업장 주소', '고객센터', '배송비', '출고 예정', '반품지', '교환·반품 안내']) {
      expect(disclosure).toContain(`label="${copy}"`);
    }
    expect(disclosure).not.toContain('/sellers/');
    expect(disclosure).not.toContain('전체 정보 페이지');
  });

  test('상품 카드는 별도 판매자 페이지 링크 없이 실제 판매자명만 표시한다', () => {
    const card = read('src', 'components', 'common', 'ProductCard.tsx');
    expect(card).toContain('실제 판매자 · {product.seller?.legalName');
    expect(card).not.toContain('href={`/sellers/${product.seller.id}`}');
  });
});
