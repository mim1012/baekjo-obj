import { NextResponse, type NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';
import { logServerError } from '@/lib/logServerError';
import { checkInsuranceUploadRateLimit, insuranceUploadRateLimitKey } from '@/lib/insurance/uploadRateLimit';

// 보험 증권 업로드. §10-3 은행 창구 패턴 — 비공개 버킷(insurance-docs)에 저장하고 publicUrl은
// 절대 응답하지 않는다(U16 관리자 signed URL 열람 전용). 보험 신청은 게스트도 가능하므로
// 이 업로드 엔드포인트도 인증 없이 열려 있다 — 대신 파일 형식·크기·rate limit으로 방어한다.
//
// 매직바이트 판별은 src/app/api/admin/upload/route.ts·members/business/upload/route.ts와 동일
// 하드닝(Content-Length 선차단 · file.type 불신 · upsert:false)에 PDF 판별을 더한 것이다.
const BUCKET = 'insurance-docs';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB — 랜딩(§insurance/page.tsx) 안내와 동일 상한
const MAX_REQUEST_SIZE = 11_000_000; // 멀티파트 오버헤드 감안

const ALLOWED_CONTENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] as const;
type AllowedContentType = (typeof ALLOWED_CONTENT_TYPES)[number];

const EXTENSION_BY_TYPE: Record<AllowedContentType, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

/** 클라이언트가 보낸 file.type을 믿지 않고 실제 매직 바이트로 판별한다. 넷 중 아니면 null. */
function detectContentType(buffer: Buffer): AllowedContentType | null {
  if (buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from([0x25, 0x50, 0x44, 0x46]))) {
    return 'application/pdf'; // %PDF
  }
  if (buffer.length >= 3 && buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
    return 'image/jpeg';
  }
  if (buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) {
    return 'image/png';
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

/**
 * POST /api/insurance/upload — 보험 증권 파일을 비공개 버킷에 업로드하고 경로만 반환한다
 * (게스트 허용 — 보험 신청 자체가 미인증 사용자의 행위). publicUrl을 응답하지 않으므로 이
 * path만으로는 파일을 열람할 수 없다(관리자 열람은 U16의 signed URL 전용 경로).
 */
export async function POST(request: NextRequest) {
  const rateLimitKey = insuranceUploadRateLimitKey(request);
  if (!checkInsuranceUploadRateLimit(rateLimitKey)) {
    return NextResponse.json({ error: 'rate-limited' }, { status: 429 });
  }

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
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    const detectedType = detectContentType(buffer);
    if (!detectedType) {
      return NextResponse.json({ error: 'invalid-file-type' }, { status: 400 });
    }

    // 서버가 새로 발급한 UUID 경로 — 클라이언트 파일명이 섞이지 않고, 랜덤이라 열거로 남의
    // 증권을 추측해 접근할 수 없다(§10-3, U16 signed URL과 짝을 이루는 방어).
    const fileName = `${crypto.randomUUID()}${EXTENSION_BY_TYPE[detectedType]}`;
    const path = `certs/${fileName}`;

    const { error } = await getSupabase()
      .storage.from(BUCKET)
      .upload(path, buffer, { contentType: detectedType, upsert: false });

    if (error) {
      logServerError('[POST /api/insurance/upload] 업로드 실패', error);
      return NextResponse.json({ error: 'server-error' }, { status: 500 });
    }

    return NextResponse.json({ path }, { status: 201 });
  } catch (error) {
    logServerError('[POST /api/insurance/upload] 업로드 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
