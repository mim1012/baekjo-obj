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

/**
 * 전수조사 A-1·A-2·A-3 (2026-07-18): SiteSettingsProvider·CategorySettingsProvider 는
 * 첫 페인트를 default 값으로 시드하고 마운트 후 GET 으로 하이드레이트하는 공통 패턴을 쓴다.
 * 관리자 저장 화면이 GET 이 resolve 되기 전에 편집을 시작(dirty/hasChanges 락)하면, 그 뒤로
 * 도착하는 실제 값이 draft 에 반영되지 못한 채 저장 버튼을 누르면 화면에 안 보인 섹션들이
 * default 값 그대로 실 DB 위에 PUT 된다. 이 스펙은 그 레이스를 막는 loaded 게이트를 고정한다.
 */
test.describe('SiteSettingsProvider(admin/settings) 로드 게이트 — 전수조사 A-1', () => {
  test('provider 는 GET resolve 여부를 loaded/loadError 로 노출한다', () => {
    const providerSource = src('src', 'components', 'providers', 'SiteSettingsProvider.tsx');
    const hydrationEffect = sliceBetween(providerSource, 'useEffect(() => {', '}, []);');

    expect(providerSource).toContain('loaded: boolean;');
    expect(providerSource).toContain('loadError: boolean;');
    expect(providerSource).toContain('const [loaded, setLoaded] = useState(false);');
    expect(providerSource).toContain('const [loadError, setLoadError] = useState(false);');
    expect(hydrationEffect).toContain("fetch('/api/settings')");
    expect(hydrationEffect).toContain('setSettings(data.settings);');
    expect(hydrationEffect).toContain('setLoaded(true);');
    expect(hydrationEffect).toContain('setLoadError(true);');
    expect(providerSource).toContain(
      '<SiteSettingsContext.Provider value={{ settings, updateSettings, loaded, loadError }}>',
    );
  });

  test('관리자 사이트 설정 화면은 CMS draft 로드 전 편집·저장·게시를 막는다', () => {
    const pageSource = src('src', 'app', 'admin', 'settings', 'page.tsx');

    expect(pageSource).toContain("fetch('/api/admin/settings', { cache: 'no-store' })");
    expect(pageSource).toContain('const [loaded, setLoaded] = useState(false);');
    expect(pageSource).toContain('const [draftRevision, setDraftRevision] = useState<number | null>(null);');

    const saveFunction = sliceBetween(pageSource, 'const saveDraft = async ()', 'const handleSave = ');
    expect(saveFunction).toContain('if (!loaded || draftRevision === null) return null;');
    expect(saveFunction).toContain("method: 'PATCH'");
    expect(pageSource).toContain("method: 'POST'");

    const updateDraftFunction = sliceBetween(pageSource, 'const updateDraft = (section:', 'const updateArrayField = ');
    expect(updateDraftFunction).toContain('if (!loaded) return;');

    const updateArrayFieldFunction = sliceBetween(pageSource, 'const updateArrayField = (section:', 'const renderInput = ');
    expect(updateArrayFieldFunction).toContain('if (!loaded) return;');

    // 헤더와 미리보기 모달의 임시저장·게시 버튼이 모두 loaded 상태를 소비한다.
    expect((pageSource.match(/disabled=\{!loaded \|\|/g) ?? []).length).toBe(4);
  });

  test('loadError 는 헤더 설명 문구로 소비되어 차단 사유를 알린다(opus 리뷰 MEDIUM)', () => {
    const pageSource = src('src', 'app', 'admin', 'settings', 'page.tsx');

    expect(pageSource).toContain(
      "description={loadError ? '편집본을 불러오지 못했습니다. 저장과 게시를 차단했습니다 — 새로고침 후 다시 시도해 주세요.' : '홈 화면을 편집해 임시저장하고, PC·모바일 미리보기에서 확인한 뒤 게시합니다.'}",
    );
  });
});

/**
 * CategorySettingsProvider 의 loaded 노출 자체는 tests/admin/category-binding-flow.spec.ts 가
 * 고정한다(§'provider 는 GET resolve 여부를 loaded/loadError 로 노출한다'). 여기서는 중복하지 않는다.
 */

test.describe('진단 설문 저장 방어(전수조사 A-3)', () => {
  test('handleSave 는 loading 가드를 갖는다(렌더 게이트로 이미 도달 불가하지만 일관성 방어)', () => {
    const pageSource = src('src', 'app', 'admin', 'survey', 'page.tsx');
    const saveFunction = sliceBetween(pageSource, 'const handleSave = () => {', 'const [currentQuestionsPage');

    expect(pageSource).toContain('if (loading) {');
    expect(saveFunction).toContain('if (loading) return;');
    expect(saveFunction).toContain('saveSurveyConfig({ questions, rules, resultContent })');
  });
});
