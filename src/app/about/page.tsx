import type { Metadata } from 'next';
import Image from 'next/image';

export const metadata: Metadata = {
  title: '회사소개',
  description: '백조오브제라는 이름에는 우리가 이 공간을 대하는 태도가 담겨 있습니다.',
  alternates: { canonical: '/about' },
};

// 제공받은 원문: 띄어쓰기와 문장부호를 포함해 그대로 보존한다.
const originalText = `백조오브제라는 이름에는 우리가 이 공간을 대하는 태도가 담겨 있습니다.
백조는 저의 반려묘 이름입니다.이 이름은 한 아이의 이야기를 사업으로 만들기 위해 붙인 것이 아닙니다.
시작하는 힘만큼, 시작한 것을 끝까지 책임지는 힘이 중요하다고 생각했습니다. 그래서 이 일을 오래 이어가기 위해 제가 결코 잊을 수 없는 이름을 빌렸습니다.
백조라는 이름은 이 사업의 주인공이라기보다, 시작한 일을 끝까지 책임지겠다는 약속에 가깝습니다.
그리고 그 뒤에 ‘오브제’를 붙였습니다.
제가 생각하는 오브제는 단순히 아름다운 물건을 의미하지 않습니다. 하나의 생명도, 누군가에게 깊은 의미를 가진 물건도, 자신의 철학을 지키며 만들어온 브랜드와 제품도 저마다의 시간과 이야기를 가지고 있습니다.
백조오브제는 그런 것들을 쉽게 소비하고 지나가는 대상으로 바라보고 싶지 않았습니다. 가치 있는 것은 그 가치를 잃지 않은 채 존중받아야 한다고 생각합니다.
좋은 브랜드가 마케팅 경쟁에서 밀려 사라지지 않기를 바랍니다. 좋은 제품이 가격만으로 평가되지 않기를 바랍니다.
반려동물과 함께하는 시간이 길지 않다는 사실도 외면하지 않습니다. 함께 살아가는 순간뿐 아니라 언젠가 찾아오는 이별의 순간에도, 누군가의 마음 곁에 머물 수 있는 방법을 고민합니다.
그래서 백조오브제에는 셀렉션만 있는 것이 아닙니다.
브랜드의 철학과 제품을 살펴보고 기록하는 Audit,,예상하지 못한 의료비에 대비할 수 있도록 연결하는 보험,브랜드와 기관이 새로운 기회를 만들 수 있는 B2B와 파트너십,그리고 언젠가는 더 깊게 이어가고 싶은 위로와 기억의 영역까지.
처음부터 각각의 사업을 만들고 한곳에 모은 것은 아닙니다. 하나의 생각을 따라가다 보니 지금의 백조오브제가 되었습니다.
좋은 브랜드가 자신의 가치를 지키며 오래 살아남을 수 있고,보호자는 좋은 선택을 위해 불필요한 부담을 떠안지 않고,제품과 철학의 가치가 제대로 전해질 수 있는 곳.
백조오브제는 그런 구조를 만들고자 합니다.
우리가 선택한 브랜드의 가치를 제대로 소개하고, 실제 판매와 협업으로 이어질 수 있는 구조를 지향합니다. 하나의 판매 방식만으로 가능성을 제한하지 않고 다양한 협업의 길도 함께 만들어갑니다.
경쟁을 만들어내는 플랫폼보다, 각자의 가치가 오래 남을 수 있는 구조를 만들고 싶습니다.
백조의 이름에서 시작한 책임 역시 한 생명의 시간에 머무르지 않습니다.
언젠가 백조와의 시간이 끝난 뒤에도 이 이름이 의미를 잃지 않도록.또 다른 수많은 생명과 보호자, 그리고 자신의 철학을 지키는 좋은 브랜드들이 이 공간 안에서 존중받을 수 있도록.
백조오브제는 하나의 플랫폼을 만드는 데서 멈추지 않습니다.
반려생활과 펫산업이 무엇을 중요하게 바라봐야 하는지,그 기준이 되는 곳을 만들어가고자 합니다.`;

const paragraphs = originalText.split('\n');

