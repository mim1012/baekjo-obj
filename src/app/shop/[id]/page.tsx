import Image from 'next/image';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  getCachedPublicBrandById,
  getCachedPublicProductById,
  listCachedPublicProducts,
} from '@/lib/public-read-cache';
import ProductCard from '@/components/common/ProductCard';
import ProductDetailClient from '@/components/shop/ProductDetailClient';
import ProductPurchaseInfo from '@/components/shop/ProductPurchaseInfo';
import ProductTabsClient from '@/components/shop/ProductTabsClient';
import { getConcernsConfigWithFallback } from '@/lib/concerns/repo';

// DB를 읽는 서버 컴포넌트라 빌드타임 프리렌더 대신 요청 시 렌더한다(관리자 편집 즉시 반영).
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const product = await getCachedPublicProductById(id);
  if (!product) return { title: '상품을 찾을 수 없습니다', robots: { index: false, follow: false } };

  const description = product.summary || product.description;
  return {
    title: product.name,
    description,
    alternates: { canonical: `/shop/${product.id}` },
    openGraph: {
      type: 'website',
      url: `/shop/${product.id}`,
      title: product.name,
      description,
      images: product.image ? [{ url: product.image, alt: product.name }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description,
      images: product.image ? [product.image] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getCachedPublicProductById(id);
  if (!product) notFound();

  const [brand, allProducts, concernsConfig] = await Promise.all([
    getCachedPublicBrandById(product.brandId),
    listCachedPublicProducts(),
    getConcernsConfigWithFallback(),
  ]);
  const concernTitleBySlug = new Map(concernsConfig.items.map((concern) => [concern.slug, concern.title]));
  const relatedConcernLabels = product.concernTags
    .map((slug) => concernTitleBySlug.get(slug))
    .filter((label): label is string => Boolean(label));
  const relatedProducts = allProducts
    .filter((candidate) => candidate.id !== product.id && (
      candidate.category === product.category
      || candidate.concernTags.some((tag) => product.concernTags.includes(tag))
    ))
    .slice(0, 4);

  return (
    <div className="page-canvas pb-16">
      <div className="site-container-wide py-8 lg:py-12">
        <ProductDetailClient
          product={{ ...product, brandName: brand?.name ?? product.brandName }}
          brandShipping={brand?.shipping}
          relatedConcernLabels={relatedConcernLabels}
        />

        <ProductTabsClient product={{ ...product, brandName: brand?.name ?? product.brandName }}>
          <section id="story" className="scroll-mt-36">
            <div className="mx-auto max-w-3xl">
              <p className="page-eyebrow">상품 이야기</p>
              <h2 className="section-title mt-3">일상에서 이렇게 만나보세요.</h2>
              <p className="body-copy mt-5">{product.description}</p>
              {product.detailBlocks && product.detailBlocks.length > 0 ? (
                <div className="mt-8 overflow-hidden rounded-3xl">
                  {product.detailBlocks.map((block, index) =>
                    block.type === 'image' ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={`${block.type}-${index}`}
                        src={block.src}
                        alt={block.alt ?? product.name}
                        className="w-full block"
                        loading="lazy"
                      />
                    ) : (
                      <p
                        key={`${block.type}-${index}`}
                        className="whitespace-pre-line text-sm leading-7 text-[#334155] my-8"
                      >
                        {block.content}
                      </p>
                    ),
                  )}
                </div>
              ) : (
                <div className="relative mt-8 aspect-[4/5] overflow-hidden rounded-3xl bg-[#F3EEE6] sm:aspect-[4/3]">
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 768px"
                      className="object-contain p-8 sm:p-12"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-[#6F766F]">상세 이미지를 준비하고 있어요.</div>
                  )}
                </div>
              )}
            </div>
          </section>

          <ProductPurchaseInfo brandShipping={brand?.shipping} />
        </ProductTabsClient>

        <div className="mt-20 lg:mt-28">
          {relatedProducts.length > 0 && (
            <section>
              <div className="mb-6 md:mb-8">
                <p className="page-eyebrow">함께 둘러보기</p>
                <h2 className="mt-2 text-xl md:text-2xl font-bold tracking-tight text-[#17211D]">이런 상품도 함께 살펴보세요.</h2>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-6">
                {relatedProducts.map((item) => (
                  <ProductCard key={item.id} product={item} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
