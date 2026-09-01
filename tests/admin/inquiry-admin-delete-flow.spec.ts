import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');
const src = (...segments: string[]) => fs.readFileSync(path.join(root, ...segments), 'utf8');

test.describe('상품문의 관리자 삭제 흐름', () => {
  test('화면 → storage → 관리자 API → repo 실제 삭제가 한 줄로 연결된다', () => {
    const page = src('src', 'app', 'admin', 'inquiries', 'page.tsx');
    const storage = src('src', 'lib', 'storage.ts');
    const route = src('src', 'app', 'api', 'admin', 'inquiries', '[id]', 'route.ts');
    const repo = src('src', 'lib', 'inquiries', 'repo.ts');

    expect(page).toContain('await deleteAdminProductInquiry(String(id));');
    expect(page).toContain('onDeleteRow={handleDelete}');
    expect(storage).toContain('export async function deleteAdminProductInquiry(id: string): Promise<void>');
    expect(storage).toContain('fetch(`/api/admin/inquiries/${encodeURIComponent(id)}`');
    expect(route).toContain('const admin = await requireAdmin();');
    expect(route).toContain('deleteInquiryByAdmin(id)');
    expect(repo).toContain('export async function deleteInquiryByAdmin(id: string): Promise<boolean>');
    expect(repo).toContain(".from('product_inquiries')");
    expect(repo).toContain('.delete()');
  });
});