// 문단 순서와 내용은 유지하고, 원문의 흐름에 따라 읽기 영역만 나눈다.
const sections = [
  { id: 'name', start: 1, end: 4 },
  { id: 'objet', start: 4, end: 9 },
  { id: 'connections', start: 9, end: 12 },
  { id: 'purpose', start: 12, end: 16 },
  { id: 'promise', start: 16, end: 20 },
];

export default function AboutPage() {
  return (
    <article className="bg-[#F7F4ED] pb-16 md:pb-24">
      <header className="relative w-full overflow-hidden bg-[#F9F6EF] md:h-[480px] lg:h-[520px] xl:h-[560px]">
        <div aria-hidden="true" className="absolute inset-0 z-[1] hidden bg-[linear-gradient(90deg,rgba(249,246,239,0.55)_0%,rgba(249,246,239,0.2)_42%,rgba(249,246,239,0)_65%)] md:block" />
        <div className="brand-page-container relative z-[2] flex h-full items-start py-10 md:items-center md:py-12">
          <div className="min-w-0 max-w-[540px] md:w-[52%]">
            <h1 className="text-[#17231E]">
              <span className="mb-5 block text-[11px] font-semibold tracking-[0.28em] text-[#7A4E1D] md:mb-7 md:text-xs">ABOUT</span>{' '}
              <span className="font-editorial block text-[clamp(2rem,5vw,4.25rem)] leading-[1.15] tracking-[-0.04em]">BAEKJO OBJET</span>
            </h1>
            <div aria-hidden="true" className="mb-6 mt-7 h-px w-12 bg-[#B48A4A] md:mb-8 md:mt-9" />
            <p data-about-paragraph className="max-w-[390px] break-keep text-[15px] leading-[1.9] text-[#59615B] md:text-[17px]">
              {paragraphs[0]}
            </p>
          </div>
        </div>
        <div className="relative aspect-[3/2] w-full md:absolute md:inset-0 md:aspect-auto">
        <Image
          src="/images/about-hero-botanical-v1.webp"
          alt="꽃과 나비가 있는 정원에서 평화롭게 잠든 고양이 수채화"
          fill
          preload
          sizes="100vw"
          className="object-contain md:object-cover md:object-[center_68%]"
        />
        </div>
      </header>

      <div className="brand-page-container relative z-[3] mt-6 md:-mt-12">
        <div className="overflow-hidden rounded-[20px] border border-[#E4DDD1] bg-[#FFFEFB] shadow-[0_12px_48px_-24px_rgba(23,37,31,0.14)]">
          {sections.map((section, sectionIndex) => (
            <section
              key={section.id}
              aria-labelledby={section.id + '-heading'}
              className={sectionIndex === sections.length - 1 ? 'bg-white' : ''}
            >
              <div className={'mx-6 grid gap-5 py-9 sm:mx-8 md:mx-12 md:grid-cols-[72px_minmax(0,1fr)] md:gap-8 md:py-14 lg:mx-16 lg:grid-cols-[120px_minmax(0,1fr)] lg:gap-12 lg:py-16' + (sectionIndex > 0 ? ' border-t border-[#E4DDD1]' : '')}>
                <div aria-hidden="true" className="flex items-center gap-4 md:items-start md:pt-1">
                  <span className="font-editorial text-[28px] leading-none text-[#9A763F] md:text-[40px]">{String(sectionIndex + 1).padStart(2, '0')}</span>
                  <span className="h-px w-8 bg-[#D8C9B4] md:hidden" />
                </div>
                <div className="min-w-0 max-w-[720px] break-keep">
                  <h2 id={section.id + '-heading'} data-about-paragraph className="text-[18px] font-medium leading-[1.75] tracking-[-0.025em] text-[#17251F] md:text-[22px]">
                    {paragraphs[section.start]}
                  </h2>
                  <div className="mt-6 space-y-6 text-[15px] leading-[1.95] text-[#59615B] md:mt-7 md:space-y-7 md:text-[16px]">
                    {paragraphs.slice(section.start + 1, section.end).map((paragraph) => (
                      <p
                        key={paragraph}
                        data-about-paragraph
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>
    </article>
  );
}
