import { test, expect } from '@playwright/test';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { isCurrentSession } from '@/lib/members/sessionVersion';

// Disposable embedded PostgreSQL only. No Supabase credentials or network requests.
// The fixture supplies only columns touched by the production RPCs; RPC bodies are
// loaded unchanged from migrations, including their transactions and privileges.
test.describe.serial('review fixes — embedded PostgreSQL', () => {
  let db: PGlite;
  const memberId = '10000000-0000-4000-8000-000000000001';
  const payload = (quantity = 1) => ({
    customerName: 'Test', phone: '010', address: 'Test',
    items: [{ productId: 'p1', productName: 'One', quantity, price: 1000 }],
    totalPrice: quantity * 1000, deliveryFee: 3000, paymentMethod: '카드결제',
    expiresAt: '2027-01-01T00:00:00Z',
  });
  const reserve = (body: unknown) => db.query<{ result: Record<string, unknown> }>(
    'select reserve_order($1::uuid, $2::jsonb) as result', [memberId, JSON.stringify(body)],
  );
  const stock = async () => (await db.query<{ stock: number }>('select stock from products where id = $1', ['p1'])).rows[0].stock;

  test.beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      create role anon; create role authenticated; create role service_role;
      create table members (
        id uuid primary key default gen_random_uuid(), name text not null, email text,
        phone text default '', company_name text, role text default 'user',
        status text default 'active', password_hash text, created_at timestamptz default now()
      );
      create table products (id text primary key, stock integer not null);
    `);
    for (const file of ['0003_orders.sql', '0022_order_payment_carrier.sql', '0097_order_delivery_fee_breakdown.sql']) {
      await db.exec(readFileSync(`supabase/migrations/${file}`, 'utf8'));
    }
    await db.exec('alter table orders add column bank_transfer_account jsonb');
    for (const file of ['0021_decrement_stock_for_order.sql', '0151_atomic_order_reservation.sql', '0152_member_session_version.sql', '0153_admin_member_pagination.sql']) {
      await db.exec(readFileSync(`supabase/migrations/${file}`, 'utf8'));
    }
  });
  test.beforeEach(async () => {
    await db.exec('truncate orders, members, products cascade');
    await db.query('insert into members (id, name, email, password_hash) values ($1, $2, $3, $4)', [memberId, 'Member', 'member@example.test', 'old-hash']);
    await db.exec("insert into products values ('p1', 5), ('p2', 0)");
  });
  test.afterAll(async () => { await db?.close(); });

  test('card and bank orders commit with their stock and policy snapshots', async () => {
    const first = (await reserve(payload(2))).rows[0].result;
    expect(first.payment_status).toBe('결제대기');
    expect(first.member_id).toBe(memberId);
    expect(await stock()).toBe(3);
    const account = { bankName: 'Test', accountNumber: '123', accountHolder: 'Test' };
    const second = (await reserve({ ...payload(), paymentMethod: '무통장입금', expiresAt: undefined, bankTransferAccount: account })).rows[0].result;
    expect(second.payment_status).toBe('입금대기');
    expect(second.expires_at).toBeNull();
    expect(second.bank_transfer_account).toEqual(account);
    expect(await stock()).toBe(2);
  });

  test('a later unavailable product rolls back all stock changes and the order', async () => {
    await expect(reserve({ ...payload(), items: [...payload().items, { productId: 'p2', quantity: 1 }] })).rejects.toThrow('INSUFFICIENT_STOCK');
    expect(await stock()).toBe(5);
    expect((await db.query('select * from orders')).rows).toHaveLength(0);
  });

  test('an insert failure after stock deduction rolls back the deduction', async () => {
    await expect(reserve({ ...payload(), customerName: null })).rejects.toThrow();
    expect(await stock()).toBe(5);
    expect((await db.query('select * from orders')).rows).toHaveLength(0);
  });

  test('competing reservations cannot sell more than the available stock', async () => {
    const results = await Promise.allSettled([reserve(payload(4)), reserve(payload(4))]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await stock()).toBe(1);
    expect((await db.query('select * from orders')).rows).toHaveLength(1);
  });

  test('password writes revoke old tokens while ordinary profile writes do not', async () => {
    await db.query('update members set name = $1 where id = $2', ['Changed', memberId]);
    const read = async () => (await db.query<{ sessionVersion: number; status: string }>('select session_version as "sessionVersion", status from members where id = $1', [memberId])).rows[0];
    expect(isCurrentSession(0, await read())).toBe(true);
    await db.query('update members set password_hash = $1 where id = $2', ['new-hash', memberId]);
    expect(isCurrentSession(0, await read())).toBe(false);
    expect(isCurrentSession(1, await read())).toBe(true);
    expect(isCurrentSession(undefined, await read())).toBe(false);
    await db.query('update members set password_hash = $1 where id = $2', ['reset-hash', memberId]);
    expect(isCurrentSession(1, await read())).toBe(false);
    expect(isCurrentSession(2, await read())).toBe(true);
  });

  test('search finds older members beyond 500 and summary counts the entire table', async () => {
    await db.exec(`insert into members (name, email) select 'New ' || i, i || '@example.test' from generate_series(1, 500) i`);
    await db.query("insert into members (name, role, status, created_at) values ($1, 'partner', 'pending', now() - interval '30 days')", ['Old%,(member)']);
    const page = async (pageNumber: number, search: string) => (await db.query<{ result: { users: { name: string }[]; total: number; page: number; summary: Record<string, number> } }>(
      'select list_admin_member_page($1, 20, $2, $3, $4) as result', [pageNumber, search, '', ''],
    )).rows[0].result;
    const found = await page(1, 'Old%,(member)');
    expect(found.total).toBe(1);
    expect(found.users[0].name).toBe('Old%,(member)');
    expect(found.summary).toEqual({ total: 502, recent: 501, pending: 1, partners: 1 });
    const last = await page(999, '');
    expect(last.page).toBe(26);
    expect(last.users).toHaveLength(2);
    expect(last.users.map((m) => m.name)).toContain('Old%,(member)');
    const empty = await page(999, 'does-not-exist');
    expect(empty.page).toBe(1);
    expect(empty.users).toEqual([]);
  });

  test('anonymous and authenticated database roles cannot execute the new RPCs', async () => {
    const { rows } = await db.query<{ allowed: boolean }>(`select has_function_privilege(role_name, fn, 'execute') as allowed
      from (values ('anon'), ('authenticated')) roles(role_name)
      cross join (values ('reserve_order(uuid,jsonb)'), ('list_admin_member_page(integer,integer,text,text,text)')) functions(fn)`);
    expect(rows.every((r) => !r.allowed)).toBe(true);
  });
});
