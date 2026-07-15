import { notFound } from 'next/navigation';
import BrandDetailEditor from '@/components/admin-new/brands/BrandDetailEditor';
import { getBrandById } from '@/lib/brands/repo';
import { listAllProductsForAdmin } from '@/lib/products/repo';
import { concerns } from '@/data/concerns';

// 관리자 화면은 항상 최신 DB를 봐야 한다(홈/상세·products/[id]와 동일 정책).
export const dynamic = 'force-dynamic';

// ⚠️ S1 교훈: 서버 컴포넌트는 콘센트(getAdminBrands 상대경로 fetch)로 자기 /api 를 다시 왕복하지
// 않는다(프로덕션 404 원인). repo 를 직접 호출한다. 인가는 admin/layout.tsx 의 auth 가드로
// 이미 확보돼 있으므로(role === 'admin' 아니면 redirect) 이 페이지에서 추가 인가는 불필요.
export default async function BrandDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // 비노출 브랜드도 편집해야 하므로 includeHidden: true.
  const brand = await getBrandById(id, { includeHidden: true });
  if (!brand) {
    notFound();
  }

  // 대표상품 멀티셀렉트는 이 브랜드 상품으로 한정. 비노출 상품도 선택지에 남아야 하니
  // (이미 대표로 지정된 상품이 숨김 처리돼도 목록에서 사라지지 않게) admin 전체 목록을 필터링한다.
  const allProducts = await listAllProductsForAdmin();
  const brandProducts = allProducts
    .filter((p) => p.brandId === id)
    .map((p) => ({ id: p.id, name: p.name }));

  // 고민 목록은 API 라우트가 없는 정적 콘텐츠(§4 예외) — 서버에서 직접 읽어 props 로 넘긴다.
  const concernOptions = concerns.map((c) => ({ slug: c.slug, title: c.title }));

  return (
    <BrandDetailEditor
      initialBrand={brand}
      brandProducts={brandProducts}
      concerns={concernOptions}
    />
  );
}
