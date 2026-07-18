import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Search, Home, PlusSquare, ChevronDown, MessageCircle } from 'lucide-react';
import { getConcernsConfigWithFallback } from '@/lib/concerns/repo';
import { MainConcernCard, SubConcernCard } from '@/components/common/ConcernCard';

export const metadata = {
  title: '케어 가이드',
  description: '우리 아이에게 보이는 변화를 따라 생활 속에서 살펴볼 신호와 관리 기준을 안내합니다.',
};

// DB를 읽는 서버 컴포넌트라 빌드타임 프리렌더 대신 요청 시 렌더한다(관리자 편집 즉시 반영).
export const dynamic = 'force-dynamic';

export default async function ConcernsPage() {
  const { items: concerns } = await getConcernsConfigWithFallback();
  const mainConcerns = concerns.slice(0, 8);
  const subConcerns = concerns.slice(8, 12);

  // 고민 핵심 6개(눈물·피부·관절·비만·스트레스·구강) 정리로 nutrition·grooming 이 삭제될 예정이라
  // 매거진 카드도 함께 교체한다(2026-07-18, 데이터 삭제는 이 PR 병합 후 별도 진행). 이미지는 새로
  // 마련하지 않고 기존 자산을 재사용했다 — 구강 카드는 아직 안 쓰인 일반 케어 사진으로, 체중 카드는
  // 원래 목욕 카드 사진(페이지 상단 히어로와 동일한 일반 반려묘 사진)을 그대로 유지했다. 사진 폴리싱은
  // dad 후속 작업.
  const infoCards = [
    { title: '강아지가 자꾸 긁어요. 피부 가려움의 원인과 관리법', category: '#피부', href: '/concerns/skin', image: '/images/hero-bg.jpg' },
    { title: '양치를 어려워하는 아이, 구강 관리 루틴 만들기', category: '#구강', href: '/concerns/oral', image: '/images/care_guide_hero.png' },
    { title: '산책, 얼마나 해야 적당할까? 활동량과 에너지 관리 가이드', category: '#운동', href: '/concerns/joint', image: '/images/hero-curation-visual-natural.png' },
    { title: '천천히, 건강하게 — 우리 아이 체중 관리의 기준', category: '#체중', href: '/concerns/obesity', image: '/images/care-guide-hero-cat.webp' },
    { title: '분리불안, 혼자 두는 연습이 필요할 때', category: '#행동', href: '/concerns/stress', image: '/images/brand-curation-hero.webp' },
  ];

  const faqs = [
    { q: '케어 가이드는 어떤 기준으로 작성되나요?', a: '백조오브제 케어 가이드는 수의학적 검토와 전문가의 자문을 거쳐, 실제 가정에서 반려동물을 돌볼 때 필요한 실용적이고 안전한 기준을 중심으로 작성됩니다.' },
    { q: '증상이 비슷한데, 여러 항목을 함께 보면 안 되나요?', a: '물론 가능합니다. 복합적인 증상이 보일 경우 관련된 모든 가이드를 참고하시어 종합적으로 아이의 상태를 살펴보시는 것을 권장합니다.' },
    { q: '집에서 관리해도 좋아지지 않으면 어떻게 해야 하나요?', a: '집에서의 관리는 예방과 초기 대처를 위한 것입니다. 증상이 지속되거나 악화될 경우, 즉시 가까운 동물병원을 방문하여 수의사의 정확한 진단을 받으시길 바랍니다.' },
  ];

  return (
    <main className="flex flex-col bg-[#F8F6F0] w-full">
      <div className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-12 pt-10 md:pt-[40px] pb-16 md:pb-[56px] lg:pb-[72px]">

        {/* 2. 케어 가이드 인트로 */}
        <section className="flex flex-col-reverse md:flex-row md:items-center justify-between gap-[48px] lg:gap-[64px] h-auto md:h-[320px] lg:h-[380px] mb-[42px] md:mb-[52px]">
          <div className="w-full md:w-[45%] lg:w-[40%] flex flex-col items-start justify-center">
            <span className="text-[11px] lg:text-[12px] font-bold tracking-[0.12em] text-[#B68B4E] mb-3 md:mb-4">
              CARE GUIDE
            </span>
            <h1 className="break-keep text-[30px] sm:text-[34px] lg:text-[44px] font-bold leading-[1.18] tracking-[-0.035em] text-[#17231E] max-w-[500px]">
              요즘, 우리 아이에게<br />
              어떤 변화가 보이나요?
            </h1>
            <p className="mt-5 md:mt-[20px] lg:mt-[24px] max-w-[480px] break-keep text-[15px] lg:text-[16px] leading-[1.7] text-[#72766F]">
              가장 마음에 걸리는 건강 고민부터 골라보세요.<br className="hidden sm:block" />
              함께 살피고, 신호와 생활 관리 기준을 정리했어요.
            </p>
            <div className="mt-8 md:mt-10">
              <span className="text-[12px] md:text-[13px] font-bold tracking-[0.1em] text-[#17231E]">
                INDEX
              </span>
              <div className="mt-1">
                <span className="text-[14px] md:text-[15px] font-bold tracking-widest text-[#B68B4E]">
                  {String(concerns.length).padStart(2, '0')} CARE
                </span>
              </div>
            </div>
          </div>
          <div className="w-full md:w-[55%] lg:w-[60%] h-[240px] md:h-full relative overflow-hidden rounded-xl md:rounded-[20px]">
            <Image
              src="/images/care-guide-hero-cat.webp"
              alt="반려묘 케어 가이드 인트로"
              fill
              className="object-cover object-[center_30%]"
              priority
            />
          </div>
        </section>

        {/* 3. 주요 고민 카드 8개 */}
        <section className="mb-[40px] md:mb-[52px]">
          <div className="flex md:grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 overflow-x-auto snap-x snap-mandatory hide-scrollbar pb-4">
            {mainConcerns.map((concern, index) => (
              <div key={concern.slug} className="w-[80vw] sm:w-[320px] md:w-auto shrink-0 snap-start">
                <MainConcernCard
                  concern={concern}
                  index={String(index + 1).padStart(2, '0')}
                />
              </div>
            ))}
          </div>
        </section>

        {/* 4. 추가 케어 카드 4개 */}
        <section className="mb-[48px] md:mb-[60px]">
          <div className="mb-4 md:mb-5">
            <h2 className="text-[18px] md:text-[20px] font-bold text-[#17231E] tracking-tight">추가로 살펴볼 생활 케어</h2>
            <p className="mt-1 text-[13px] md:text-[14px] text-[#72766F]">일상에서 함께 확인하면 좋은 관리 주제입니다.</p>
          </div>
          <div className="flex md:grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 overflow-x-auto snap-x snap-mandatory hide-scrollbar pb-4">
            {subConcerns.map((concern, index) => (
              <div key={concern.slug} className="w-[85vw] sm:w-[320px] md:w-auto shrink-0 snap-start">
                <SubConcernCard
                  concern={concern}
                  index={String(index + 9).padStart(2, '0')}
                />
              </div>
            ))}
          </div>
        </section>

        {/* 5. 핵심 정보 요약 바 */}
        <section className="mb-[56px] md:mb-[72px]">
          <div className="flex flex-col md:flex-row w-full bg-white rounded-[20px] border border-[#E4DDD1] overflow-hidden">
            <div className="flex-1 flex items-center gap-5 p-[22px] md:p-[28px] border-b md:border-b-0 md:border-r border-[#E4DDD1]">
              <div className="flex shrink-0 size-[42px] md:size-[46px] items-center justify-center rounded-full border border-[#D7CCBC]">
                <Search className="size-5 text-[#17231E]" strokeWidth={1.5} />
              </div>
              <div className="flex flex-col">
                <h3 className="text-[15px] md:text-[17px] font-bold text-[#17231E] mb-1">01 주요 원인 확인</h3>
                <p className="text-[13px] md:text-[14px] text-[#72766F] break-keep leading-[1.5]">식사·환경·생활 습관 등 주요 원인을 함께 살펴봅니다.</p>
              </div>
            </div>
            <div className="flex-1 flex items-center gap-5 p-[22px] md:p-[28px] border-b md:border-b-0 md:border-r border-[#E4DDD1]">
              <div className="flex shrink-0 size-[42px] md:size-[46px] items-center justify-center rounded-full border border-[#D7CCBC]">
                <Home className="size-5 text-[#17231E]" strokeWidth={1.5} />
              </div>
              <div className="flex flex-col">
                <h3 className="text-[15px] md:text-[17px] font-bold text-[#17231E] mb-1">02 집에서 관리하기</h3>
                <p className="text-[13px] md:text-[14px] text-[#72766F] break-keep leading-[1.5]">매일 실천할 수 있는 생활 관리 방법을 안내합니다.</p>
              </div>
            </div>
            <div className="flex-1 flex items-center gap-5 p-[22px] md:p-[28px]">
              <div className="flex shrink-0 size-[42px] md:size-[46px] items-center justify-center rounded-full border border-[#D7CCBC]">
                <PlusSquare className="size-5 text-[#17231E]" strokeWidth={1.5} />
              </div>
              <div className="flex flex-col">
                <h3 className="text-[15px] md:text-[17px] font-bold text-[#17231E] mb-1">03 병원 방문 기준</h3>
                <p className="text-[13px] md:text-[14px] text-[#72766F] break-keep leading-[1.5]">진료가 필요한 신호와 병원 방문 기준을 정리했습니다.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. 함께 알아두면 좋은 정보 */}
        <section className="mb-12 rounded-[20px] bg-[#F2EEE5] p-6 md:mb-16 md:p-8">
          <div className="mb-6 flex items-end justify-between md:mb-8">
            <div>
              <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-[#A8742E]">CARE EDIT</span>
              <h2 className="text-[20px] font-bold tracking-tight text-[#17231E] md:text-[24px]">함께 알아두면 좋은 정보</h2>
            </div>
            <Link href="/concerns" className="hidden min-h-10 items-center gap-1.5 rounded-full border border-[#E4DDD1] bg-white px-4 text-[13px] font-bold text-[#17231E] transition-colors hover:bg-[#F8F6F0] sm:flex">
              모든 케어 가이드 보기 <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {infoCards.map((info, idx) => (
              <Link
                key={info.href}
                href={info.href}
                aria-label={`${info.title} 케어 가이드 보기`}
                className="group flex h-full min-w-0 flex-col overflow-hidden rounded-[18px] border border-[#E4DDD1] bg-white transition-all duration-700 ease-out hover:-translate-y-1 hover:border-[#D8C4A3] hover:shadow-[0_20px_40px_-15px_rgba(23,33,29,0.08)]"
              >
                <div className="relative aspect-square w-full overflow-hidden bg-[#F8F6F0]">
                  <Image
                    src={info.image}
                    alt=""
                    fill
                    sizes="(max-width: 639px) 40vw, (max-width: 1023px) 30vw, 220px"
                    className="object-cover transition-transform duration-[1500ms] ease-out group-hover:scale-105"
                  />
                  <span className="absolute left-3 top-3 rounded-full border border-white/70 bg-white/90 px-2.5 py-1 text-[10px] font-bold text-[#6F766F] backdrop-blur-sm md:left-4 md:top-4 md:px-3 md:py-1.5 md:text-[11px]">
                    {info.category}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-4 md:p-5">
                  <span className="font-editorial text-[11px] italic tracking-wide text-[#A8742E] md:text-[12px]">Care note {String(idx + 1).padStart(2, '0')}</span>
                  <h3 className="mt-2 break-keep text-[14px] font-bold leading-[1.55] text-[#17231E] md:mt-3 md:text-[16px]">{info.title}</h3>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-[12px] font-bold text-[#17231E] md:text-[13px]">
                    케어 가이드 보기
                    <ArrowRight className="size-3.5 shrink-0 text-[#A8742E] transition-transform duration-500 group-hover:translate-x-1 md:size-4" aria-hidden="true" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-4 flex sm:hidden">
            <Link href="/concerns" className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full border border-[#E4DDD1] bg-white px-5 text-[13px] font-bold text-[#17231E]">
              모든 케어 가이드 보기 <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </section>

        {/* 7. 펫보험 분석 배너 */}
        <section className="mb-[48px] md:mb-[64px]">
          <div className="flex flex-col md:flex-row bg-[#16382D] rounded-[20px] md:rounded-[24px] overflow-hidden h-auto md:h-[220px] lg:h-[260px]">
            <div className="flex flex-col justify-center w-full md:w-[55%] p-[32px] md:p-[42px]">
              <span className="text-[12px] font-medium text-[#B68B4E] mb-2 md:mb-3">사랑하는 아이를 위한 든든한 준비</span>
              <h2 className="text-[22px] md:text-[26px] lg:text-[28px] font-bold text-white mb-3 md:mb-4 break-keep leading-[1.3]">
                가입한 보험, 이 고민도 보장될까요?
              </h2>
              <p className="text-[14px] md:text-[15px] text-[#D7CCBC] leading-[1.6] break-keep">
                질병·사고 보장 범위부터 보장한도, 면책기간까지<br className="hidden sm:block" />
                반려동물 보험을 한눈에 비교해 보세요.
              </p>
            </div>
            <div className="flex items-center justify-start md:justify-center w-full md:w-[20%] px-[32px] pb-[32px] md:p-0">
              <Link href="/insurance/recommend" className="inline-flex items-center justify-center px-6 py-3.5 bg-white text-[#16382D] text-[14px] font-bold rounded-[12px] hover:bg-[#F8F6F0] transition-colors whitespace-nowrap">
                보험 보장 범위 분석하기 <ArrowRight className="ml-2 size-4" />
              </Link>
            </div>
            <div className="w-full md:w-[25%] h-[200px] md:h-full relative mt-auto md:mt-0">
              <Image
                src="/images/insurance-dog.webp"
                alt="펫보험 분석"
                fill
                className="object-cover object-[center_30%] md:object-center"
              />
            </div>
          </div>
        </section>

        {/* 8. FAQ */}
        <section>
          <div className="flex flex-col md:flex-row bg-white border border-[#E4DDD1] rounded-[20px] overflow-hidden">
            <div className="w-full md:w-[70%] p-[28px] md:p-[34px] border-b md:border-b-0 md:border-r border-[#E4DDD1]">
              <h2 className="text-[18px] md:text-[20px] font-bold text-[#17231E] mb-5 md:mb-6">많이 궁금해하시는 점</h2>
              <div className="flex flex-col gap-2 md:gap-2.5">
                {faqs.map((faq, idx) => (
                  <details key={idx} className="group border border-[#E4DDD1] rounded-[12px] md:rounded-[14px] bg-[#F8F6F0] overflow-hidden">
                    <summary className="flex items-center justify-between p-4 md:p-5 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                      <div className="flex items-center gap-3">
                        <span className="flex shrink-0 size-6 items-center justify-center text-[13px] font-bold text-[#B68B4E] bg-white rounded-md border border-[#E4DDD1]">Q</span>
                        <h4 className="text-[14px] md:text-[15px] font-bold text-[#17231E] break-keep pr-4">{faq.q}</h4>
                      </div>
                      <ChevronDown className="shrink-0 size-5 text-[#72766F] transition-transform duration-300 group-open:rotate-180" />
                    </summary>
                    <div className="px-4 md:px-5 pb-4 md:pb-5 pt-1">
                      <p className="text-[13px] md:text-[14px] text-[#72766F] leading-[1.6] break-keep">{faq.a}</p>
                    </div>
                  </details>
                ))}
              </div>
            </div>
            <div className="w-full md:w-[30%] flex flex-col items-center justify-center p-[28px] md:p-[34px] bg-[#F8F6F0]">
              <div className="mb-4">
                <MessageCircle className="size-12 md:size-14 text-[#D7CCBC]" strokeWidth={1} />
              </div>
              <p className="text-[14px] text-[#72766F] mb-1">더 궁금한 점이 있으신가요?</p>
              <Link href="/qna" className="inline-flex items-center text-[15px] md:text-[16px] font-bold text-[#17231E] hover:text-[#B68B4E] transition-colors">
                1:1 문의하기 <ArrowRight className="ml-1 size-4" />
              </Link>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
