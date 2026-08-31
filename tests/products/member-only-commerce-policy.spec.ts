import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');

function read(...segments: string[]): string {
  return fs.readFileSync(path.join(root, ...segments), 'utf8');
}

test.describe('회원 전용 커머스 정책', () => {
  test('미구현 적립금·회원 전용가 설정은 상품 등록 경로에 노출되지 않는다', () => {
    const form = read('src', 'components', 'admin-new', 'products', 'ProductForm.tsx');
    const payload = read('src', 'lib', 'products', 'formPayload.ts');
    const types = read('src', 'types', 'index.ts');
    const migration = read('supabase', 'migrations', '0147_remove_unimplemented_product_flags.sql');

    for (const removedField of ['isMembersOnlyPrice', 'pointsEnabled', 'pointsRate', '회원 전용가', '적립금 지급']) {
      expect(form, removedField).not.toContain(removedField);
      expect(payload, removedField).not.toContain(removedField);
      expect(types, removedField).not.toContain(removedField);
    }
    expect(migration).toContain("detail - 'isMembersOnlyPrice' - 'pointsEnabled' - 'pointsRate'");
  });

  test('비회원 카트 진입과 카트 추가는 세션 확인 뒤에만 가능하다', () => {
    const cart = read('src', 'app', 'cart', 'page.tsx');
    const card = read('src', 'components', 'common', 'ProductCard.tsx');
    const detail = read('src', 'components', 'shop', 'ProductDetailClient.tsx');
    const wishlist = read('src', 'app', 'mypage', 'components', 'WishlistSection.tsx');

    expect(cart).toContain('getSessionUser');
    expect(cart).toContain('clearCart');
    expect(card).toContain('getSessionUser');
    expect(detail).toContain('getSessionUser');
    expect(wishlist).toContain('getSessionUser');
  });

});
