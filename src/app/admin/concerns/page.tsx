import AdminResourcePage from '@/components/admin/AdminResourcePage';
import { concerns } from '@/data/concerns';

export default function AdminConcernsPage() {
  return (
    <AdminResourcePage
      title="고민 관리"
      description="증상과 원인 정보, 추천 상품·브랜드, 보험 CTA와 FAQ를 연결합니다."
      actionLabel="고민 등록"
      searchPlaceholder="고민명 검색"
      filters={['전체 고민', '노출중', '숨김']}
      columns={[
        { key: 'icon', label: '아이콘' },
        { key: 'title', label: '고민명' },
        { key: 'symptoms', label: '증상' },
        { key: 'products', label: '추천 상품' },
        { key: 'brands', label: '추천 브랜드' },
        { key: 'faq', label: 'FAQ' },
        { key: 'status', label: '노출 상태' },
      ]}
      rows={concerns.map((concern, index) => ({
        id: concern.slug,
        icon: concern.icon,
        title: concern.title,
        symptoms: `${concern.symptoms.length}개`,
        products: `${concern.recommendedProductIds.length}개`,
        brands: `${concern.recommendedBrandIds.length}개`,
        faq: `${concern.faq.length}개`,
        status: `노출중 · ${index + 1}순위`,
      }))}
      readOnly
      createFields={['고민명', '아이콘', '짧은 설명', '원인 정보', '확인 증상', '추천 상품', '추천 브랜드', '보험 CTA', 'FAQ', '노출 순서']}
    />
  );
}
