import type { Product } from '@/types';

interface ProductPublicDetailsProps {
  readonly product: Pick<Product, 'auditPoints' | 'ingredients' | 'howToUse' | 'recommendedFor' | 'caution'>;
}

interface DetailTextRow {
  readonly title: string;
  readonly description: string;
}

interface DetailListRow {
  readonly title: string;
  readonly items: string[];
}

const nonBlank = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const cleanList = (items: string[] | undefined) =>
  items?.map((item) => item.trim()).filter((item) => item.length > 0) ?? [];

export default function ProductPublicDetails({ product }: ProductPublicDetailsProps) {
  const textRows: DetailTextRow[] = [
    { title: '성분/원재료', description: nonBlank(product.ingredients) ?? '' },
    { title: '급여/사용 방법', description: nonBlank(product.howToUse) ?? '' },
  ].filter((row) => row.description);
  const listRows: DetailListRow[] = [
    { title: '상품 검증 포인트', items: cleanList(product.auditPoints) },
    { title: '추천 대상', items: cleanList(product.recommendedFor) },
    { title: '주의사항', items: cleanList(product.caution) },
  ].filter((row) => row.items.length > 0);
  if (textRows.length === 0 && listRows.length === 0) return null;

  return (
    <section aria-labelledby="product-public-details-title" className="mt-8 rounded-3xl border border-[#E7E0D5] bg-white p-6">
      <p className="page-eyebrow">상품 상세 정보</p>
      <h2 id="product-public-details-title" className="mt-3 text-xl font-bold tracking-tight text-[#17211D]">
        꼼꼼히 확인하고 선택하세요.
      </h2>
      <dl className="mt-6 grid gap-5 text-sm text-[#17211D] sm:grid-cols-2">
        {textRows.map((row) => (
          <div key={row.title} className="rounded-2xl border border-[#EFE8DC] bg-[#FBFAF7] p-4">
            <dt className="text-xs font-semibold text-[#59615B]">{row.title}</dt>
            <dd className="mt-2 whitespace-pre-line break-keep leading-6">{row.description}</dd>
          </div>
        ))}
        {listRows.map((row) => (
          <div key={row.title} className="rounded-2xl border border-[#EFE8DC] bg-[#FBFAF7] p-4">
            <dt className="text-xs font-semibold text-[#59615B]">{row.title}</dt>
            <dd className="mt-2">
              <ul className="space-y-1.5">
                {row.items.map((item) => (
                  <li key={item} className="break-keep leading-6">
                    {item}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
