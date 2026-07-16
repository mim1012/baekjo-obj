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

test.describe('파트너/케어키트 관리자 저장 → 공개 랜딩 바인딩 경로', () => {
  test('제휴처 관리자 저장은 storage 콘센트와 admin partners API/repo readback 경로를 사용한다', () => {
    const pageSource = src('src', 'app', 'admin', 'partners', 'page.tsx');
    const storageSource = src('src', 'lib', 'storage.ts');
    const routeSource = src('src', 'app', 'api', 'admin', 'partners', 'route.ts');
    const repoSource = src('src', 'lib', 'partners', 'repo.ts');
    const resourcePage = src('src', 'components', 'admin', 'AdminResourcePage.tsx');

    const saveHandler = sliceBetween(pageSource, 'const handleSave = () =>', 'return (');
    const getStorage = sliceBetween(storageSource, 'export async function getPartnersConfig(', 'export async function savePartnersConfig(');
    const saveStorage = sliceBetween(storageSource, 'export async function savePartnersConfig(', '/** 공개 Q&A config.');

    expect(pageSource).toContain("import { getPartnersConfig, savePartnersConfig } from '@/lib/storage';");
    expect(pageSource).toContain('getPartnersConfig()');
    expect(pageSource).toContain('.catch(() => {');
    expect(pageSource).toContain('setLoadError(true);');
    expect(saveHandler).toContain('savePartnersConfig({ items })');
    expect(saveHandler).toContain('loadError ? Promise.resolve({ ok: false })');
    expect(pageSource).toContain('onDeleteRow={handleDelete}');
    expect(pageSource).toContain('onSave={handleSave}');
    expect(pageSource).toContain('actionLabel="제휴처 등록"');
    expect(pageSource).toContain('onCreateRow={handleCreate}');
    expect(pageSource).toContain('onUpdateRow={handleUpdate}');
    expect(pageSource).toContain("formFields={[");
    expect(pageSource).not.toContain('disableEdit');
    expect(resourcePage).toContain('onCreateRow?: (draft: ResourceRow) => void;');
    expect(resourcePage).toContain('onUpdateRow?: (id: string | number, draft: ResourceRow) => void;');
    expect(resourcePage).toContain('const canCreateRows = !readOnly && Boolean(actionLabel) && onCreateRow != null;');
    expect(resourcePage).toContain('const canEditRows = !readOnly && !disableEdit && onUpdateRow != null;');
    expect(resourcePage).toContain('onCreateRow(createDraft);');
    expect(resourcePage).toContain('onUpdateRow(editingRow.id, editingDraft);');
    expect(resourcePage).toContain('const canDeleteRows = !readOnly && (onDeleteRow != null || onSave == null);');
    expect(resourcePage).toContain('try {');
    expect(resourcePage).toContain('} finally {');
    expectNoMutableProductBrandImport(pageSource);
    expect(pageSource).toContain('draftToPartner(draft)');
    expect(pageSource).toContain('draftToPartner(draft, partner)');
    expect(pageSource).toContain('id: previous?.id ?? createPartnerId()');
    expect(pageSource).toContain("providedKits: draftList(draft, 'providedKits', previous?.providedKits)");
    expect(pageSource).toContain("memo: draftOptionalText(draft, 'memo', previous?.memo)");
    expect(pageSource).not.toContain('Date.now()');

    expect(getStorage).toContain("fetch('/api/admin/partners')");
    expect(getStorage).toContain("if (!response.ok) throw new Error('partners-config-load-failed');");
    expect(getStorage).toContain("if (!Array.isArray(items)) throw new Error('partners-config-invalid-response');");
    expect(getStorage).toContain('return { items };');
    expect(saveStorage).toContain("fetch('/api/admin/partners', {");
    expect(saveStorage).toContain("method: 'PUT'");
    expect(saveStorage).toContain('body: JSON.stringify(config)');

    expect(routeSource).toContain("import { getPartnersConfig, savePartnersConfig } from '@/lib/partners/repo';");
    expect(routeSource).toContain('await requireAdmin();');
    expect(routeSource).toContain('const saved = await getPartnersConfig();');
    expect(routeSource).toContain('Array.isArray((body as { items?: unknown }).items)');
    expect(routeSource).toContain('function isPartner(item: unknown): item is Partner');
    expect(routeSource).toContain("PARTNER_TYPES.includes(partner.type as Partner['type'])");
    expect(routeSource).toContain("PARTNER_STATUSES.includes(partner.status as Partner['status'])");
    expect(routeSource).toContain('(body as { items: unknown[] }).items.every(isPartner)');
    expect(routeSource).toContain('await savePartnersConfig({ items: body.items });');
    expect(routeSource).toContain('return NextResponse.json({ ok: true }, { status: 200 });');
    expect(routeSource).toContain("return NextResponse.json({ error: 'server-error' }, { status: 500 });");

    expect(repoSource).toContain(".from('partners_config')");
    expect(repoSource).toContain(".select('value')");
    expect(repoSource).toContain('return data ? (data.value as PartnersConfig) : null;');
    expect(repoSource).toContain('upsert({ id: CONFIG_ROW_ID, value, updated_at: new Date().toISOString() });');
  });

  test('케어키트 관리자 저장은 storage 콘센트와 admin kits API/repo readback 경로를 사용한다', () => {
    const pageSource = src('src', 'app', 'admin', 'kits', 'page.tsx');
    const storageSource = src('src', 'lib', 'storage.ts');
    const routeSource = src('src', 'app', 'api', 'admin', 'kits', 'route.ts');
    const repoSource = src('src', 'lib', 'kits', 'repo.ts');

    const saveHandler = sliceBetween(pageSource, 'const handleSave = () =>', 'return (');
    const getStorage = sliceBetween(storageSource, 'export async function getKitsConfig(', 'export async function saveKitsConfig(');
    const saveStorage = sliceBetween(storageSource, 'export async function saveKitsConfig(', '/** 관리자 제휴처 config.');

    expect(pageSource).toContain("import { getKitsConfig, saveKitsConfig } from '@/lib/storage';");
    expect(pageSource).toContain('getKitsConfig()');
    expect(pageSource).toContain('.catch(() => {');
    expect(pageSource).toContain('setLoadError(true);');
    expect(saveHandler).toContain('saveKitsConfig({ items })');
    expect(saveHandler).toContain('loadError ? Promise.resolve({ ok: false })');
    expect(pageSource).toContain('onDeleteRow={handleDelete}');
    expect(pageSource).toContain('onSave={handleSave}');
    expect(pageSource).toContain('actionLabel="키트 등록"');
    expect(pageSource).toContain('onCreateRow={handleCreate}');
    expect(pageSource).toContain('onUpdateRow={handleUpdate}');
    expect(pageSource).toContain("formFields={[");
    expect(pageSource).not.toContain('disableEdit');
    expectNoMutableProductBrandImport(pageSource);
    expect(pageSource).toContain('draftToCareKit(draft)');
    expect(pageSource).toContain('draftToCareKit(draft, kit)');
    expect(pageSource).toContain('id: previous?.id ?? createKitId()');
    expect(pageSource).toContain("items: draftList(draft, 'items', previous?.items)");
    expect(pageSource).toContain("partnerId: draftOptionalText(draft, 'partnerId', previous?.partnerId)");
    expect(pageSource).toContain("description: draftOptionalText(draft, 'description', previous?.description)");
    expect(pageSource).not.toContain('Date.now()');

    expect(getStorage).toContain("fetch('/api/admin/kits')");
    expect(getStorage).toContain("if (!response.ok) throw new Error('kits-config-load-failed');");
    expect(getStorage).toContain("if (!Array.isArray(items)) throw new Error('kits-config-invalid-response');");
    expect(getStorage).toContain('return { items };');
    expect(saveStorage).toContain("fetch('/api/admin/kits', {");
    expect(saveStorage).toContain("method: 'PUT'");
    expect(saveStorage).toContain('body: JSON.stringify(config)');

    expect(routeSource).toContain("import { getKitsConfig, saveKitsConfig } from '@/lib/kits/repo';");
    expect(routeSource).toContain('await requireAdmin();');
    expect(routeSource).toContain('const saved = await getKitsConfig();');
    expect(routeSource).toContain('Array.isArray((body as { items?: unknown }).items)');
    expect(routeSource).toContain('function isCareKit(item: unknown): item is CareKit');
    expect(routeSource).toContain("KIT_TYPES.includes(kit.type as CareKit['type'])");
    expect(routeSource).toContain('isStringArray(kit.items)');
    expect(routeSource).toContain('(body as { items: unknown[] }).items.every(isCareKit)');
    expect(routeSource).toContain('await saveKitsConfig({ items: body.items });');
    expect(routeSource).toContain('return NextResponse.json({ ok: true }, { status: 200 });');
    expect(routeSource).toContain("return NextResponse.json({ error: 'server-error' }, { status: 500 });");

    expect(repoSource).toContain(".from('kits_config')");
    expect(repoSource).toContain(".select('value')");
    expect(repoSource).toContain('return data ? (data.value as KitsConfig) : null;');
    expect(repoSource).toContain('upsert({ id: CONFIG_ROW_ID, value, updated_at: new Date().toISOString() });');
  });

  test('공개 케어키트 랜딩은 저장되지 않는 제휴 폼 대신 읽기 전용 문의 경로를 제공한다', () => {
    const landingSource = src('src', 'app', 'landing', 'care-kit', 'page.tsx');

    expect(landingSource).toContain("import { COMPANY } from '@/data/company';");
    expect(landingSource).toContain('온라인 제휴 신청 저장 기능은 아직 준비 중입니다.');
    expect(landingSource).toContain('mailto:${COMPANY.email}?subject=${encodeURIComponent');
    expect(landingSource).toContain('{COMPANY.email}로 제휴 문의하기');
    expect(landingSource).toContain('{COMPANY.supportHours}');
    expect(landingSource).not.toContain('제휴 문의 제출하기');
    expect(landingSource).not.toMatch(/<form\b/);
    expect(landingSource).not.toMatch(/type=["']submit["']/);
    expect(landingSource).not.toContain('onSubmit');
    expectNoMutableProductBrandImport(landingSource);
  });
});
