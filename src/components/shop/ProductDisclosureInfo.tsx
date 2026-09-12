import type { Product } from '@/types';
import { disclosureDefinition } from '@/lib/products/disclosures';

export default function ProductDisclosureInfo({ product }: { product: Pick<Product, 'disclosure'> }) {
  const definition = disclosureDefinition(product.disclosure?.categoryCode);
  if (!definition || !product.disclosure) return null;

  return (
    <section aria-labelledby="product-disclosure-title" className="mt-8 rounded-3xl border border-[#E7E0D5] bg-white p-6">
      <p className="text-[11px] font-bold tracking-[0.14em] text-[#A8742E]">상품정보제공고시</p>
      <h2 id="product-disclosure-title" className="mt-2 text-base font-bold text-[#17211D]">{definition.label} 필수정보</h2>
      <dl className="mt-5 divide-y divide-[#EEE9E0] border-y border-[#EEE9E0] text-sm">
        {definition.fields.map((field) => (
          <div key={field.key} className="grid gap-1 py-3 sm:grid-cols-[180px_1fr] sm:gap-5">
            <dt className="font-semibold text-[#59615B]">{field.label}</dt>
            <dd className="whitespace-pre-line break-words leading-6 text-[#17211D]">{product.disclosure!.values[field.key]}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
