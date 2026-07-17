import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');
const src = (...segments: string[]) => fs.readFileSync(path.join(root, ...segments), 'utf8');

function sliceBetween(source: string, startNeedle: string, endNeedle: string): string {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start + startNeedle.length);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

function expectNoMutableProductBrandImport(source: string): void {
  expect(source).not.toMatch(/from ['"][^'"]*data\/(?:products|brands)(?:\.[^'"]*)?['"]/);
  expect(source).not.toMatch(/(?:import\s*\(|require\s*\()\s*['"][^'"]*data\/(?:products|brands)(?:\.[^'"]*)?['"]/);
  expect(source).not.toMatch(/@\/data\/(?:products|brands)(?:\.[^'"]*)?/);
}

test.describe('콘텐츠 관리자 저장/읽기 전용 → 공개 콘텐츠 바인딩 경로', () => {
  test('QNA 관리자 저장은 storage 콘센트와 QNA API/repo readback 경로를 사용한다', () => {
    const qnaPage = src('src', 'components', 'admin-new', 'qna', 'QnaListPage.tsx');
    const storageSource = src('src', 'lib', 'storage.ts');
    const publicRoute = src('src', 'app', 'api', 'qna', 'route.ts');
    const adminRoute = src('src', 'app', 'api', 'admin', 'qna', 'route.ts');
    const repoSource = src('src', 'lib', 'qna', 'repo.ts');

    const handleSave = sliceBetween(qnaPage, 'const handleSave = async (updatedItem: QnA) => {', 'const filteredItems = useMemo(() => {');
    const getStorage = sliceBetween(storageSource, 'export async function getQnaConfig(', 'export async function saveQnaConfig(');
    const saveStorage = sliceBetween(storageSource, 'export async function saveQnaConfig(', 'const USER_KEY');

    expect(qnaPage).toContain("import { getQnaConfig, saveQnaConfig } from '@/lib/storage';");
    expect(qnaPage).toContain('const config = await getQnaConfig();');
    expect(handleSave).toContain('const config: QnaConfig = { items: updatedItems };');
    expect(handleSave).toContain('const result = await saveQnaConfig(config);');
    expect(handleSave).toContain('setItems(items);');

    expect(getStorage).toContain("fetch('/api/qna')");
    expect(getStorage).toContain('const { items } = (await response.json()) as QnaConfig;');
    expect(getStorage).toContain('return { items };');
    expect(saveStorage).toContain("fetch('/api/admin/qna', {");
    expect(saveStorage).toContain("method: 'PUT'");
    expect(saveStorage).toContain('body: JSON.stringify(config)');

    expect(publicRoute).toContain("import { getQnaConfig } from '@/lib/qna/repo';");
    expect(publicRoute).toContain('const saved = await getQnaConfig();');
    expect(publicRoute).toContain('return NextResponse.json({ items: config.items }, { status: 200 });');
    expect(adminRoute).toContain("import { saveQnaConfig } from '@/lib/qna/repo';");
    expect(adminRoute).toContain('Array.isArray((body as { items?: unknown }).items)');
    expect(adminRoute).toContain('await saveQnaConfig({ items: body.items });');
    expect(repoSource).toContain(".from('qna_config')");
    expect(repoSource).toContain(".select('value')");
    expect(repoSource).toContain('return data ? (data.value as QnaConfig) : null;');
    expect(repoSource).toContain('upsert({ id: CONFIG_ROW_ID, value, updated_at: new Date().toISOString() });');
  });

  // concerns 는 2026-07-17 DB 싱글턴 config 로 이관돼 이 목록에서 빠졌다 — concern-binding-flow.spec.ts 가 커버한다.
  // notices 도 같은 날 DB 싱글턴 config 로 이관 — notice-binding-flow.spec.ts 가 커버한다.
  test('쓰기 API가 없는 후기 관리자 화면은 readOnly 로 비영속 버튼을 숨긴다', () => {
    const resourcePage = src('src', 'components', 'admin', 'AdminResourcePage.tsx');
    const reviewsPage = src('src', 'app', 'admin', 'reviews', 'page.tsx');

    expect(resourcePage).toContain('readOnly?: boolean;');
    expect(resourcePage).toContain('readOnly = false,');
    expect(resourcePage).toContain('const canEditRows = !readOnly && !disableEdit && onUpdateRow != null;');
    expect(resourcePage).toContain('const canDeleteRows = !readOnly && (onDeleteRow != null || onSave == null);');
    expect(resourcePage).toContain('const hasRowActions = canEditRows || canDeleteRows || customActions != null;');
    expect(resourcePage).toContain('(onSave || canCreateRows)');
    expect(resourcePage).toContain('{canCreateRows && (');
    expect(resourcePage).toContain('{hasRowActions && <th className="px-5 py-3 text-right font-semibold">관리</th>}');
    expect(resourcePage).toContain('{canEditRows && editingRow && (');
    expect(resourcePage).toContain('try {');
    expect(resourcePage).toContain('} finally {');

    for (const page of [reviewsPage]) {
      expect(page).toContain('readOnly');
      expect(page).toContain('AdminResourcePage');
      expectNoMutableProductBrandImport(page);
      expect(page).not.toContain("from '@/lib/products/repo'");
      expect(page).not.toContain('listProducts');
      expect(page).not.toContain('onSave=');
      expect(page).not.toContain('onDeleteRow=');
    }
  });

  test('정적 콘텐츠 공개 페이지는 canonical 정적 소스를 유지하고 products/brands mutable data 를 직접 읽지 않는다', () => {
    const reviewsPage = src('src', 'app', 'reviews', 'page.tsx');

    expect(reviewsPage).toContain("import { reviews } from '@/data/reviews';");
    expect(reviewsPage).toContain('const reviewConcernTagsByProductId: Record<string, string[]> = {');

    for (const page of [reviewsPage]) {
      expectNoMutableProductBrandImport(page);
      expect(page).not.toContain('@/lib/products/repo');
      expect(page).not.toContain('@/lib/brands/repo');
      expect(page).not.toContain('listProducts');
      expect(page).not.toContain('listBrands');
      expect(page).not.toContain('@/lib/storage');
      expect(page).not.toContain('localStorage');
      expect(page).not.toContain('sessionStorage');
    }
  });
});
