import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { getConcernsConfigWithFallback } from '@/lib/concerns/repo';
import { MainConcernCard, SubConcernCard } from '@/components/common/ConcernCard';
import { FEATURES } from '@/config/features';

export const metadata = {
  title: '케어 가이드',
  description: '우리 아이에게 보이는 변화를 따라 생활 속에서 살펴볼 신호와 관리 기준을 안내합니다.',
};

// DB를 읽는 서버 컴포넌트라 빌드타임 프리렌더 대신 요청 시 렌더한다(관리자 편집 즉시 반영).
export const dynamic = 'force-dynamic';

export default async function ConcernsPage() {
  const { items: concerns } = await getConcernsConfigWithFallback();
  const mainConcerns = concerns.slice(0, 6);
  const subConcerns = concerns.slice(6, 12);

  const faqs = [
    { q: '이 정보는 어떻게 활용하면 되나요?', a: '평소 우리 아이의 모습과 비교해 몸이나 행동에 달라진 점이 있는지 살펴보는 데 참고해 주세요. 작은 변화도 평소와 비교해 알아차리는 것이 중요합니다.' },
    { q: '여러 고민이 함께 보이면 어떻게 살펴봐야 하나요?', a: '하나의 변화가 여러 원인과 관련될 수 있고, 여러 변화가 함께 나타나기도 합니다. 한 가지 증상만 따로 보기보다 우리 아이에게 함께 나타나는 변화를 살펴보세요.' },
    { q: '언제 진료가 필요한가요?', a: '각 상세의 병원 진료를 고려해야 할 신호를 참고해 주세요. 해당하지 않더라도 평소와 다른 변화가 걱정되거나 판단하기 어렵다면 수의사에게 확인해보는 것이 좋습니다.' },
    { q: '이 정보만으로 건강 상태를 판단해도 되나요?', a: '이 내용은 보호자가 일상에서 변화를 알아차리는 데 도움을 주기 위한 참고 정보입니다. 같은 변화도 원인이 다를 수 있으므로 특정 질환을 판단하거나 진단하는 기준으로 사용하지 않습니다.' },
  ];

  return (
    <main className="flex flex-col bg-[#F8F6F0] w-full">
      {/* 2. 케어 가이드 인트로 — 홈과 같은 전체 배경형 히어로 */}
      <section className="relative h-[640px] w-full overflow-hidden bg-[#EDE5D8] sm:h-[620px] md:h-[480px] lg:h-[520px] xl:h-[560px]">
        <Image
          src="/images/care-guide-hero-pet-family.png"
          alt="보호자와 함께 생활하는 강아지와 고양이"
          fill
          sizes="100vw"
          quality={90}
          priority
          className="object-cover object-[52%_center] md:object-center"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(248,246,240,0.92)_0%,rgba(248,246,240,0.74)_38%,rgba(248,246,240,0.18)_70%,rgba(248,246,240,0)_100%)] md:bg-[linear-gradient(90deg,rgba(248,246,240,0.94)_0%,rgba(248,246,240,0.78)_31%,rgba(248,246,240,0.28)_55%,rgba(248,246,240,0)_76%)]"
        />

        <div className="relative z-10 mx-auto flex h-full w-full max-w-[1280px] items-start px-5 pb-8 pt-20 md:items-center md:px-8 md:py-10 lg:px-12 xl:px-14">
          <div className="flex w-full max-w-[540px] flex-col items-start md:w-[52%] md:min-w-[440px]">
            <span className="mb-3 text-[11px] font-bold tracking-[0.12em] text-[#7A4E1D] md:mb-4 lg:text-[12px]">
              CARE GUIDE
            </span>
            <h1 className="max-w-[520px] break-keep text-[30px] font-bold leading-[1.2] tracking-[-0.035em] text-[#17231E] md:text-[34px] lg:text-[44px] lg:leading-[1.18]">
              요즘, 우리 아이에게<br />
              어떤 변화가 보이나요?
            </h1>
            <p className="mt-4 max-w-[480px] break-keep text-[14px] leading-[1.7] text-[#59615B] md:mt-5 md:text-[15px] lg:mt-6 lg:text-[16px]">
              우리 아이가 보내는 작은 신호부터 살펴보세요.<br />
              일상에서 알아두면 좋은 케어 기준을 정리했습니다.
            </p>
            {/* 클라이언트 요청(2026-07-24) — 'NN CARE' 인덱스는 작게 표기 */}
            <div className="mt-7 md:mt-9">
              <span className="text-[10px] font-semibold tracking-[0.1em] text-[#59615B] md:text-[11px]">
                INDEX
              </span>
              <div className="mt-0.5">
                <span className="text-[12px] font-semibold tracking-widest text-[#7A4E1D] md:text-[13px]">
                  {String(mainConcerns.length).padStart(2, '0')} CARE
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1280px] px-5 pb-16 pt-[42px] md:px-7 md:pb-[56px] md:pt-[52px] lg:px-10 lg:pb-[72px] xl:px-12">

        {/* 3. 주요 고민 카드 6개 */}
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

        {/* 7. 펫보험 분석 배너 */}
        {FEATURES.insurance && (
        <section className="mb-[48px] md:mb-[64px]">
          <div className="flex flex-col md:flex-row bg-[#16382D] rounded-[20px] md:rounded-[24px] overflow-hidden h-auto md:h-[220px] lg:h-[260px]">
            <div className="flex flex-col justify-center w-full md:w-[55%] p-[32px] md:p-[42px]">
              <h2 className="text-[22px] md:text-[26px] lg:text-[28px] font-bold text-white mb-3 md:mb-4 break-keep leading-[1.3]">
                우리 아이에게 필요한 보장은 무엇일까요?
              </h2>
              <p className="text-[14px] md:text-[15px] text-[#D7CCBC] leading-[1.6] break-keep">
                나이와 건강 상태를 바탕으로 우리 아이에게 맞는 보험을 살펴보세요.
              </p>
            </div>
            <div className="flex items-center justify-start md:justify-center w-full md:w-[20%] px-[32px] pb-[32px] md:p-0">
              <Link href="/insurance" className="inline-flex items-center justify-center px-6 py-3.5 bg-white text-[#16382D] text-[14px] font-bold rounded-[12px] hover:bg-[#F8F6F0] transition-colors whitespace-nowrap">
                보험 분석하기 <ArrowRight className="ml-2 size-4" />
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
        )}

        {/* 7. 추가로 살펴볼 생활 케어 — 클라이언트 요청(2026-07-24)으로 페이지 하단 안내 영역으로 이동.
            9번째 이후 고민이 없으면(빈 배열) 제목만 남지 않도록 섹션 자체를 숨긴다. */}
        {subConcerns.length > 0 && (
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
                  index={String(index + 7).padStart(2, '0')}
                />
              </div>
            ))}
          </div>
        </section>
        )}

        {/* 8. FAQ */}
        <section>
          <div className="overflow-hidden rounded-[20px] border border-[#E4DDD1] bg-white">
            <div className="w-full p-[28px] md:p-[34px]">
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
          </div>
        </section>

      </div>
    </main>
  );
}
