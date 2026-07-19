import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');
const uploadRoutePath = path.join(root, 'src/app/api/admin/upload/route.ts');
const storagePath = path.join(root, 'src/lib/storage.ts');
const uploaderPath = path.join(root, 'src/components/admin-new/common/ImageUploader.tsx');

function readSource(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

test.describe('관리자 업로드 정책 — 이미지 첨부·삭제 미검증 방지', () => {
  const routeSource = readSource(uploadRoutePath);
  const storageSource = readSource(storagePath);
  const uploaderSource = readSource(uploaderPath);

  test('업로드 라우트는 관리자 권한·크기·매직바이트·domain/usage allowlist를 검증한다', () => {
    expect(routeSource).toContain("import { requireAdmin } from '@/lib/admin/requireAdmin'");
    expect(routeSource).toContain('const admin = await requireAdmin();');
    expect(routeSource).toContain('MAX_FILE_SIZE');
    expect(routeSource).toContain('MAX_REQUEST_SIZE');
    expect(routeSource).toContain('detectContentType(buffer)');
    expect(routeSource).toContain("product: ['main', 'gallery', 'detail']");
    expect(routeSource).toContain("brand: ['logo', 'cover']");
    expect(routeSource).toContain("banner: ['hero']");
    expect(routeSource).toContain('upsert: false');
  });

  test('삭제 라우트는 temp 소유 파일만 물리 삭제하고 정식 파일은 보존한다', () => {
    expect(routeSource).toContain("const ownTempPrefix = `temp/${admin.requester.id}/`;");
    expect(routeSource).toContain("!path.startsWith(ownTempPrefix)");
    expect(routeSource).toContain("reason: 'permanent-file-preserved'");
    expect(routeSource).toContain('.storage.from(BUCKET).remove([path])');
    expect(routeSource).toContain("reason: 'temporary-file-deleted'");
  });

  test('storage 콘센트는 multipart 업로드와 DELETE 삭제 응답을 그대로 전달한다', () => {
    expect(storageSource).toContain("formData.append('file', input.file)");
    expect(storageSource).toContain("fetch('/api/admin/upload', { method: 'POST', body: formData })");
    expect(storageSource).toContain('export async function deleteTemporaryAdminImage');
    expect(storageSource).toContain("fetch(`/api/admin/upload?${params.toString()}`, { method: 'DELETE' })");
    expect(storageSource).toContain('return data as { deleted: boolean; reason: string };');
  });

  test('ImageUploader 제거 버튼은 업로드된 currentPath가 있을 때만 temp 삭제 콘센트를 호출한다', () => {
    expect(uploaderSource).toContain('import { uploadAdminImage, deleteTemporaryAdminImage }');
    expect(uploaderSource).toContain('setCurrentPath(result.path);');
    expect(uploaderSource).toContain('if (currentPath) {');
    expect(uploaderSource).toContain('await deleteTemporaryAdminImage(currentPath);');
    expect(uploaderSource).toContain("onChange('', undefined);");
  });
});
