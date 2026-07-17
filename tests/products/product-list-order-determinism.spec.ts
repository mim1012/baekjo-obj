import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');
const src = (...parts: string[]) => fs.readFileSync(path.join(root, ...parts), 'utf8');

/**
 * 회귀 방어 — /shop 상품 순서 비결정성.
 *
 * 시드(0004b_seed_products_brands.sql)가 상품을 단일 INSERT 로 넣고 created_at 을 명시하지
 * 않아 default now()(=트랜잭션 시각)가 전 행에 동일하게 박힌다. 그래서 created_at 단독
 * 정렬은 전체가 동점이고, 순서는 물리적 행 순서가 정한다. 재고 차감(decrement_stock_for_order)·
 * 브랜드 이관 UPDATE 가 그 위치를 바꾸면 /shop 목록과 에디터 추천 4개
 * (ShopContent.tsx 의 filter(isRecommended||isBest).slice(0,4))가 조용히 재배치된다.
 *
 * 실제 사고: 2026-07-17 시각 회귀 게이트가 /shop 에서 4% 차이로 실패 — 상품이 사라진 게
 * 아니라 순서가 뒤바뀐 것이었다. tiebreaker 가 빠지면 같은 일이 반복된다.
 */
test.describe('상품 목록 순서 결정성', () => {
  test('listProducts 는 created_at 동점을 id 로 해소해 순서를 고정한다', () => {
    const repo = src('src', 'lib', 'products', 'repo.ts');

    // 1차 정렬(기존 의도: 최신순)은 유지한다.
    expect(repo).toContain(".order('created_at', { ascending: false })");

    // 2차 정렬(tiebreaker)이 반드시 있어야 한다 — 이게 빠지면 순서가 다시 비결정적이 된다.
    expect(repo).toContain(".order('id', { ascending: true })");

    // tiebreaker 는 created_at 정렬 '뒤'에 와야 의미가 있다(앞에 오면 id 가 1차 키가 된다).
    const createdAtAt = repo.indexOf(".order('created_at', { ascending: false })");
    const idAt = repo.indexOf(".order('id', { ascending: true })");
    expect(createdAtAt).toBeGreaterThan(-1);
    expect(idAt).toBeGreaterThan(createdAtAt);
  });

  test('시드가 created_at 을 명시하지 않는다는 전제를 기록한다', () => {
    const seed = src('supabase', 'migrations', '0004b_seed_products_brands.sql');

    // 이 전제가 깨지면(=시드가 created_at 을 행마다 다르게 넣게 되면) 위 tiebreaker 의
    // 필요성 근거가 달라진다. 그때는 이 테스트를 지우지 말고 근거를 다시 쓸 것.
    const insertLine = seed.split('\n').find(l => l.includes('insert into public.products'));
    expect(insertLine).toBeTruthy();
    expect(insertLine).not.toContain('created_at');
  });
});
