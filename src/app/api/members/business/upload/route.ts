import { NextResponse, type NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';
import { logServerError } from '@/lib/logServerError';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
// 멀티파트 오버헤드(바운더리·헤더 등) 감안한 요청 자체의 상한 — 실제 파일 상한(10MB)보다 여유를 둔다.
const MAX_REQUEST_SIZE = 11_000_000;
const ALLOWED_CONTENT_TYPES = ['application/pdf', 'image/png', 'image/jpeg'] as const;
type AllowedContentType = (typeof ALLOWED_CONTENT_TYPES)[number];

const ATTACHMENT_CATEGORIES = [
  '사업자등록증',
  '브랜드소개서',
  '로고',
  '제품이미지',
  '상세페이지',
  '시험성적서',
  '인증서',
  '기타',
] as const;

function isAllowedCategory(value: string): boolean {
  return (ATTACHMENT_CATEGORIES as readonly string[]).includes(value);
}

/** 파일명에서 영숫자·점·하이픈·언더스코어만 남기고 나머지는 '_'로 치환한 뒤 80자로 자른다. */
function sanitizeFilename(name: string): string {
  const sanitized = name
    .replace(/[^a-zA-Z0-9.\-_]/g, '_')
    // '..'가 남지 않도록 점이 연속되면 하나로 접는다.
    .replace(/\.{2,}/g, '.');
  return sanitized.slice(0, 80);
}

/**
 * 클라이언트가 보낸 file.type을 신뢰하지 않고 실제 매직 바이트로 파일 형식을 판별한다.
 * 셋 중 어느 것과도 일치하지 않으면 null.
 */
function detectContentType(buffer: Buffer): AllowedContentType | null {
  if (buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from([0x25, 0x50, 0x44, 0x46]))) {
    return 'application/pdf'; // %PDF
  }
  if (
    buffer.length >= 4 &&
    buffer.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))
  ) {
    return 'image/png';
  }
  if (buffer.length >= 3 && buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
    return 'image/jpeg';
  }
  return null;
}

/**
 * POST /api/members/business/upload — 입점업체(파트너)/B2B/보험설계사 가입 시 첨부서류 업로드.
 * 승인 전 공개 신청 단계라 인증 없이 열려 있다(가입 자체가 미인증 사용자의 행위). 대신 파일
 * 크기·형식·category 값을 서버에서 검증하고, private 버킷(signup-docs)에만 저장한다.
 */
export async function POST(request: NextRequest) {
  // 바디를 파싱하기 전에 Content-Length로 먼저 걸러 대용량 요청이 메모리를 잡아먹지 않게 한다.
  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_SIZE) {
    return NextResponse.json({ error: 'file-too-large' }, { status: 413 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  const file = formData.get('file');
  const category = formData.get('category');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }
  if (typeof category !== 'string' || !isAllowedCategory(category)) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    // 클라이언트가 보낸 file.type은 조작 가능하므로 신뢰하지 않고 매직 바이트로 재판별한다.
    const detectedType = detectContentType(buffer);
    if (!detectedType) {
      return NextResponse.json({ error: 'invalid-file-type' }, { status: 400 });
    }

    const path = `partner/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;

    const { error } = await getSupabase()
      .storage.from('signup-docs')
      .upload(path, buffer, { contentType: detectedType, upsert: false });

    if (error) {
      logServerError('[POST /api/members/business/upload] 업로드 실패', error);
      return NextResponse.json({ error: 'server-error' }, { status: 500 });
    }

    return NextResponse.json({ path, name: file.name, category }, { status: 201 });
  } catch (error) {
    logServerError('[POST /api/members/business/upload] 업로드 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
