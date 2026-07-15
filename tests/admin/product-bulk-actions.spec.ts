import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// 상품 목록 선택 바는 즉시 실행형 bulk action 전용이다.
// 저장되지 않는 '저장' 버튼을 끼워 넣으면 PR-00의 non-persistent affordance 금지에 걸린다.
test.describe('상품 목록 bulk action bar', () => {
  const pagePath = path.resolve(__dirname, '..', '..', 'src', 'app', 'admin', 'products', 'page.tsx');
  const saveBarPath = path.resolve(__dirname, '..', '..', 'src', 'components', 'admin-new', 'common', 'SaveBar.tsx');

  test('선택 바는 no-op 저장 버튼 없이 실제 bulk action만 노출한다', () => {
    const source = fs.readFileSync(pagePath, 'utf8');

    expect(source).not.toContain("import SaveBar from '@/components/admin-new/common/SaveBar'");
    expect(source).not.toContain('<SaveBar');
    expect(source).toContain('performBulkUpdate(selectedIds, { isVisible: false })');
    expect(source).toContain('performBulkUpdate(selectedIds, { isVisible: true })');
    expect(source).toContain('performBulkDelete(selectedIds)');
    expect(source).toContain('선택 해제');
    expect(source).not.toContain('onSave={() => {}}');
    expect(source).not.toContain('saveLabel="저장"');
  });

  test('SaveBar는 저장 워크플로우 전용으로 유지된다', () => {
    const source = fs.readFileSync(saveBarPath, 'utf8');

    expect(source).toContain('onSave: () => void');
    expect(source).toContain('onClick={onSave}');
  });
});
