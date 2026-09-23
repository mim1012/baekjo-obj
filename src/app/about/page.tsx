import type { Metadata } from 'next';
import Image from 'next/image';
import { getPublishedPageContent } from '@/lib/cms/content';
import { getCmsPageDefinition } from '@/lib/cms/pageDefinitions';
import { normalizeCmsPageContent } from '@/lib/cms/normalize';
import { resolveCmsImageProps } from '@/lib/cms/imageSrc';
import { logServerError } from '@/lib/logServerError';

export const metadata: Metadata = {
  title: '회사소개',
  description: '백조오브제라는 이름에는 우리가 이 공간을 대하는 태도가 담겨 있습니다.',
  alternates: { canonical: '/about' },
};

type AboutSectionItem = {
  readonly id: string;
  readonly lead: string;
  readonly body: string;
  readonly visible: boolean;
};

type AboutContent = Record<string, unknown> & {
  readonly hero: {
    readonly visible: boolean;
    readonly eyebrow: string;
    readonly title: string;
    readonly intro: string;
    readonly image: string;
    readonly imageAlt: string;
  };
  readonly sections: {
    readonly visible: boolean;
    readonly items: readonly AboutSectionItem[];
  };
};

// CMS 게시본이 없거나 조회에 실패했을 때의 폴백 — 정의된 defaultContent(현재 /about 원문 그대로)를
// 그대로 쓴다. normalize를 거쳐 audit 등 다른 페이지와 동일한 계약(선언된 필드 default-fill)을 보장한다.
function getFallbackContent(): AboutContent {
  const definition = getCmsPageDefinition('about');
  if (!definition) throw new Error('cms-about-definition-missing');
  return normalizeCmsPageContent(definition, definition.defaultContent) as AboutContent;
}

export default async function AboutPage() {
  const published = await getPublishedPageContent<AboutContent>('about').catch((error: unknown) => {
    logServerError('[About] CMS 조회 실패', error);
    return null;
  });
  const managed = published !== null;
  const content = published ?? getFallbackContent();
  const heroImage = resolveCmsImageProps(content.hero.image);
  const visibleSections = content.sections.visible
    ? content.sections.items.filter((item) => item.visible)
    : [];

  return (
    <article
      data-about-content={managed ? 'cms' : 'default'}
      data-cms-managed={managed ? 'about' : undefined}
      className="bg-[#F7F4ED] pb-16 md:pb-24"
    >
      {content.hero.visible && (
        <header className="relative w-full overflow-hidden bg-[#F9F6EF] md:h-[480px] lg:h-[520px] xl:h-[560px]">
          <div aria-hidden="true" className="absolute inset-0 z-[1] hidden bg-[linear-gradient(90deg,rgba(249,246,239,0.55)_0%,rgba(249,246,239,0.2)_42%,rgba(249,246,239,0)_65%)] md:block" />
          <div className="brand-page-container relative z-[2] flex h-full items-start py-10 md:items-center md:py-12">
            <div className="min-w-0 max-w-[540px] md:w-[52%]">
              <h1 className="text-[#17231E]">
                {content.hero.eyebrow && (
                  <span className="mb-5 block text-[11px] font-semibold tracking-[0.28em] text-[#7A4E1D] md:mb-7 md:text-xs">{content.hero.eyebrow}</span>
                )}{' '}
                {content.hero.title && (
                  <span className="font-editorial block text-[clamp(2rem,5vw,4.25rem)] leading-[1.15] tracking-[-0.04em]">{content.hero.title}</span>
                )}
              </h1>
              <div aria-hidden="true" className="mb-6 mt-7 h-px w-12 bg-[#B48A4A] md:mb-8 md:mt-9" />
              {content.hero.intro && (
                <p data-about-paragraph className="max-w-[390px] break-keep text-[15px] leading-[1.9] text-[#59615B] md:text-[17px]">
                  {content.hero.intro}
                </p>
              )}
            </div>
          </div>
          {heroImage && (
            <div className="relative aspect-[3/2] w-full md:absolute md:inset-0 md:aspect-auto">
              <Image
                src={heroImage.src}
                unoptimized={heroImage.unoptimized}
                alt={content.hero.imageAlt}
                fill
                preload
                sizes="100vw"
                className="object-contain md:object-cover md:object-[center_68%]"
              />
            </div>
          )}
        </header>
      )}

      {visibleSections.length > 0 && (
        <div className="brand-page-container relative z-[3] mt-6 md:-mt-12">
          <div className="overflow-hidden rounded-[20px] border border-[#E4DDD1] bg-[#FFFEFB] shadow-[0_12px_48px_-24px_rgba(23,37,31,0.14)]">
            {visibleSections.map((section, sectionIndex) => {
              const bodyParagraphs = section.body.split('\n').filter((paragraph) => paragraph.trim().length > 0);
              return (
                <section
                  key={section.id}
                  // lead가 비면 그 id를 가진 heading이 렌더되지 않으므로 참조를 걸지 않는다.
                  aria-labelledby={section.lead ? section.id + '-heading' : undefined}
                  className={sectionIndex === visibleSections.length - 1 ? 'bg-white' : ''}
                >
                  <div className={'mx-6 grid gap-5 py-9 sm:mx-8 md:mx-12 md:grid-cols-[72px_minmax(0,1fr)] md:gap-8 md:py-14 lg:mx-16 lg:grid-cols-[120px_minmax(0,1fr)] lg:gap-12 lg:py-16' + (sectionIndex > 0 ? ' border-t border-[#E4DDD1]' : '')}>
                    <div aria-hidden="true" className="flex items-center gap-4 md:items-start md:pt-1">
                      <span className="font-editorial text-[28px] leading-none text-[#9A763F] md:text-[40px]">{String(sectionIndex + 1).padStart(2, '0')}</span>
                      <span className="h-px w-8 bg-[#D8C9B4] md:hidden" />
                    </div>
                    <div className="min-w-0 max-w-[720px] break-keep">
                      {section.lead && (
                        <h2 id={section.id + '-heading'} data-about-paragraph className="text-[18px] font-medium leading-[1.75] tracking-[-0.025em] text-[#17251F] md:text-[22px]">
                          {section.lead}
                        </h2>
                      )}
                      {bodyParagraphs.length > 0 && (
                        <div className="mt-6 space-y-6 text-[15px] leading-[1.95] text-[#59615B] md:mt-7 md:space-y-7 md:text-[16px]">
                          {bodyParagraphs.map((paragraph, paragraphIndex) => (
                            <p key={`${section.id}-${paragraphIndex}`} data-about-paragraph>
                              {paragraph}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}
    </article>
  );
}
