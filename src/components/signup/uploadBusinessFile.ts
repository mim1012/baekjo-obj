'use client';

/**
 * 사업자 가입(입점/B2B/보험사) 공용 서류 업로드. POST /api/members/business/upload로
 * private 버킷(signup-docs)에 저장하고 {category, name, path}를 반환한다. 반환된 path는
 * 관리자 화면에서 /api/admin/members/file?path=... 로만 열람할 수 있다.
 */
export interface UploadedFile {
  category: string;
  name: string;
  path: string;
}

export async function uploadBusinessFile(file: File, category: string): Promise<UploadedFile> {
  const body = new FormData();
  body.append('file', file);
  body.append('category', category);
  const response = await fetch('/api/members/business/upload', { method: 'POST', body });
  if (!response.ok) throw new Error('upload-failed');
  return (await response.json()) as UploadedFile;
}
