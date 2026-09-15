// GET/POST/PUT /api/admin/product-tags — 상품 '고민' 태그 사전 관리자 CRUD.
// proxy.ts가 /api/admin/* 을 JWT role로 이미 가드하지만, requireAdmin()이 매 요청 DB에서
// 재조회해 실제로 admin이고 active인지 다시 확인한다(admin/category-settings와 동일 방어).
import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import {
  getAdminProductTagsConfig,
  isProductTagsConfig,
  saveProductTagsConfig,
} from '@/lib/productTags/repo';
import {
  createProductTagSlug,
  isProductTagSlug,
  type ProductTagDefinition,
} from '@/lib/productTags/config';
import { logServerError } from '@/lib/logServerError';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  try {
    return NextResponse.json(await getAdminProductTagsConfig(), { status: 200 });
  } catch (error) {
    logServerError('[GET /api/admin/product-tags] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  const label = typeof (body as { label?: unknown } | null)?.label === 'string'
    ? String((body as { label: string }).label).trim()
    : '';
  if (!label || label.length > 50) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  try {
    const current = await getAdminProductTagsConfig();
    if (!current.persistenceReady) {
      return NextResponse.json({ error: 'persistence-not-ready' }, { status: 503 });
    }

    const existing = current.items.find(
      (item) => item.label.trim().toLocaleLowerCase('ko-KR') === label.toLocaleLowerCase('ko-KR'),
    );
    if (existing) {
      return NextResponse.json({ tag: existing, created: false }, { status: 200 });
    }

    const tag: ProductTagDefinition = {
      slug: createProductTagSlug(label, current.items),
      label,
      isVisible: true,
      showInShopFilter: false,
    };
    await saveProductTagsConfig({
      items: [...current.items, tag],
      hiddenSlugs: current.hiddenSlugs.filter((slug) => slug !== tag.slug),
    });
    return NextResponse.json({ tag, created: true }, { status: 201 });
  } catch (error) {
    logServerError('[POST /api/admin/product-tags] 등록 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }
  // slug 형식은 상품 검증기(src/lib/products/validate.ts)와 동일한 규칙(isProductTagSlug)이다.
  // isProductTagsConfig도 결국 이 규칙으로 거부하지만, 여기서 먼저 걸러 어느 항목의 slug가
  // 문제인지 필드 단위로 알려준다(리뷰 B2 — 사전 저장은 되는데 상품 저장만 400 나던 계약 불일치).
  const items = (body as { items?: unknown } | null)?.items;
  if (Array.isArray(items)) {
    const invalidIndex = items.findIndex(
      (item) => !isProductTagSlug((item as { slug?: unknown } | null)?.slug),
    );
    if (invalidIndex !== -1) {
      return NextResponse.json(
        { error: 'invalid-slug', field: `items[${invalidIndex}].slug` },
        { status: 400 },
      );
    }
  }
  if (!isProductTagsConfig(body)) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }
  const slugs = body.items.map((item) => item.slug);
  if (new Set(slugs).size !== slugs.length) {
    return NextResponse.json({ error: 'duplicate-slug' }, { status: 409 });
  }
  try {
    await saveProductTagsConfig(body);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logServerError('[PUT /api/admin/product-tags] 저장 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
