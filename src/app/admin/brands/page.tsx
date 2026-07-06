import AdminResourcePage from '@/components/admin/AdminResourcePage';
import { brands } from '@/data/brands';

export default function AdminBrandsPage() {
  return (
    <AdminResourcePage
      title="브랜드 관리"
      description="입점 브랜드의 철학, 검증 등급, 대표 상품과 노출 순서를 관리합니다."
      actionLabel="브랜드 등록"
      searchPlaceholder="브랜드명 검색"
      filters={['전체 등급', '추천 브랜드', '신규 브랜드', '숨김']}
      columns={[
        { key: 'name', label: '브랜드명' },
        { key: 'grade', label: '검증 등급' },
        { key: 'products', label: '대표 상품' },
        { key: 'concerns', label: '관련 고민' },
        { key: 'recommended', label: '추천' },
        { key: 'status', label: '노출 상태' },
      ]}
      rows={brands.map((brand) => ({
        id: brand.id,
        name: brand.name,
        grade: brand.auditGrade,
        products: `${brand.representativeProductIds.length}개`,
        concerns: brand.relatedConcernSlugs.join(', '),
        recommended: brand.isRecommended ? '추천' : '-',
        status: brand.isVisible === false ? '숨김' : '노출중',
      }))}
      createFields={['브랜드명', '브랜드 로고', '대표 이미지', '브랜드 소개', '브랜드 철학', '검증 포인트', '검증 등급', '대표 상품', '추천 브랜드', '노출 순서']}
    />
  );
}
