import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { findMemberById } from '@/lib/members/repo';
import { saveCategorySettings, getCategorySettings } from '@/lib/categorySettings/repo';
import type { CategorySettings } from '@/lib/categorySettings/config';
import { listAllProductsForAdmin } from '@/lib/products/repo';
import { logServerError } from '@/lib/logServerError';

/**
 * 본문이 CategorySettings 모양인지 최소 검증한다. 값은 관리자만 저장하는 신뢰 입력이지만,
 * 통째로 jsonb 로 들어가므로 세 필드가 모두 배열로 존재하는지만 확인해
 * 깨진 페이로드가 저장돼 화면이 조용히 깨지는 것을 막는다(§4).
 */
function isCategorySettings(body: unknown): body is CategorySettings {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return (
    Array.isArray(b.productCategories) &&
    Array.isArray(b.lifestyleCategories) &&
    Array.isArray(b.brandFilters)
  );
}

/**
 * PUT /api/admin/category-settings — 관리자 카테고리 설정 저장.
 * proxy.ts가 /api/admin/* 을 이미 가드하지만 JWT의 role은 로그인 시점 스냅샷이라, DB에서
 * 강등/비활성화돼도 세션 만료 전까지 admin 권한이 남는다. 매 요청마다 DB에서 재조회해
 * 실제로 admin이고 active인지 다시 확인한다(admin/settings·admin/orders와 동일 방어).
 */
export async function PUT(request: NextRequest) {
  const session = await auth();
  // SUPER_ADMIN 도 접근 가능해야 하므로 수정합니다. admin 이상의 권한을 허용합니다.
  if (!session?.user || !session.user.role || !['SUPER_ADMIN', 'admin'].includes(session.user.role)) {
    return NextResponse.json(
      { error: session?.user ? 'forbidden' : 'unauthorized' },
      { status: session?.user ? 403 : 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }
  if (!isCategorySettings(body)) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  try {
    const requester = session.user.memberId ? await findMemberById(session.user.memberId) : null;
    if (!requester || !['SUPER_ADMIN', 'admin'].includes(requester.role) || requester.status === 'inactive') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    // [카테고리 삭제 시 상품 연결 방어 (User Request #10)]
    const oldSettings = await getCategorySettings();
    if (oldSettings) {
      const oldProductCats = new Set(oldSettings.productCategories);
      const oldLifestyleCats = new Set(oldSettings.lifestyleCategories);

      const newProductCats = new Set(body.productCategories);
      const newLifestyleCats = new Set(body.lifestyleCategories);

      const deletedProductCats = new Set([...oldProductCats].filter(id => !newProductCats.has(id)));
      const deletedLifestyleCats = new Set([...oldLifestyleCats].filter(id => !newLifestyleCats.has(id)));

      if (deletedProductCats.size > 0 || deletedLifestyleCats.size > 0) {
        // 삭제된 카테고리가 있다면, 전체 상품을 조회하여 연결 여부 확인
        const products = await listAllProductsForAdmin();
        const connectedProducts = products.filter(p => 
          (p.category && deletedProductCats.has(p.category)) || 
          (p.lifestyleCategory && deletedLifestyleCats.has(p.lifestyleCategory))
        );

        if (connectedProducts.length > 0) {
          return NextResponse.json(
            { error: 'category-in-use', message: `해당 카테고리에 연결된 상품이 ${connectedProducts.length}개 있습니다. 상품을 먼저 이동해주세요.` },
            { status: 409 }
          );
        }
      }
    }

    await saveCategorySettings(body);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logServerError('[PUT /api/admin/category-settings] 저장 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
