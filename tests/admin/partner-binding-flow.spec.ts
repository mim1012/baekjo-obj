import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');
const src = (...segments: string[]) => fs.readFileSync(path.join(root, ...segments), 'utf8');

function expectNoMutableProductBrandImport(source: string): void {
  expect(source).not.toMatch(/from ['"][^'"]*data\/(?:products|brands)(?:\.[^'"]*)?['"]/);
  expect(source).not.toMatch(/@\/data\/(?:products|brands)(?:\.[^'"]*)?/);
}

test.describe('케어키트·제휴 문의의 실제 고객 화면 바인딩', () => {
  test('고객 화면에 없는 제휴처 명부 관리 화면은 제거하고 문의 처리 화면만 남긴다', () => {
    expect(fs.existsSync(path.join(root, 'src', 'app', 'admin', 'partners', 'page.tsx'))).toBe(false);
    expect(fs.existsSync(path.join(root, 'src', 'app', 'api', 'admin', 'partners', 'route.ts'))).toBe(false);

    const inquiryPage = src('src', 'app', 'admin', 'partner-inquiries', 'page.tsx');
    expect(inquiryPage).toContain('제휴 문의');
    expect(inquiryPage).toContain('상태');
    expect(inquiryPage).toContain('메모');
  });

  test('케어키트는 공개 카드에 보이는 항목만 등록·수정하고 즉시 저장한다', () => {
    const pageSource = src('src', 'app', 'admin', 'kits', 'page.tsx');
    const storageSource = src('src', 'lib', 'storage.ts');
    const routeSource = src('src', 'app', 'api', 'admin', 'kits', 'route.ts');
    const repoSource = src('src', 'lib', 'kits', 'repo.ts');

    expect(pageSource).toContain('고객 화면에 실제로 보이는 케어 키트 카드를 관리합니다.');
    expect(pageSource).toContain('affectedScreen="케어키트 소개 화면(/landing/care-kit)의 키트 카드"');
    expect(pageSource).toContain('onCreateRow={ready ? handleCreate : undefined}');
    expect(pageSource).toContain('onUpdateRow={ready ? handleUpdate : undefined}');
    expect(pageSource).toContain('onDeleteRow={ready ? handleDelete : undefined}');
    expect(pageSource).toContain('onMoveRow={ready ? handleMove : undefined}');
    expect(pageSource).not.toContain('연결 제휴처');
    expect(pageSource).not.toContain('현재 재고 수량');
    expectNoMutableProductBrandImport(pageSource);

    expect(storageSource).toContain("fetch('/api/admin/kits')");
    expect(storageSource).toContain("method: 'PUT'");
    expect(routeSource).toContain("import { getKitsConfig, saveKitsConfig } from '@/lib/kits/repo';");
    expect(routeSource).toContain('await requireAdmin();');
    expect(routeSource).toContain('await saveKitsConfig({ items: body.items });');
    expect(repoSource).toContain(".from('kits_config')");
    expect(repoSource).toContain('upsert({ id: CONFIG_ROW_ID, value, updated_at: new Date().toISOString() });');
  });

  test('등록·수정·삭제·순서는 마지막 저장본을 기준으로 한 번에 반영한다', () => {
    const pageSource = src('src', 'app', 'admin', 'kits', 'page.tsx');

    expect(pageSource).toContain('const persistedItemsRef = useRef<CareKit[]>([]);');
    expect(pageSource).toContain('const busyRef = useRef(false);');
    expect(pageSource).toContain('const nextItems = [...persistedItemsRef.current, draftToCareKit(draft)];');
    expect(pageSource).toContain('kit.id === id ? draftToCareKit(draft, kit) : kit');
    expect(pageSource).toContain('persistedItemsRef.current.filter((kit) => kit.id !== id)');
    expect(pageSource).toContain("const handleMove = async (id: string | number, direction: 'up' | 'down')");
    expect(pageSource).toContain('등록·수정·삭제·노출·순서가 모두 즉시 반영됩니다.');
  });

  test('공개 케어키트 화면은 실제 카드와 제휴 문의 양식을 제공한다', () => {
    const landingSource = src('src', 'app', 'landing', 'care-kit', 'page.tsx');
    const formSource = src('src', 'components', 'care-kit', 'PartnerInquiryForm.tsx');

    expect(landingSource).toContain("import PartnerInquiryForm from '@/components/care-kit/PartnerInquiryForm';");
    expect(landingSource).toContain('<PartnerInquiryForm />');
    expect(landingSource).not.toContain('mailto:');
    expectNoMutableProductBrandImport(landingSource);

    expect(formSource).toContain("import { addPartnerInquiry, type CreatePartnerInquiryInput } from '@/lib/storage';");
    expect(formSource).toContain('await addPartnerInquiry(form)');
    expect(formSource).not.toContain('fetch(');
    expect(formSource).toContain('aria-live');
  });
});
