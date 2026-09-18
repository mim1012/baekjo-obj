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

  test('선택값(통신판매업신고번호·사업장주소·전화·출고안내·반품정책)이 비어 있으면 해당 항목만 숨긴다', () => {
    const disclosure = read('src', 'components', 'shop', 'SellerDisclosure.tsx');
    // SellerRow는 값이 없으면(undefined 또는 공백) 아예 렌더링하지 않는다 — 판매자 필수값이
    // 4개(표시명·상호명·대표자·사업자등록번호)로 완화된 뒤 나머지 선택 필드는 미입력 시
    // 공개 화면에서 항목 자체가 사라져야 한다.
    expect(disclosure).toContain("function SellerRow({ label, value }: { label: string; value?: string }) {");
    expect(disclosure).toContain('if (!value || !value.trim()) return null;');
    // 통신판매업신고번호·사업장주소·출고예정·반품정책·고객센터 행은 값이 optional이므로
    // SellerRow가 그대로 undefined를 받을 수 있다(문자열 폴백으로 빈 문자열을 강제하지 않는다).
    expect(disclosure).not.toContain("seller.mailOrderRegistrationNumber || '");
    expect(disclosure).not.toContain("seller.dispatchEstimate || '");
    expect(disclosure).not.toContain("seller.returnPolicy || '");

    const productPurchaseInfo = read('src', 'components', 'shop', 'ProductPurchaseInfo.tsx');
    // 상품 상세의 "구매 정보"도 같은 원칙 — nonBlank로 걸러 빈 값이면 해당 InfoRow를 렌더하지 않는다.
    expect(productPurchaseInfo).toContain('const nonBlank = (value: string | undefined) =>');
    expect(productPurchaseInfo).toContain('{shippingLabel && <InfoRow');
    expect(productPurchaseInfo).toContain('{dispatchLabel && (');
    expect(productPurchaseInfo).toContain('{returnLabel && (');
  });
});
