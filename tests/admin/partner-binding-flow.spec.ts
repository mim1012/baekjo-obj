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

    const getStorage = sliceBetween(storageSource, 'export async function getPartnersConfig(', 'export async function savePartnersConfig(');
    const saveStorage = sliceBetween(storageSource, 'export async function savePartnersConfig(', '/** 공개 Q&A config.');

    expect(pageSource).toContain("import { getPartnersConfig, savePartnersConfig } from '@/lib/storage';");
    expect(pageSource).toContain('getPartnersConfig()');
    expect(pageSource).toContain('.catch(() => {');
    expect(pageSource).toContain('setLoadError(true);');
    // 등록·수정·삭제가 모두 즉시 저장으로 전환되며 header batch save(onSave)는 제거됐다
    // (2026-07-18 저장 유실 리포트). AdminResourcePage 는 이 브랜치에서 무변경(다른 PR 의존).
    expect(pageSource).not.toContain('onSave=');
    expect(pageSource).not.toContain('const handleSave');
    // 로드 완료 전에는 CRUD 콜백을 아예 안 넘겨 버튼을 숨긴다(opus 리뷰 MEDIUM-2, notices/concerns 미러).
    expect(pageSource).toContain('const ready = loaded && !loadError;');
    expect(pageSource).toContain('onDeleteRow={ready ? handleDelete : undefined}');
    expect(pageSource).toContain('actionLabel="제휴처 등록"');
    expect(pageSource).toContain('onCreateRow={ready ? handleCreate : undefined}');
    expect(pageSource).toContain('onUpdateRow={ready ? handleUpdate : undefined}');
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

  test('제휴처 등록·수정·삭제 모두 persisted 기준으로 즉시 저장한다(빈 배열 허용 — 마지막 항목 차단 없음)', () => {
    const pageSource = src('src', 'app', 'admin', 'partners', 'page.tsx');

    expect(pageSource).toContain('const [loaded, setLoaded] = useState(false);');
    expect(pageSource).toContain('const persistedItemsRef = useRef<Partner[]>(defaultPartnersConfig.items);');
    expect(pageSource).toContain('persistedItemsRef.current = config.items;');
    // 저장·삭제 공용 상호배제 — 동시 PUT 이 서로를 덮어쓰는 레이스 방지(codex 2차 리뷰 HIGH).
    expect(pageSource).toContain('const busyRef = useRef(false);');

    expect(pageSource).toContain('const handleCreate = async (draft: Record<string, string | number>) => {');
    expect(pageSource).toContain('const nextItems = [...persistedItemsRef.current, draftToPartner(draft)];');
    expect(pageSource).toContain('등록 저장에 실패했습니다.');

    expect(pageSource).toContain('const handleUpdate = async (id: string | number, draft: Record<string, string | number>) => {');
    expect(pageSource).toContain('partner.id === id ? draftToPartner(draft, partner) : partner,');
    expect(pageSource).toContain('수정 저장에 실패했습니다.');

    expect(pageSource).toContain('const handleDelete = async (id: string | number) => {');
    expect(pageSource).toContain('if (!loaded || loadError) return;');
    expect(pageSource).toContain('if (busyRef.current) return;');
    expect(pageSource).toContain('const nextItems = persistedItemsRef.current.filter((partner) => partner.id !== id);');
    expect(pageSource).toContain('const { ok } = await savePartnersConfig({ items: nextItems });');
    expect(pageSource).toContain('persistedItemsRef.current = nextItems;');
    expect(pageSource).toContain('setItems((prev) => prev.filter((partner) => partner.id !== id));');
    expect(pageSource).toContain('삭제 저장에 실패했습니다.');
    expect(pageSource).toContain('등록·수정·삭제가 모두 즉시 반영됩니다.');
  });

  test('케어키트 관리자 저장은 storage 콘센트와 admin kits API/repo readback 경로를 사용한다', () => {
    const pageSource = src('src', 'app', 'admin', 'kits', 'page.tsx');
    const storageSource = src('src', 'lib', 'storage.ts');
    const routeSource = src('src', 'app', 'api', 'admin', 'kits', 'route.ts');
    const repoSource = src('src', 'lib', 'kits', 'repo.ts');

    const getStorage = sliceBetween(storageSource, 'export async function getKitsConfig(', 'export async function saveKitsConfig(');
    const saveStorage = sliceBetween(storageSource, 'export async function saveKitsConfig(', '/** 관리자 제휴처 config.');

    expect(pageSource).toContain("import { getKitsConfig, saveKitsConfig } from '@/lib/storage';");
    expect(pageSource).toContain('getKitsConfig()');
    expect(pageSource).toContain('.catch(() => {');
    expect(pageSource).toContain('setLoadError(true);');
    expect(pageSource).not.toContain('onSave=');
    expect(pageSource).not.toContain('const handleSave');
    expect(pageSource).toContain('const ready = loaded && !loadError;');
    expect(pageSource).toContain('onDeleteRow={ready ? handleDelete : undefined}');
    expect(pageSource).toContain('actionLabel="키트 등록"');
    expect(pageSource).toContain('onCreateRow={ready ? handleCreate : undefined}');
    expect(pageSource).toContain('onUpdateRow={ready ? handleUpdate : undefined}');
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

  test('케어키트 등록·수정·삭제 모두 persisted 기준으로 즉시 저장한다(빈 배열 허용 — 마지막 항목 차단 없음)', () => {
    const pageSource = src('src', 'app', 'admin', 'kits', 'page.tsx');

    expect(pageSource).toContain('const [loaded, setLoaded] = useState(false);');
    expect(pageSource).toContain('const persistedItemsRef = useRef<CareKit[]>(defaultKitsConfig.items);');
    expect(pageSource).toContain('persistedItemsRef.current = config.items;');
    expect(pageSource).toContain('const busyRef = useRef(false);');

    expect(pageSource).toContain('const handleCreate = async (draft: Record<string, string | number>) => {');
    expect(pageSource).toContain('const nextItems = [...persistedItemsRef.current, draftToCareKit(draft)];');
    expect(pageSource).toContain('등록 저장에 실패했습니다.');

    expect(pageSource).toContain('const handleUpdate = async (id: string | number, draft: Record<string, string | number>) => {');
    expect(pageSource).toContain('persistedItemsRef.current.map((kit) => (kit.id === id ? draftToCareKit(draft, kit) : kit));');
    expect(pageSource).toContain('수정 저장에 실패했습니다.');

    expect(pageSource).toContain('const handleDelete = async (id: string | number) => {');
    expect(pageSource).toContain('if (!loaded || loadError) return;');
    expect(pageSource).toContain('if (busyRef.current) return;');
    expect(pageSource).toContain('const nextItems = persistedItemsRef.current.filter((kit) => kit.id !== id);');
    expect(pageSource).toContain('const { ok } = await saveKitsConfig({ items: nextItems });');
    expect(pageSource).toContain('persistedItemsRef.current = nextItems;');
    expect(pageSource).toContain('setItems((prev) => prev.filter((kit) => kit.id !== id));');
    expect(pageSource).toContain('삭제 저장에 실패했습니다.');
    expect(pageSource).toContain('등록·수정·삭제가 모두 즉시 반영됩니다.');
  });

  test('공개 케어키트 랜딩은 mailto 대신 콘센트 경유 제휴 문의 폼을 제공한다', () => {
    const landingSource = src('src', 'app', 'landing', 'care-kit', 'page.tsx');
    const formSource = src('src', 'components', 'care-kit', 'PartnerInquiryForm.tsx');

    // 랜딩(page.tsx)은 서버 컴포넌트로 유지하고 폼만 클라이언트 컴포넌트로 분리한다(§3).
    expect(landingSource).toContain(
      "import PartnerInquiryForm from '@/components/care-kit/PartnerInquiryForm';",
    );
    expect(landingSource).toContain('<PartnerInquiryForm />');
    expect(landingSource).not.toContain('mailto:');
    expect(landingSource).not.toContain('온라인 제휴 신청 저장 기능은 아직 준비 중입니다.');
    expect(landingSource).not.toContain("'use client'");
    expectNoMutableProductBrandImport(landingSource);

    // 폼은 fetch 직접 호출 없이 storage 콘센트(addPartnerInquiry)만 거친다(§4).
    expect(formSource).toContain("'use client'");
    expect(formSource).toMatch(/<form\b/);
    expect(formSource).toContain('onSubmit');
    expect(formSource).toContain('제휴 문의 제출하기');
    expect(formSource).toContain(
      "import { addPartnerInquiry, type CreatePartnerInquiryInput } from '@/lib/storage';",
    );
    expect(formSource).toContain('await addPartnerInquiry(form)');
    expect(formSource).not.toContain('fetch(');
    expect(formSource).not.toContain('alert(');
    expect(formSource).toContain('aria-live');
    expectNoMutableProductBrandImport(formSource);
  });
});
