import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { getSupabase } from '@/lib/supabase/server';
import { logServerError } from '@/lib/logServerError';

// 관리자 카탈로그 이미지 업로드. 콘센트(§4) = storage.ts 의 uploadAdminImage / deleteTemporaryAdminImage.
//
// 경로 규칙 — domain·usage·식별자는 전부 경로 세그먼트가 되므로 allowlist 통과분만 쓴다.
//   정식: products/<entityId>/<usage>/<uuid>.<ext> | brands/<entityId>/<usage>/<uuid>.<ext> | banners/hero/<uuid>.<ext>
//   임시: temp/<adminId>/<draftId>/<usage>/<uuid>.<ext>  — 엔티티 생성 전 신규 작성 화면용
//
// 가입서류 업로드(/api/members/business/upload)와 같은 하드닝을 적용한다:
// Content-Length 선차단 · 매직바이트로 형식 재판별(file.type 불신) · upsert:false.
const BUCKET = 'catalog-assets';
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB
const MAX_REQUEST_SIZE = 9_000_000; // 멀티파트 오버헤드 감안

const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
type AllowedContentType = (typeof ALLOWED_CONTENT_TYPES)[number];

const EXTENSION_BY_TYPE: Record<AllowedContentType, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

/** domain 별 허용 usage. 경로 세그먼트로 들어가므로 allowlist 밖 값은 전부 거부한다. */
const ALLOWED_USAGE: Record<string, readonly string[]> = {
  product: ['main', 'gallery', 'detail'],
  brand: ['logo', 'cover'],
  banner: ['hero'],
};

const PATH_PREFIX_BY_DOMAIN: Record<string, string> = {
  product: 'products',
  brand: 'brands',
};

/** 경로 세그먼트로 쓸 수 있는 식별자인가 — 구분자·상위경로(..)가 끼면 거부. */
function isSafeSegment(value: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(value);
}

/** 클라이언트가 보낸 file.type을 믿지 않고 실제 매직 바이트로 판별한다. 셋 중 아니면 null. */
function detectContentType(buffer: Buffer): AllowedContentType | null {
  if (buffer.length >= 3 && buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
    return 'image/jpeg';
  }
  if (buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) {
    return 'image/png';
  }
  // WEBP: 'RIFF' .... 'WEBP'
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
 * POST /api/admin/upload — 상품·브랜드·배너 이미지를 catalog-assets(공개 버킷)에 올린다.
 * 관리자만. 파일명은 서버가 UUID로 새로 만들어 클라이언트 파일명이 경로에 섞이지 않게 한다.
 */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

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
  const domain = formData.get('domain');
  const usage = formData.get('usage');
  const entityIdRaw = formData.get('entityId');
  const draftIdRaw = formData.get('draftId');

  if (!(file instanceof File) || file.size === 0 || file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }
  if (typeof domain !== 'string' || typeof usage !== 'string') {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  const allowedUsage = ALLOWED_USAGE[domain];
  if (!allowedUsage || !allowedUsage.includes(usage)) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  const entityId = typeof entityIdRaw === 'string' && entityIdRaw ? entityIdRaw : null;
  const draftId = typeof draftIdRaw === 'string' && draftIdRaw ? draftIdRaw : null;

  if (!entityId && !draftId) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }
  if (entityId && !isSafeSegment(entityId)) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }
  if (draftId && !isSafeSegment(draftId)) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    const detectedType = detectContentType(buffer);
    if (!detectedType) {
      return NextResponse.json({ error: 'invalid-file-type' }, { status: 400 });
    }

    const fileName = `${crypto.randomUUID()}${EXTENSION_BY_TYPE[detectedType]}`;

    let path: string;
    if (entityId) {
      path =
        domain === 'banner'
          ? `banners/${usage}/${fileName}`
          : `${PATH_PREFIX_BY_DOMAIN[domain]}/${entityId}/${usage}/${fileName}`;
    } else {
      // draft 업로드는 관리자 본인 temp 폴더에만 — DELETE가 이 접두사로 소유권을 판단한다.
      const adminId = admin.requester.id;
      if (!isSafeSegment(adminId)) {
        return NextResponse.json({ error: 'server-error' }, { status: 500 });
      }
      path = `temp/${adminId}/${draftId}/${usage}/${fileName}`;
    }

    const supabase = getSupabase();
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: detectedType, upsert: false });

    if (error) {
      logServerError('[POST /api/admin/upload] 업로드 실패', error);
      return NextResponse.json({ error: 'server-error' }, { status: 500 });
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

    return NextResponse.json(
      { success: true, path, publicUrl: data.publicUrl, bucket: BUCKET },
      { status: 201 },
    );
  } catch (error) {
    logServerError('[POST /api/admin/upload] 업로드 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/upload?path=... — 임시 업로드본 폐기(작성 취소 시).
 * 자기 temp/<adminId>/ 아래 객체만 실제로 지운다. 정식 경로 파일은 다른 엔티티가 참조 중일 수
 * 있으므로 물리 삭제하지 않고 참조만 해제됐다고 응답한다(deleted:false).
 */
export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const path = request.nextUrl.searchParams.get('path');
  if (!path) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  const ownTempPrefix = `temp/${admin.requester.id}/`;
  if (path.includes('..') || !path.startsWith(ownTempPrefix)) {
    return NextResponse.json({ success: true, deleted: false, reason: 'permanent-file-preserved' });
  }

  try {
    const { error } = await getSupabase().storage.from(BUCKET).remove([path]);
    if (error) {
      logServerError('[DELETE /api/admin/upload] 삭제 실패', error);
      return NextResponse.json({ error: 'server-error' }, { status: 500 });
    }
    return NextResponse.json({ success: true, deleted: true, reason: 'temporary-file-deleted' });
  } catch (error) {
    logServerError('[DELETE /api/admin/upload] 삭제 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
